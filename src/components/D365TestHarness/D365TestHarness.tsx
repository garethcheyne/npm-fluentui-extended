import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  FluentProvider,
  RendererProvider,
  createDOMRenderer,
  mergeClasses,
  webLightTheme,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowLeftRegular,
  BoardRegular,
  BuildingRegular,
  ChevronDownRegular,
  ClockRegular,
  ContactCardRegular,
  DocumentRegular,
  GridDotsRegular,
  HomeRegular,
  LightbulbRegular,
  MoreHorizontalRegular,
  NavigationRegular,
  PeopleRegular,
  PinRegular,
  QuestionCircleRegular,
  SearchRegular,
  SettingsRegular,
  ShareRegular,
  StarRegular,
  TableRegular,
  TaskListSquareLtrRegular,
} from '@fluentui/react-icons';
import { useD365TestHarnessStyles } from './D365TestHarness.styles';
import type { D365NavGroup, D365TestHarnessProps } from './D365TestHarness.types';

/**
 * Hosts are recognised by hostname rather than by a build flag, so the harness
 * needs no bundler configuration and behaves the same in every toolchain.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '0.0.0.0']);

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, protocol } = window.location;
  if (protocol === 'file:') return true;
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.localhost');
}

/**
 * The frame id matters. `FluentShell` reads `window.frameElement.id` and treats
 * a `WebResource*` frame as a form-hosted control, which is what a real web
 * resource is called on a model-driven form.
 */
const FRAME_ID = 'WebResource_harness';

/** A representative model-driven sitemap, shaped like a Sales app's. */
const DEFAULT_NAV: D365NavGroup[] = [
  {
    items: [
      { label: 'Home', icon: <HomeRegular /> },
      { label: 'Recent', icon: <ClockRegular /> },
      { label: 'Pinned', icon: <PinRegular /> },
    ],
  },
  {
    label: 'My Work',
    items: [
      { label: 'Dashboards', icon: <BoardRegular /> },
      { label: 'Activities', icon: <TaskListSquareLtrRegular /> },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Accounts', icon: <BuildingRegular /> },
      { label: 'Contacts', icon: <ContactCardRegular /> },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Leads', icon: <PeopleRegular /> },
      { label: 'Opportunities', icon: <DocumentRegular /> },
      { label: 'Price Lists', icon: <TableRegular />, selected: true },
    ],
  },
];

/**
 * Prepares the hosted document so the framed app starts from the same baseline a
 * web resource's own `index.html` gives it.
 */
function primeFrameDocument(doc: Document): void {
  doc.documentElement.style.height = '100%';
  const body = doc.body;
  body.style.margin = '0';
  body.style.height = '100%';
  body.style.overflow = 'hidden';
}

/**
 * A local stand-in for the Dynamics 365 form that will host a web resource.
 *
 * Wrapping an app in this during development is not cosmetic. A web resource in
 * the org is an iframe inside a specific arrangement of chrome, and components
 * that measure that chrome — `FluentShell` above all — have nothing to measure
 * on a bare dev server, so they fall back to their standalone behaviour and the
 * layout being developed is not the layout that ships.
 *
 * So the harness renders the chrome to the geometry a real form measures, and
 * hosts the app in a genuine same-origin iframe. `window.frameElement`, the
 * ancestor walk, the alignment reference and the parent-window debug mirror all
 * then work exactly as they will in Dynamics.
 *
 * The surrounding page — top bar, sitemap, command bar — is there so the app is
 * judged at the width and against the furniture it will really have. Only the
 * values in `HARNESS_GEOMETRY` affect what components measure; the rest is
 * appearance.
 *
 * Rendering into the frame uses Fluent's own cross-document support — a Griffel
 * renderer and a `FluentProvider` bound to the frame's document — rather than
 * copying stylesheets across, so styling inside the frame is real rather than
 * mirrored.
 *
 * Inactive by default outside a local host, where it renders `children` alone.
 */
