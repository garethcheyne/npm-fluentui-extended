import { FluentProvider } from '@fluentui/react-components';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ParentPortalProps, UseParentPortalMountOptions } from './ParentPortal.types';

const DEFAULT_CONTAINER_ID = 'fluentui-extended-parent-portal-root';

const DEFAULT_CONTAINER_STYLES = (id: string) => `
#${id} {
  position: fixed;
  inset: 0;
  z-index: 100000;
  pointer-events: none;
}
#${id} * {
  pointer-events: auto;
}
#${id} > .fui-FluentProvider {
  position: fixed;
  inset: 0;
  background-color: transparent !important;
  display: flex;
  align-items: center;
  justify-content: center;
}
`;

function getParentDocument(): Document | null {
  try {
    if (!window.parent || window.parent === window) return null;
    return window.parent.document;
  } catch {
    return null;
  }
}

/** Portals sharing a container by id, so the last one out can take it down. */
const USERS_ATTR = 'data-fue-portal-users';
/** Set on a container this module created - one the host page supplied is never removed. */
const CREATED_ATTR = 'data-fue-portal-created';

function getOrCreateContainer(parentDoc: Document, id: string, customStyles?: string): HTMLElement {
  let container = parentDoc.getElementById(id);
  if (!container) {
    container = parentDoc.createElement('div');
    container.id = id;
    container.setAttribute(CREATED_ATTR, 'true');
    parentDoc.body.appendChild(container);
  }
  container.setAttribute(USERS_ATTR, String(Number(container.getAttribute(USERS_ATTR) ?? 0) + 1));

  const styleId = `${id}-styles`;
  if (!parentDoc.getElementById(styleId)) {
    const style = parentDoc.createElement('style');
    style.id = styleId;
    style.textContent = customStyles ?? DEFAULT_CONTAINER_STYLES(id);
    parentDoc.head.appendChild(style);
  }

  return container;
}

/**
 * Let go of a container, removing it and its stylesheet once nothing uses it.
 *
 * Left in place, an unmounted portal leaves a fixed, full-window layer at
 * z-index 100000 in the host page for the rest of its life.
 */
function releaseContainer(parentDoc: Document, container: HTMLElement, id: string) {
  const users = Math.max(0, Number(container.getAttribute(USERS_ATTR) ?? 1) - 1);
  container.setAttribute(USERS_ATTR, String(users));
  if (users > 0 || container.getAttribute(CREATED_ATTR) !== 'true') return;
  container.remove();
  parentDoc.getElementById(`${id}-styles`)?.remove();
}

function copyFluentTokens(container: HTMLElement) {
  const provider = document.querySelector<HTMLElement>('.fui-FluentProvider');
  if (!provider) return;

  const computed = getComputedStyle(provider);
  const tokens: string[] = [];
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i]!;
    if (prop.startsWith('--')) {
      tokens.push(`${prop}:${computed.getPropertyValue(prop)}`);
    }
  }
  container.setAttribute('style', tokens.join(';'));
}

function serializeSheet(sheet: CSSStyleSheet): string {
  try {
    const rules = sheet.cssRules;
    let css = '';
    for (let i = 0; i < rules.length; i++) {
      css += rules[i]!.cssText + '\n';
    }
    return css;
  } catch {
    return '';
  }
}

function useSyncStyles(active: boolean, containerId: string, syncInterval: number) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const mirrorMapRef = useRef(new Map<HTMLStyleElement, HTMLStyleElement>());

  useEffect(() => {
    if (!active) return;
    const parentDoc = getParentDocument();
    if (!parentDoc) return;

    const mirrorMap = mirrorMapRef.current;

    function syncAllStyles() {
      const iframeStyles = document.head.querySelectorAll<HTMLStyleElement>('style');
      for (const src of iframeStyles) {
        if (!src.sheet) continue;
        const css = serializeSheet(src.sheet);
        if (!css) continue;

        let mirror = mirrorMap.get(src);
        if (!mirror) {
          mirror = parentDoc!.createElement('style');
          mirror.setAttribute('data-fluent-parent-portal', containerId);
          for (const attr of src.attributes) {
            if (attr.name.startsWith('data-') && attr.name !== 'data-fluent-parent-portal') {
              mirror.setAttribute(attr.name, attr.value);
            }
          }
          parentDoc!.head.appendChild(mirror);
          mirrorMap.set(src, mirror);
        }

        if (mirror.textContent !== css) {
          mirror.textContent = css;
        }
      }

      // A stylesheet the iframe has dropped goes from the host too, or its rules
      // keep applying there until the portal unmounts
      for (const [src, mirror] of mirrorMap) {
        if (!src.isConnected) {
          mirror.remove();
          mirrorMap.delete(src);
        }
      }
    }

    syncAllStyles();

    observerRef.current = new MutationObserver(() => syncAllStyles());
    observerRef.current.observe(document.head, { childList: true });

    if (syncInterval > 0) {
      intervalRef.current = setInterval(syncAllStyles, syncInterval);
    }

    return () => {
      observerRef.current?.disconnect();
      if (intervalRef.current) clearInterval(intervalRef.current);
      for (const mirror of mirrorMap.values()) mirror.remove();
      mirrorMap.clear();
    };
  }, [active, syncInterval, containerId]);
}

/**
 * Hook that returns the parent-document mount node for use with Fluent's
 * `mountNode` prop (e.g. on DialogSurface). Also handles style sync.
 */
export function useParentPortalMount(options?: UseParentPortalMountOptions): HTMLElement | undefined {
  const {
    containerId = DEFAULT_CONTAINER_ID,
    syncStyles = true,
    syncTokens = true,
    syncInterval = 300,
    containerStyles,
  } = options ?? {};

  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const parentDoc = getParentDocument();
    if (!parentDoc) return;

    const el = getOrCreateContainer(parentDoc, containerId, containerStyles);
    if (syncTokens) copyFluentTokens(el);
    setContainer(el);
    return () => {
      releaseContainer(parentDoc, el, containerId);
      setContainer(null);
    };
  }, [containerId, containerStyles, syncTokens]);

  useSyncStyles(syncStyles && container !== null, containerId, syncInterval);

  return container ?? undefined;
}

/**
 * Renders children into the parent document via createPortal.
 * Use for non-portal Fluent components. For DialogSurface, use
 * useParentPortalMount() with the mountNode prop instead.
 */
export function ParentPortal({
  children,
  containerId = DEFAULT_CONTAINER_ID,
  syncStyles = true,
  syncTokens = true,
  syncInterval = 300,
  containerStyles,
}: ParentPortalProps) {
  const container = useParentPortalMount({
    containerId,
    syncStyles,
    syncTokens,
    syncInterval,
    containerStyles,
  });

  if (!container) {
    return <>{children}</>;
  }

  // No theme of its own: a portal keeps React context, so this provider inherits
  // the app's theme. A fixed webLightTheme here overrode it - a dark app's content
  // came out light in the host page whatever tokens were copied across.
  return createPortal(
    <FluentProvider style={{ background: 'transparent' }}>
      {children}
    </FluentProvider>,
    container,
  );
}
