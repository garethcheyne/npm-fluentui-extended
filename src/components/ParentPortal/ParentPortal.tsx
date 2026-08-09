import { FluentProvider, webLightTheme } from '@fluentui/react-components';
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

function getOrCreateContainer(parentDoc: Document, id: string, customStyles?: string): HTMLElement {
  let container = parentDoc.getElementById(id);
  if (!container) {
    container = parentDoc.createElement('div');
    container.id = id;
    parentDoc.body.appendChild(container);
  }

  const styleId = `${id}-styles`;
  if (!parentDoc.getElementById(styleId)) {
    const style = parentDoc.createElement('style');
    style.id = styleId;
    style.textContent = customStyles ?? DEFAULT_CONTAINER_STYLES(id);
    parentDoc.head.appendChild(style);
  }

  return container;
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

  return createPortal(
    <FluentProvider theme={webLightTheme} style={{ background: 'transparent' }}>
      {children}
    </FluentProvider>,
    container,
  );
}
