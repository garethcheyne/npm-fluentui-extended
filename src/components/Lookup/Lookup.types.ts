import type { InputProps } from '@fluentui/react-components';
import type * as React from 'react';

export interface LookupOptionDetail {
  /** Label for the detail row */
  label?: string;
  /** Value for the detail row */
  value: string;
}

export interface LookupOption {
  /** Unique identifier for the option */
  key: string;
  /** Display text for the option */
  text: string;
  /** Optional secondary text */
  secondaryText?: string;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional expandable details */
  details?: LookupOptionDetail[];
  /** Optional data associated with the option */
  data?: unknown;
  /** Whether the option is disabled */
  disabled?: boolean;
}

export interface LookupProps extends Omit<InputProps, 'onChange' | 'value'> {
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
}

export interface LookupState {
  isOpen: boolean;
  searchText: string;
  highlightedIndex: number;
  filteredOptions: LookupOption[];
}
