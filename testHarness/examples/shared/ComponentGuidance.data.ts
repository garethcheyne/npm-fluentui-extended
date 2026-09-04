/**
 * When to reach for each component, and when not to.
 *
 * A gallery shows what a component *can* do; it rarely says when it is the right
 * choice. The second list matters as much as the first — most misuse in this
 * library is picking a heavyweight component for a job a plain Fluent control
 * already does.
 *
 * Keyed by harness tab id.
 */

export interface ComponentGuidance {
  /** One line: what the component is for. */
  summary: string;
  /** Situations it is the right choice for. */
  useWhen: string[];
  /** Situations where something else fits better, and what that is. */
  insteadWhen: string[];
}

export const COMPONENT_GUIDANCE: Record<string, ComponentGuidance> = {
  lookup: {
    summary:
      'A Dynamics-style record picker: async search, expandable option details, badges, multi-select and optional hover cards.',
    useWhen: [
      'Users choose one or more records from a set too large to list — searched against the Web API or your own source.',
      'You want the D365 lookup affordances: a tab header, an action footer, filter buttons across several entity types.',
      'Rows need more than a label — secondary text, icons, or a record card on hover.',
    ],
    insteadWhen: [
      'The choices are a small fixed set: use OptionSetField for a Dataverse choice, or a plain Fluent Dropdown otherwise.',
      'You are picking a record owner: OwnerLookup handles the systemuser/team polymorphism for you.',
    ],
  },

  querybuilder: {
    summary: 'A visual editor for FetchXML filter conditions, including related entities.',
    useWhen: [
      'Users define their own filters or saved views at runtime.',
      'You need FetchXML in and out — loading an existing query and reading back the edited one.',
    ],
    insteadWhen: [
      'The filter is fixed and authored by developers: query the Web API directly and skip the UI.',
      'Users only pick from a few preset filters: a Fluent Dropdown or a set of toggles is far less to learn.',
    ],
  },

  commandbar: {
    summary: 'A ribbon-style action bar matching the Dynamics command bar, with overflow and tooltips.',
    useWhen: [
      'A page, grid or form needs several commands and should look native to D365.',
      'Commands have sub-menus, icon-only variants, or need rich tooltips.',
    ],
    insteadWhen: [
      'There are only one or two actions: plain Fluent Buttons are lighter and just as clear.',
    ],
  },

  entitygrid: {
    summary: 'A server-paged, virtualised grid over a Dataverse table.',
    useWhen: [
      'Listing records straight from the Web API, where paging and selection are the main needs.',
      'The row count is large enough that loading everything client-side is not reasonable.',
    ],
    insteadWhen: [
      'You need heavy per-cell behaviour — inline editing, grouping, conditional formatting, drag-to-reorder columns. Own the table (TanStack, say) and wrap it in a FluentContainer.',
    ],
  },

  datetimefield: {
    summary:
      'Date and date-range editing that respects Dataverse date behaviours (DateOnly, UserLocal, TimeZoneIndependent).',
    useWhen: [
      'Bound to a Dataverse date field, where the behaviour decides whether a timezone should be applied at all.',
      'A start/end pair should be edited and validated together.',
    ],
    insteadWhen: [
      'The value has no Dataverse semantics: a Fluent DatePicker is simpler and carries no behaviour assumptions.',
    ],
  },

  optionsetfield: {
    summary: 'Single and multi-select choice fields, with badge and text presentations.',
    useWhen: [
      'Bound to a Dataverse choice or multi-choice column, especially where the option colours should show.',
      'You want option metadata resolved from the Web API rather than hard-coded.',
    ],
    insteadWhen: [
      'The options are not a Dataverse optionset: a Fluent Dropdown avoids the metadata round trip.',
    ],
  },

  hovercard: {
    summary: 'A record card revealed after the pointer settles, loaded lazily.',
    useWhen: [
      'Dense lists or grids where users want to peek at a record without navigating away.',
      'The calling code already holds the record, and you want to show it without another request.',
    ],
    insteadWhen: [
      'The detail is essential rather than supplementary — put it on the page; a hover card is unreachable by touch and easy to miss.',
    ],
  },

  people: {
    summary: 'Personas, contact cards and owner picking for systemuser and team records.',
    useWhen: [
      'Showing who owns or touched a record, with the contact card a model-driven form gives.',
      'Picking an owner, which is polymorphic — OwnerLookup searches users and teams together.',
    ],
    insteadWhen: [
      'You are choosing a contact or any other entity: a plain Lookup is the general case.',
    ],
  },

  fluentshell: {
    summary:
      'The outermost element of a web resource: measures the host chrome and sets the gutters so the app lines up with the form around it.',
    useWhen: [
      'The app is deployed as a Dynamics 365 web resource, in an iframe on a form or as a full page.',
      'Anywhere the correct gutter depends on the host rather than on a number you can pick.',
    ],
    insteadWhen: [
      'The app owns its whole window — a standalone SPA needs no host measurement, and the shell will simply report `standalone`.',
      'Nothing below it should set outer margins of its own; that compounds with the shell invisibly.',
    ],
  },

  fluentcontainer: {
    summary: 'A card matching the surface D365 draws on a model-driven form.',
    useWhen: [
      'Grouping content into a card that has to sit convincingly beside real D365 form sections.',
      'A region owns a scroll area — set `scrolls` on it rather than on an ancestor.',
    ],
    insteadWhen: [
      'You want Fluent Card semantics (selection, preview, header slots): use Fluent Card, which is a different component with different affordances.',
      'The element only needs spacing, not a surface: a plain div avoids a second elevation.',
    ],
  },

  parentportal: {
    summary: 'Renders Fluent content into the parent document, escaping the iframe.',
    useWhen: [
      'A dialog or overlay must centre on the whole D365 page rather than inside the web resource frame.',
      'The iframe would otherwise grow or gain scrollbars to fit floating content.',
    ],
    insteadWhen: [
      'The content belongs inside the frame: portalling adds style-sync machinery and a same-origin requirement for no gain.',
    ],
  },

  harness: {
    summary: 'A local stand-in for the Dynamics form that will host a web resource.',
    useWhen: [
      'Developing a web resource locally, especially one whose layout depends on the host chrome.',
      'You want the same gutters and measurements locally that the org will produce.',
    ],
    insteadWhen: [
      'Running in the org — it disables itself outside a local host, so the wrapper can stay in the tree.',
      'You need Xrm or live data: the harness stands in for layout only, not for the client API.',
    ],
  },
};
