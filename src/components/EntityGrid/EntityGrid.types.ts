import type * as React from 'react';

export interface EntityGridColumn {
  /** Attribute logical name. Also the OData $select and $orderby key. */
  name: string;
  /** Column header. Defaults to the attribute's metadata display name. */
  label?: string;
  /** Fixed width in pixels. Omit to share the remaining space. */
  width?: number;
  /** Allow sorting on this column. Defaults to true. */
  sortable?: boolean;
  /**
   * Render the cell. Receives the formatted value Dynamics annotated onto the record
   * where one exists, plus the raw record.
   */
  render?: (formatted: string, record: Record<string, unknown>) => React.ReactNode;
}

export type EntityGridSortDirection = 'asc' | 'desc';

export interface EntityGridSort {
  column: string;
  direction: EntityGridSortDirection;
}

/**
 * Load mode for the grid:
 * - `paged`: Traditional prev/next pagination (default)
 * - `infinite`: Automatically loads more as user scrolls
 * - `manual`: Shows a "Load More" button
 */
export type EntityGridLoadMode = 'paged' | 'infinite' | 'manual';

/**
 * State for a single column's visibility, pinning, and width.
 */
export interface ColumnState {
  /** Column name (matches EntityGridColumn.name) */
  name: string;
  /** Whether the column is visible */
  visible: boolean;
  /** Whether the column is pinned to the left */
  pinned: boolean;
  /** Current width in pixels */
  width?: number;
}

export interface EntityGridProps {
  /** Entity logical name, e.g. "account" */
  entityName: string;
  /**
   * Columns to render. When omitted the grid shows the entity's primary name
   * attribute alone - supply columns for anything useful.
   */
  columns?: EntityGridColumn[];
  /**
   * OData filter applied to every page, e.g. "statecode eq 0". Pair this with
   * QueryBuilder's `odataFilter` output to drive the grid from a built query.
   */
  filter?: string;
  /** Initial sort. Defaults to the primary name attribute ascending. */
  defaultSort?: EntityGridSort;
  /** Rows per page. Defaults to 50 for virtualized mode, 25 for paged. */
  pageSize?: number;
  /** Heading rendered above the grid */
  title?: React.ReactNode;
  /** Commands rendered in the grid's command bar */
  commands?: React.ReactNode;
  /** Allow selecting rows. Defaults to false. */
  selectable?: boolean;
  /** Called when the selected row ids change */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Called when a row is activated (click or Enter) */
  onRecordOpen?: (recordId: string, record: Record<string, unknown>) => void;
  /** Message shown when a page comes back empty. Defaults to "No records found". */
  emptyMessage?: React.ReactNode;
  /** Called whenever a page fails to load */
  onLoadError?: (error: Error) => void;
  /** Fixed height for the scrolling body, e.g. 400. Required for virtualized/infinite modes. */
  height?: number | string;
  className?: string;

  // ─── Virtualization & Infinite Scroll ─────────────────────────────────────

  /**
   * How to load records:
   * - `paged`: Traditional prev/next pagination (no virtualization)
   * - `infinite`: Virtualized with automatic loading on scroll
   * - `manual`: Virtualized with a "Load More" button
   * @default 'paged'
   */
  loadMode?: EntityGridLoadMode;

  /**
   * Estimated height of each row in pixels. Used for scroll calculations.
   * @default 36
   */
  estimatedRowHeight?: number;

  /**
   * Number of rows to render outside the visible area (reduces blank rows during fast scroll).
   * @default 5
   */
  overscan?: number;

  /**
   * Scroll progress (0-1) at which to trigger loading more records in infinite mode.
   * @default 0.8
   */
  loadThreshold?: number;

  // ─── Column Features ──────────────────────────────────────────────────────

  /**
   * Enable column resizing by dragging column borders.
   * @default false
   */
  enableColumnResize?: boolean;

  /**
   * Enable column pinning to fix columns to the left.
   * @default false
   */
  enableColumnPinning?: boolean;

  /**
   * Show column visibility menu to hide/show columns.
   * @default false
   */
  enableColumnVisibility?: boolean;

  /**
   * Called when column state changes (visibility, pinning, width).
   */
  onColumnsChange?: (columns: ColumnState[]) => void;

  /**
   * Initial column state. If not provided, all columns are visible and unpinned.
   */
  defaultColumnState?: ColumnState[];
}

export interface EntityGridPage {
  records: Record<string, unknown>[];
  /** Follow verbatim for the next page - Dynamics encodes paging state into it */
  nextLink?: string;
  totalCount?: number;
}
