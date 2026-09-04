import type * as React from 'react';
import type { FieldAppearance } from '../../types/appearance';

export interface OptionSetOption {
  /** Numeric option value as stored in Dynamics */
  value: number;
  label: string;
  /** Hex colour configured on the option in metadata, e.g. "#0078d4" */
  color?: string | null;
  disabled?: boolean;
}

export interface OptionSetFieldProps {
  /** Options to render. Omit together with `entityName`/`attributeName` to auto-load from metadata. */
  options?: OptionSetOption[];
  /** Entity logical name - required for metadata auto-load */
  entityName?: string;
  /** Attribute logical name - required for metadata auto-load */
  attributeName?: string;
  /**
   * Allow selecting several options. Maps to a Dynamics MultiSelectPicklist, whose
   * stored value is a comma-separated list of numbers.
   */
  multiselect?: boolean;
  /**
   * Selected value. A single number for a picklist, an array for a multi-select.
   * Accepts the comma-separated string form Dynamics stores, too.
   */
  value?: number | number[] | string | null;
  /** Called with the selected value(s). Emits `null` when cleared. */
  onChange?: (value: number | number[] | null) => void;
  /**
   * Render each option's metadata colour as a swatch. Off by default because most
   * option sets have no colours configured and the swatches would all be grey.
   */
  showColors?: boolean;
  /**
   * Render options with a colour as a coloured badge (pill). When true, options
   * that have a `color` configured will display with that colour as the background.
   */
  asBadge?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Controls the colors and borders of the control. Defaults to `filled-darker`,
   * which is how Dynamics 365 renders fields natively.
   */
  appearance?: FieldAppearance;
  /** Allow clearing back to no selection. Defaults to true. */
  clearable?: boolean;
  /**
   * Force the listbox open. Chiefly for documentation captures and tests, where an
   * expanded control has to be rendered without driving a real pointer.
   */
  open?: boolean;
  /**
   * Control height, passed through to the underlying Combobox. `small` is what a
   * dense grid needs: a default-height control inside a virtualised row makes
   * every row taller, which is the opposite of what density is for.
   */
  size?: 'small' | 'medium' | 'large';
  /** Label rendered above the control */
  label?: string | React.ReactElement;
  /** Validation message rendered below the control */
  validationMessage?: string | React.ReactElement;
  required?: boolean;
  className?: string;
  /** Called when metadata auto-load fails */
  onLoadError?: (error: Error) => void;
}
