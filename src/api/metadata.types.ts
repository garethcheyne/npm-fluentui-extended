/**
 * Dynamics 365 metadata shapes, narrowed to the fields this library actually reads.
 * These mirror the Web API EntityDefinitions payloads rather than inventing new names,
 * so a value can be traced straight back to the metadata browser.
 */

/** A Dynamics localized label. Only UserLocalizedLabel is read. */
export interface LocalizedLabel {
  UserLocalizedLabel?: { Label: string } | null;
}

/**
 * How Dynamics stores and renders a DateTime attribute. This drives whether a value
 * should be shifted into the user's timezone, and is invisible to any generic picker.
 */
export type DateTimeBehavior = 'UserLocal' | 'DateOnly' | 'TimeZoneIndependent';

/** DateTime attributes render as a date alone or a date plus time. */
export type DateTimeFormat = 'DateOnly' | 'DateAndTime';

export interface EntityDefinition {
  LogicalName: string;
  /** Plural set name used in OData paths, e.g. "accounts" */
  EntitySetName: string;
  /** Attribute holding the record's display name, e.g. "name" or "fullname" */
  PrimaryNameAttribute: string;
  /** Attribute holding the record's GUID, e.g. "accountid" */
  PrimaryIdAttribute: string;
  DisplayName?: LocalizedLabel;
  /** Numeric type code, used to build record URLs in some Dynamics surfaces */
  ObjectTypeCode?: number;
}

export interface OptionSetValue {
  Value: number;
  Label?: LocalizedLabel;
  /** Hex colour configured on the option, e.g. "#0078d4" */
  Color?: string | null;
  Description?: LocalizedLabel;
}

export interface AttributeMetadata {
  LogicalName: string;
  SchemaName?: string;
  DisplayName?: LocalizedLabel;
  /** Coarse type, e.g. "String", "Picklist", "DateTime" */
  AttributeType?: string;
  /**
   * Precise type. Note the value is suffixed ("PicklistType", "MoneyType") whereas
   * AttributeType is not - comparing the two directly is a known trap.
   */
  AttributeTypeName?: { Value: string };
  IsValidForAdvancedFind?: { Value: boolean };
  IsValidForRead?: { Value: boolean };
  RequiredLevel?: { Value: string };

  // The properties below are declared on DERIVED metadata types, not on
  // AttributeMetadata itself. Requesting one in a $select against the base Attributes
  // collection fails the entire request with "Could not find a property named ... on
  // type 'Microsoft.Dynamics.CRM.AttributeMetadata'". Fetch them through a cast segment
  // (see `getEntityAttributes`) rather than adding them to the base select.

  /** LookupAttributeMetadata - the entities this lookup may point at */
  Targets?: string[];
  /** DateTimeAttributeMetadata */
  DateTimeBehavior?: { Value: DateTimeBehavior };
  /** DateTimeAttributeMetadata / StringAttributeMetadata / IntegerAttributeMetadata */
  Format?: string;
  /** Picklist/MultiSelectPicklist/Boolean attributes only */
  OptionSet?: {
    Options?: OptionSetValue[];
    TrueOption?: OptionSetValue;
    FalseOption?: OptionSetValue;
  };
  GlobalOptionSet?: {
    Options?: OptionSetValue[];
  };
}

/** Read a localized label, falling back to the supplied default. */
export const labelOf = (label: LocalizedLabel | undefined, fallback: string): string =>
  label?.UserLocalizedLabel?.Label || fallback;
