/**
 * EntityGrid Column Definitions
 *
 * This file contains column configuration arrays for the EntityGrid component.
 * Each column definition specifies:
 *
 * - `name`: The logical name of the attribute in Dynamics 365
 * - `label`: Optional display label (defaults to metadata display name)
 * - `width`: Column width in pixels
 *
 * The EntityGrid uses these definitions to:
 * - Build the $select clause for the OData query
 * - Render column headers with appropriate labels
 * - Size columns according to content type
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Column definition for EntityGrid.
 */
export interface GridColumn {
  /** Logical name of the Dynamics 365 attribute */
  name: string;
  /** Optional display label (overrides metadata) */
  label?: string;
  /** Column width in pixels */
  width: number;
}

// =============================================================================
// COLUMN CONFIGURATIONS
// =============================================================================

/**
 * Account entity grid columns.
 *
 * Includes a lookup field (primarycontactid) which the grid automatically
 * resolves using the @OData.Community.Display.V1.FormattedValue annotation.
 *
 * @example
 * ```tsx
 * <EntityGrid
 *   entityName="account"
 *   columns={accountColumns}
 *   ...
 * />
 * ```
 */
export const accountColumns: GridColumn[] = [
  {
    name: 'name',
    width: 260,
    // Uses metadata display name: "Account Name"
  },
  {
    name: 'accountnumber',
    width: 160,
    // Uses metadata display name: "Account Number"
  },
  {
    name: 'telephone1',
    width: 160,
    // Uses metadata display name: "Main Phone"
  },
  {
    name: 'primarycontactid',
    label: 'Primary Contact', // Override the metadata label
    width: 200,
    // This is a lookup field - EntityGrid will display the FormattedValue
    // rather than the raw GUID
  },
];

/**
 * Contact entity grid columns (example for other entities).
 *
 * @example
 * ```tsx
 * <EntityGrid
 *   entityName="contact"
 *   columns={contactColumns}
 *   ...
 * />
 * ```
 */
export const contactColumns: GridColumn[] = [
  { name: 'fullname', width: 220 },
  { name: 'emailaddress1', width: 240 },
  { name: 'telephone1', width: 140 },
  { name: 'jobtitle', width: 180 },
  { name: 'parentcustomerid', label: 'Company', width: 200 },
];

/**
 * Opportunity entity grid columns (example for other entities).
 */
export const opportunityColumns: GridColumn[] = [
  { name: 'name', width: 280 },
  { name: 'estimatedvalue', width: 120 },
  { name: 'closeprobability', label: 'Probability %', width: 100 },
  { name: 'estimatedclosedate', label: 'Est. Close', width: 120 },
  { name: 'parentaccountid', label: 'Account', width: 200 },
];
