import { Divider, Link, Text, makeStyles, tokens } from '@fluentui/react-components';
import { CodeExample } from '../shared/CodeExample';
import { ComponentGuidanceBlock } from '../shared/ComponentGuidance';
import { COMPONENT_GUIDANCE } from '../shared/ComponentGuidance.data';
import { CODE_SAMPLES } from '../shared/codeSamples';

const REPO_DOCS = 'https://github.com/garethcheyne/npm-fluentui-extended/blob/main/docs';

/**
 * The components, in sitemap order, with the name to print and the deep-dive doc
 * where one exists. Declared rather than derived from the guidance keys, so the
 * reference reads in a deliberate order and a component cannot slip in
 * undocumented — a missing entry here is visible, an absent object key is not.
 */
const SECTIONS: Array<{ id: string; name: string; doc?: string }> = [
  { id: 'lookup', name: 'Lookup' },
  { id: 'querybuilder', name: 'QueryBuilder' },
  { id: 'commandbar', name: 'CommandBar' },
  { id: 'entitygrid', name: 'EntityGrid' },
  { id: 'datetimefield', name: 'DateTimeField / DateTimeRangeField' },
  { id: 'optionsetfield', name: 'OptionSetField' },
  { id: 'hovercard', name: 'RecordHoverCard' },
  { id: 'people', name: 'SystemUserPersona / SystemUserCard / OwnerLookup' },
  { id: 'fluentshell', name: 'FluentShell', doc: 'FluentShell.md' },
  { id: 'fluentcontainer', name: 'FluentContainer', doc: 'FluentContainer.md' },
  { id: 'parentportal', name: 'ParentPortal' },
  { id: 'harness', name: 'D365TestHarness', doc: 'D365TestHarness.md' },
];

const useStyles = makeStyles({
  intro: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  component: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    scrollMarginTop: tokens.spacingVerticalXXL,
  },
  name: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  contents: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
  },
  missing: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  setup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  steps: {
    marginTop: '0px',
    marginBottom: '0px',
    paddingLeft: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  warn: {
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontSize: tokens.fontSizeBase300,
  },
});

/** Every sample belonging to a component, in generated order. */
function samplesFor(id: string): string[] {
  return Object.keys(CODE_SAMPLES).filter((key) => key === id || key.startsWith(`${id}-`));
}

/**
 * The library's reference, assembled from the same sources the example pages
 * use: the guidance data and the generated code samples. Nothing here is written
 * twice, so the reference cannot fall out of step with the pages — and a
 * component with no guidance shows as missing rather than silently absent.
 */
export function DocsExamples() {
  const styles = useStyles();

  return (
    <>
      <div className={styles.intro}>
        <Text className={styles.name}>Component reference</Text>
        <Text>
          What each component is for, when to reach for it, when to reach for something else, and
          the code for every example in this harness. The guidance and snippets are the same ones
          shown on each component&apos;s own page — this tab gathers them in one place.
        </Text>
        <div className={styles.contents}>
          {SECTIONS.map((section) => (
            <Link key={section.id} href={`#doc-${section.id}`}>
              {section.name}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.setup}>
        <Text weight="semibold">Using these components in your own project</Text>
        <ol className={styles.steps}>
          <li>
            Wrap your app in <code>D365TestHarness</code> and <code>FluentShell</code>. The harness
            disables itself off a local host, so the same tree ships to Dynamics unchanged.
          </li>
          <li>
            Add a dev-server proxy. A browser on <code>localhost</code> cannot call Dataverse
            directly — CORS blocks it and there is no token — so a Vite plugin mints one and
            forwards <code>/api/data/v9.2/*</code> to the org.
          </li>
          <li>
            Create <code>.env</code> beside the Vite config with the org URL and the app
            registration, and git-ignore it. Then create an <em>application user</em> in the org for
            that registration and give it a role, or every call returns 401.
          </li>
          <li>
            Point the Web API client at the proxy in dev:{' '}
            <code>setWebApiBaseUrl(import.meta.env.DEV ? '/api/data/v9.2' : ...)</code>.
          </li>
        </ol>
        <Text className={styles.warn}>
          Do not give a client secret a <code>VITE_</code> prefix. Vite exposes every prefixed
          variable to the browser through <code>import.meta.env</code> — that is what the prefix is
          for. Name secrets without it and read them with an empty <code>loadEnv</code> prefix.
        </Text>
        <Text>
          Full walkthrough:{' '}
          <Link href={`${REPO_DOCS}/local-development.md`}>local-development.md</Link>
        </Text>
      </div>

      {SECTIONS.map((section) => {
        const samples = samplesFor(section.id);
        return (
          <div key={section.id} id={`doc-${section.id}`} className={styles.component}>
            <Divider />
            <Text className={styles.name}>{section.name}</Text>

            {COMPONENT_GUIDANCE[section.id] ? (
              <ComponentGuidanceBlock componentId={section.id} />
            ) : (
              <Text className={styles.missing}>
                No guidance recorded — add an entry to ComponentGuidance.data.ts.
              </Text>
            )}

            {samples.length ? (
              samples.map((sampleId) => <CodeExample key={sampleId} sampleId={sampleId} />)
            ) : (
              <Text className={styles.missing}>
                No code sample generated — run <code>npm run gen:samples</code>.
              </Text>
            )}

            {section.doc && (
              <Text>
                Deep dive: <Link href={`${REPO_DOCS}/${section.doc}`}>{section.doc}</Link>
              </Text>
            )}
          </div>
        );
      })}
    </>
  );
}
