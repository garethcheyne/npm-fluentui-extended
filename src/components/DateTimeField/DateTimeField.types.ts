import type * as React from 'react';
import type { DateTimeBehavior } from '../../api/metadata.types';
import type { FieldAppearance } from '../../types/appearance';

export type { DateTimeBehavior };

export interface DateTimeFieldProps {
  /**
   * Stored value. Accepts the string Dynamics returns or a Date.
   * Interpreted according to `behavior`.
   */
  value?: string | Date | null;
  /**
   * Called with the value serialized for `behavior` - an ISO UTC string for UserLocal,
   * "YYYY-MM-DD" for DateOnly, "YYYY-MM-DDTHH:mm:ss" for TimeZoneIndependent.
   * The Date is passed alongside for callers that would rather keep the object.
   */
  onChange?: (value: string | null, date: Date | null) => void;
  /**
   * How Dynamics stores this attribute. Defaults to 'UserLocal', which is the
   * Dynamics default for new DateTime attributes.
   */
  behavior?: DateTimeBehavior;
  /**
   * Show a time picker alongside the date. Ignored when `behavior` is 'DateOnly',
   * which has no time component by definition.
   */
  showTime?: boolean;
  /** Minutes between entries in the time dropdown. Defaults to 30. */
  timeIntervalMinutes?: number;
  /**
   * Load `behavior` from attribute metadata instead of the prop. Requires
   * `attributeName`; the prop is used until metadata resolves.
   */
  entityName?: string;
  attributeName?: string;
  /** Label rendered above the control */
  label?: string | React.ReactElement;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /**
   * Controls the colors and borders of the date and time controls. Defaults to
   * `filled-darker`, which is how Dynamics 365 renders fields natively.
   */
  appearance?: FieldAppearance;
  /** Validation message rendered below the control */
  validationMessage?: string | React.ReactElement;
  /** Allow clearing back to no value. Defaults to true. */
  clearable?: boolean;
  /** Format the date shown in the input. Defaults to the user's locale date string. */
  formatDate?: (date: Date) => string;
  className?: string;
  /** Called when metadata auto-load fails */
  onLoadError?: (error: Error) => void;
}
