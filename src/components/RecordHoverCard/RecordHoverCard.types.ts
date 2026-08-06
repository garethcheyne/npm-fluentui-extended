import type * as React from 'react';

export interface RecordHoverCardDetail {
  label: React.ReactNode;
  value: React.ReactNode;
}

/** The record shape the card renders, once loaded or supplied directly. */
export interface RecordHoverCardRecord {
  /** Primary display name */
  title: string;
  /** Secondary line under the title, e.g. account number or job title */
  subtitle?: React.ReactNode;
  /** Detail rows rendered as a label/value list */
  details?: RecordHoverCardDetail[];
  /** Icon or avatar shown beside the title */
  icon?: React.ReactNode;
  /** Raw record, passed back to render callbacks */
  data?: unknown;
}

export interface RecordHoverCardProps {
  /** Element the card is anchored to. Hovering or focusing it opens the card. */
  children: React.ReactElement;
  /** Entity logical name - required when loading via the Web API */
  entityName?: string;
  /** Record GUID - required when loading via the Web API */
  recordId?: string;
  /**
   * Columns to request. Defaults to the entity's primary name attribute alone;
   * supply the fields you want to show as details.
   */
  columns?: string[];
  /**
   * Supply the record directly and skip loading entirely. Use when the calling
   * grid or lookup already has the data in hand.
   */
  record?: RecordHoverCardRecord;
  /**
   * Map a raw Web API record onto the card. Without this the card shows the
   * primary name and each requested column as a detail row.
   */
  mapRecord?: (raw: Record<string, unknown>) => RecordHoverCardRecord;
  /**
   * Delay in ms before a hover triggers a fetch. Prevents a request for every
   * record a pointer crosses on its way somewhere else. Defaults to 400.
   */
  hoverDelayMs?: number;
  /** Commands rendered in the card footer, e.g. Open record */
  actions?: React.ReactNode;
  /** Called when the record fails to load */
  onLoadError?: (error: Error) => void;
  /** Disable the card without changing the anchor markup */
  disabled?: boolean;
  /**
   * Force the card open. Chiefly for documentation captures and tests, where an open
   * surface has to be rendered without driving a real pointer.
   */
  open?: boolean;
}
