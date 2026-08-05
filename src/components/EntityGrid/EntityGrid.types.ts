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
  /** Rows per page. Defaults to 25. */
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
  /** Fixed height for the scrolling body, e.g. 400. Omit to grow with content. */
  height?: number | string;
  className?: string;
}

export interface EntityGridPage {
  records: Record<string, unknown>[];
  /** Follow verbatim for the next page - Dynamics encodes paging state into it */
  nextLink?: string;
  totalCount?: number;
}
