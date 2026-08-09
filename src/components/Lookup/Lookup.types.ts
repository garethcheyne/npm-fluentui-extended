import type { InputProps } from '@fluentui/react-components';
import type * as React from 'react';

/** Size variants matching FluentUI Input component */
export type LookupSize = 'small' | 'medium';

export interface LookupOptionDetail {
  /** Label for the detail row - can be a string or React element */
  label?: React.ReactNode;
  /** Value for the detail row - can be a string or React element */
  value: React.ReactNode;
}

export interface LookupOption {
  /** Unique identifier for the option */
  key: string;
  /** Display text for the option */
  text: string;
  /** Optional secondary text - can be a string or React element */
  secondaryText?: React.ReactNode;
  /**
   * Optional searchable text that is never rendered. Use this to include
   * additional searchable content (codes, IDs, etc.) without affecting display.
   * Client-side filtering will search this field in addition to `text` and
   * string `secondaryText`.
   */
  searchFields?: string;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional expandable details */
  details?: LookupOptionDetail[];
  /** Optional data associated with the option */
  data?: unknown;
  /** Whether the option is disabled */
  disabled?: boolean;
  /**
   * Logical name of the record this option refers to, e.g. "account". Together with
   * `recordId` this is what lets the hover card fetch the record on demand.
   */
  entityName?: string;
  /** Record GUID. Defaults to `key`, which is usually already the id. */
  recordId?: string;
}

/** Where a Lookup's hover card is offered. */
export type LookupHoverCardTarget = 'list' | 'rest' | 'both';

export interface LookupProps extends Omit<InputProps, 'onChange' | 'value'> {
  /** Unique identifier for the lookup - auto-generated if not provided */
  id?: string;
  /** The options to display in the dropdown */
  options?: LookupOption[];
  /** Currently selected option key (use with options array lookup) */
  selectedKey?: string | null;
  /** Currently selected option (use for controlled selection with full data) */
  selectedOption?: LookupOption | null;
  /** Callback when selection changes - receives full option with data */
  onOptionSelect?: (option: LookupOption | null) => void;
  /** Callback when search text changes - use for async loading */
  onSearchChange?: (searchText: string) => void;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Whether the lookup is loading options */
  loading?: boolean;
  /** Message to display when no results found */
  noResultsMessage?: string;
  /** Whether to allow clearing the selection */
  clearable?: boolean;
  /** Minimum characters before triggering search */
  minSearchLength?: number;
  /** Debounce delay for search in milliseconds */
  searchDebounceMs?: number;
  /** Whether the dropdown should match the input width */
  matchInputWidth?: boolean;
  /** Header content rendered at the top of the dropdown */
  header?: React.ReactNode;
  /** Footer content rendered at the bottom of the dropdown */
  footer?: React.ReactNode;
  /**
   * Controlled open state. When provided, the component will use this value
   * instead of its internal state. Use together with `onOpenChange`.
   */
  open?: boolean;
  /**
   * Callback fired when the dropdown open state changes.
   * Use together with `open` for controlled mode, or standalone to observe changes.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Disable client-side filtering of options. Use this when filtering is
   * performed server-side via `onSearchChange` and the returned options are
   * already filtered. Defaults to `false` (client-side filtering enabled).
   */
  disableClientFilter?: boolean;
  /**
   * Icon shown before the selected value at rest, representing the table.
   * Falls back to the selected option's own `icon`.
   */
  entityIcon?: React.ReactNode;
  /**
   * URL of the table's entity image, shown in place of `entityIcon` when the
   * table has one configured in Dynamics.
   */
  entityImage?: string;
  /**
   * Render the selected value as a link at rest, the way Dynamics presents a
   * resolved lookup. Defaults to `true`.
   */
  recordLinkAppearance?: boolean;
  /**
   * Called when the selected value is clicked at rest - use it to open the record.
   * Without it the click falls through to opening the dropdown as before.
   */
  onRecordClick?: (option: LookupOption) => void;

  // ─────────────────────────────────────────────────────────────────────────────
  // MULTI-SELECT MODE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Enable multi-select mode. When true, multiple options can be selected and
   * they are displayed as badges with a dismiss button. Defaults to `false`.
   */
  multiSelect?: boolean;

  /**
   * Maximum number of selections allowed in multi-select mode. Set to `undefined`
   * or `0` for unlimited selections. Only applies when `multiSelect` is true.
   */
  maxSelection?: number;

  /**
   * Currently selected option keys in multi-select mode (use with options array lookup).
   * Only used when `multiSelect` is true.
   */
  selectedKeys?: string[];

  /**
   * Currently selected options in multi-select mode (use for controlled selection).
   * Only used when `multiSelect` is true.
   */
  selectedOptions?: LookupOption[];

  /**
   * Callback when selection changes in multi-select mode - receives array of selected options.
   * Only called when `multiSelect` is true.
   */
  onOptionsSelect?: (options: LookupOption[]) => void;

  /**
   * Size of the input control. Matches FluentUI Input sizing.
   * - 'small': 24px height (use in compact layouts like QueryBuilder)
   * - 'medium': 32px height (default, matches standard form fields)
   */
  size?: LookupSize;

  // ── Hover card ──────────────────────────────────────────────────────────────

  /**
   * Reveal a record card when the pointer settles on an option. Off by default.
   *
   * With `hoverCardColumns` the card is populated from the Web API using the option's
   * `entityName` and `recordId` - nothing is fetched until a card is actually opened,
   * so a list of fifty results costs no extra requests until one is hovered.
   *
   * Supply `renderHoverCard` instead to build the card content yourself.
   */
  showHoverCard?: boolean;
  /**
   * Columns to fetch and list on the card. Requires each option to carry `entityName`
   * (and `recordId`, when the key is not the record's GUID).
   */
  hoverCardColumns?: string[];
  /**
   * Build the card body yourself. Receives the option; return `null` to suppress the
   * card for that option. Takes precedence over `hoverCardColumns`.
   */
  renderHoverCard?: (option: LookupOption) => React.ReactNode;
  /**
   * Which surfaces offer the card: the dropdown rows, the resolved value at rest, or
   * both. Defaults to `'both'`.
   */
  hoverCardTarget?: LookupHoverCardTarget;
  /**
   * Delay in ms before a hover opens the card and triggers its fetch. Defaults to 400,
   * which stops a pointer crossing the list from firing a request per row.
   */
  hoverCardDelayMs?: number;
  /** Content rendered at the bottom of the card, e.g. an "Open record" link */
  hoverCardActions?: React.ReactNode;
  /**
   * Mount node for the dropdown Portal. Use when the Lookup is inside a
   * dialog rendered in a parent document (via mountNode) so the listbox
   * appears in the same document as the dialog.
   */
  mountNode?: HTMLElement;
}
