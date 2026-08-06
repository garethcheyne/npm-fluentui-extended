/**
 * Field Component Mock Options
 *
 * This file contains static option definitions used when not connected
 * to Dynamics 365. These allow the field components to be demonstrated
 * without a live connection.
 *
 * In production use, OptionSetField and DateTimeField fetch metadata
 * from Dynamics 365 to determine available options and behaviors.
 */

// =============================================================================
// OPTIONSET OPTIONS
// =============================================================================

/**
 * Demo status options for OptionSetField.
 *
 * Mimics a typical Status Reason field with colored badges.
 * The `color` property enables visual distinction in the UI.
 */
export const demoStatusOptions = [
  { value: 1, label: 'Active', color: '#107c10' },     // Green
  { value: 2, label: 'Inactive', color: '#a19f9d' },   // Gray
  { value: 3, label: 'Pending Review', color: '#f7630c' }, // Orange
  { value: 4, label: 'Escalated', color: '#d13438' },  // Red
];

/**
 * Demo industry options for multi-select OptionSetField.
 *
 * Demonstrates a typical global option set without colors.
 */
export const demoIndustryOptions = [
  { value: 10, label: 'Technology' },
  { value: 20, label: 'Manufacturing' },
  { value: 30, label: 'Retail' },
  { value: 40, label: 'Financial Services' },
  { value: 50, label: 'Healthcare' },
];

// =============================================================================
// DATETIMEFIELD BEHAVIORS
// =============================================================================

/**
 * Available DateTimeBehavior modes in Dynamics 365.
 *
 * - UserLocal: Stored in UTC, displayed in user's timezone
 * - DateOnly: No time component, no timezone conversion
 * - TimeZoneIndependent: Stored and displayed as-is, no UTC conversion
 *
 * The behavior affects how dates are serialized and can prevent
 * timezone-related date drift issues.
 */
export const dateTimeBehaviors = ['UserLocal', 'DateOnly', 'TimeZoneIndependent'] as const;
export type DateTimeBehavior = (typeof dateTimeBehaviors)[number];

/**
 * Initial state for date values across different behaviors.
 * Each key corresponds to a DateTimeBehavior mode.
 */
export function createInitialDateValues(): Record<DateTimeBehavior, string | null> {
  return {
    UserLocal: null,
    DateOnly: null,
    TimeZoneIndependent: null,
  };
}