export function D365TestHarness(props: D365TestHarnessProps) {
  const {
    children,
    active,
    recordName = 'Sample record',
    entityName = 'Entity',
    saved = true,
    tabs = ['General', 'Related'],
    commands = ['Save', 'Save & Close', 'New'],
    status = ['Active', 'Status'],
    orgName = 'CONTOSO',
    appName = 'Sales Hub',
    userInitials = 'GC',
    notification,
    navGroups = DEFAULT_NAV,
    hideNav = false,
    theme = webLightTheme,
    onFrameReady,
  } = props;

  const styles = useD365TestHarnessStyles();
  const frameRef = React.useRef<HTMLIFrameElement | null>(null);
  const [frameDoc, setFrameDoc] = React.useState<Document | null>(null);

  const enabled = active ?? isLocalHost();

  const attachFrame = React.useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || !doc.body) return;
    primeFrameDocument(doc);
    setFrameDoc(doc);
    onFrameReady?.(doc);
  }, [onFrameReady]);

  // `about:blank` frames are often ready before `load` fires, and sometimes only
  // after — so try immediately and keep the load handler as the other path.
  React.useEffect(() => {
    if (!enabled) return;
    attachFrame();
  }, [enabled, attachFrame]);

  // One renderer per document; recreating it on every render would re-insert
  // every rule the framed app has already registered.
  const renderer = React.useMemo(() => (frameDoc ? createDOMRenderer(frameDoc) : null), [frameDoc]);

  if (!enabled) return <>{children}</>;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.waffle}>
          <GridDotsRegular />
        </span>
        <span className={styles.orgName}>{orgName}</span>
        <span className={styles.topDivider} />
        <span className={styles.productName}>Dynamics 365</span>
        <span className={styles.appName}>{appName}</span>
        <span className={styles.search}>
          <SearchRegular />
          <span>Search</span>
        </span>
        <span className={styles.topActions}>
          <span className={styles.harnessBadge}>TEST HARNESS</span>
          <StarRegular />
          <LightbulbRegular />
          <AddRegular />
          <SettingsRegular />
          <QuestionCircleRegular />
          <span className={styles.avatar}>{userInitials}</span>
        </span>
      </div>

      {notification && <div className={styles.notification}>{notification}</div>}

      <div className={styles.body}>
        {!hideNav && (
          <nav className={styles.sideNav} aria-label="Site map">
            <span className={styles.hamburger}>
              <NavigationRegular />
            </span>
            {navGroups.map((group, groupIndex) => (
              <React.Fragment key={group.label ?? `group-${groupIndex}`}>
                {group.label && <span className={styles.navGroupLabel}>{group.label}</span>}
                {group.items.map((item) => {
                  const content = (
                    <>
                      <span className={styles.navIcon}>{item.icon ?? <DocumentRegular />}</span>
                      <span>{item.label}</span>
                    </>
                  );
                  const className = mergeClasses(
                    styles.navItem,
                    item.selected && styles.navItemSelected,
                  );
                  // A button when it does something, so it is reachable by
                  // keyboard; otherwise inert text, which a button would not be.
                  return item.onClick ? (
                    <button
                      key={item.label}
                      type="button"
                      className={className}
                      onClick={item.onClick}
                      aria-current={item.selected ? 'page' : undefined}
                      style={{ cursor: 'pointer' }}
                    >
                      {content}
                    </button>
                  ) : (
                    <span key={item.label} className={className}>
                      {content}
                    </span>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div id="mainContentContainer_0" className={styles.mainContent}>
          <div
            id="outerHeaderContainer_0"
            data-id="outerHeaderContainer_0"
            role="presentation"
            className={styles.outerHeader}
          >
            <div id="headerBodyContainer" role="presentation" className={styles.headerBody}>
              <div className={styles.titleRow}>
                <span className={styles.backArrow}>
                  <ArrowLeftRegular />
                </span>
                <span className={styles.titleBlock}>
                  <span className={styles.recordTitle}>
                    {recordName}
                    {saved && <span className={styles.savedFlag}>- Saved</span>}
                  </span>
                  <span className={styles.recordSubtitle}>{entityName}</span>
                </span>

                <span className={styles.headerRight}>
                  <span className={styles.statusBlock}>
                    <span className={styles.statusValue}>{status[0]}</span>
                    <span className={styles.statusLabel}>{status[1]}</span>
                  </span>
                  <ChevronDownRegular />
                  {commands.map((command) => (
                    <span key={command} className={styles.command}>
                      {command}
                    </span>
                  ))}
                  <MoreHorizontalRegular />
                  <span className={styles.command}>
                    <ShareRegular /> Share
                  </span>
                </span>
              </div>

              <ul id="tablist_0" role="tablist" className={styles.tabList}>
                {tabs.map((tab, index) => (
                  <li
                    key={tab}
                    role="tab"
                    aria-selected={index === 0}
                    className={mergeClasses(styles.tab, index === 0 && styles.tabSelected)}
                  >
                    {tab}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div id="tab-section0" role="presentation" className={styles.tabSection}>
            <div
              data-id="WebResource_harness-webResourceLabelControlWrapper"
              role="presentation"
              className={styles.frameWrapper}
            >
              <iframe
                id={FRAME_ID}
                ref={frameRef}
                title="Web resource"
                className={styles.frame}
                onLoad={attachFrame}
              />
            </div>
          </div>
        </div>
      </div>

      {frameDoc &&
        renderer &&
        createPortal(
          <RendererProvider renderer={renderer} targetDocument={frameDoc}>
            <FluentProvider theme={theme} targetDocument={frameDoc} style={{ height: '100%' }}>
              {children}
            </FluentProvider>
          </RendererProvider>,
          frameDoc.body,
        )}
    </div>
  );
}
