export type QueryBuilderDataType = 'string' | 'number' | 'datetime' | 'boolean' | 'optionset' | 'lookup';

export interface QueryBuilderOption {
  label: string;
  value: string | number;
}

/** Target entity for lookup fields */
export interface QueryBuilderLookupTarget {
  /** Logical name of the target entity (e.g., "contact") */
  entityLogicalName: string;
  /** Entity set name for OData queries (e.g., "contacts") */
  entitySetName?: string;
  /** Display name of the entity (e.g., "Contact") */
  displayName?: string;
  /** Primary name attribute for searching (e.g., "fullname") */
  primaryNameAttribute?: string;
}

export interface QueryBuilderField {
  id: string;
  label: string;
  dataType: QueryBuilderDataType;
  options?: QueryBuilderOption[];
  /** Schema name (PascalCase attribute name, e.g., "CreatedOn") */
  schemaName?: string;
  /** Target entities for lookup fields (which entities can be referenced) */
  targets?: QueryBuilderLookupTarget[];
}

/**
 * FetchXML condition operators.
 * 
 * Common operators are explicitly listed for IDE autocomplete.
 * Additional FetchXML operators are supported via the string type.
 * 
 * @see QueryBuilder.operators.ts for full list of operators
 */
export type QueryBuilderOperator =
  // Comparison operators
  | 'eq'
  | 'ne'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  // Null operators
  | 'null'
  | 'not-null'
  | 'notnull' // Legacy alias
  // String operators
  | 'contains'
  | 'not-contain'
  | 'begins-with'
  | 'not-begin-with'
  | 'ends-with'
  | 'not-end-with'
  | 'like'
  | 'not-like'
  // Legacy aliases (for backward compatibility)
  | 'notcontains'
  | 'startswith'
  | 'endswith'
  | 'containsdata'
  // Multi-value operators
  | 'in'
  | 'not-in'
  | 'between'
  | 'not-between'
  | 'contain-values'
  | 'not-contain-values'
  // Date comparison operators
  | 'on'
  | 'on-or-before'
  | 'on-or-after'
  | 'not-on'
  // Relative date operators (no value)
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'this-week'
  | 'last-week'
  | 'next-week'
  | 'this-month'
  | 'last-month'
  | 'next-month'
  | 'this-year'
  | 'last-year'
  | 'next-year'
  | 'last-seven-days'
  | 'next-seven-days'
  // Relative date operators (with X value)
  | 'last-x-hours'
  | 'next-x-hours'
  | 'last-x-days'
  | 'next-x-days'
  | 'last-x-weeks'
  | 'next-x-weeks'
  | 'last-x-months'
  | 'next-x-months'
  | 'last-x-years'
  | 'next-x-years'
  | 'olderthan-x-minutes'
  | 'olderthan-x-hours'
  | 'olderthan-x-days'
  | 'olderthan-x-weeks'
  | 'olderthan-x-months'
  | 'olderthan-x-years'
  // Fiscal period operators
  | 'this-fiscal-year'
  | 'this-fiscal-period'
  | 'last-fiscal-year'
  | 'last-fiscal-period'
  | 'next-fiscal-year'
  | 'next-fiscal-period'
  | 'last-x-fiscal-years'
  | 'last-x-fiscal-periods'
  | 'next-x-fiscal-years'
  | 'next-x-fiscal-periods'
  | 'in-fiscal-year'
  | 'in-fiscal-period'
  | 'in-fiscal-period-and-year'
  | 'in-or-before-fiscal-period-and-year'
  | 'in-or-after-fiscal-period-and-year'
  // User context operators
  | 'eq-userid'
  | 'ne-userid'
  | 'eq-userteams'
  | 'eq-useroruserteams'
  | 'eq-useroruserhierarchy'
  | 'eq-useroruserhierarchyandteams'
  | 'eq-businessid'
  | 'ne-businessid'
  | 'eq-userlanguage'
  // Hierarchy operators
  | 'above'
  | 'eq-or-above'
  | 'under'
  | 'eq-or-under'
  | 'not-under'
  // Allow any string for future operators
  | (string & {});

export interface QueryBuilderCondition {
  id: string;
  kind?: 'field' | 'relatedEntity';
  fieldId: string;
  operator: QueryBuilderOperator;
  /** Single value or array of values (for in/not-in operators) */
  value?: string | number | boolean | (string | number)[];
  value2?: string | number | boolean;
  /** Display name for lookup values (the GUID is stored in value) */
  valueDisplayName?: string;
  /** Entity alias when condition references a link-entity (e.g., entityname="S" in FetchXML) */
  entityAlias?: string;
  /** The lookup field ID that creates this relationship (e.g., "ownerid") - used as "to" in link-entity */
  relatedEntityName?: string;
  /** The target entity logical name (e.g., "systemuser") - used as "name" in link-entity */
  relatedEntityTarget?: string;
  /** Alias for the link-entity (e.g., "S" in alias="S") */
  relatedEntityAlias?: string;
  /** Nested conditions for related entity (link-entity filter) */
  nestedConditions?: QueryBuilderCondition[];
  /** Logic operator for nested conditions */
  nestedLogic?: 'and' | 'or';
  /** Fields available for the related entity (loaded dynamically) */
  nestedFields?: QueryBuilderField[];
  /** True when the attribute from parsed FetchXML didn't match any known field */
  isUnknownField?: boolean;
}

export interface QueryBuilderGroup {
  id: string;
  logic: 'and' | 'or';
  conditions: QueryBuilderCondition[];
}

export interface QueryBuilderState {
  groups: QueryBuilderGroup[];
}

export interface QueryBuilderApplyResult {
  state: QueryBuilderState;
  fetchXmlFilter: string;
  fetchXml: string;
  odataFilter: string;
  /** Full OData query URL (e.g., "accounts?$filter=...") - requires entitySetName */
  odataQuery?: string;
}

export interface QueryBuilderRelatedEntity {
  /** Unique identifier - typically the lookup field name (e.g., "primarycontactid") */
  id: string;
  /** Display label for the relationship (e.g., "Primary Contact (Contact)") */
  label: string;
  /** The lookup field that creates this relationship */
  lookupField?: string;
  /** The target entity logical name (e.g., "contact") */
  targetEntity?: string;
  /** The target entity set name for OData (e.g., "contacts") */
  targetEntitySetName?: string;
}

export interface QueryBuilderLookupOption {
  /** Unique identifier (typically a GUID) */
  key: string;
  /** Display text */
  text: string;
  /** Optional secondary text */
  secondaryText?: string;
}

export interface QueryBuilderProps {
  entityName: string;
  /** Entity set name for OData queries (e.g., "accounts"). If not provided, will be fetched from the Web API. */
  entitySetName?: string;
  entityDisplayName?: string;
  fields?: QueryBuilderField[];
  /** Related entities for filtering. If not provided, will be auto-detected from lookup fields. */
  relatedEntities?: QueryBuilderRelatedEntity[];
  /** Initial query state object */
  initialState?: QueryBuilderState;
  /** Initial FetchXML string - will be parsed to populate the query builder */
  initialFetchXml?: string;
  defaultState?: QueryBuilderState;
  allowGroups?: boolean;
  allowRelatedEntity?: boolean;
  showODataPreview?: boolean;
  showFetchXmlPreview?: boolean;
  showResetToDefaultButton?: boolean;
  showDownloadFetchXmlButton?: boolean;
  showUploadFetchXmlButton?: boolean;
  showDeleteAllFiltersButton?: boolean;
  showValidateButton?: boolean;
  showDataSourceToggle?: boolean;
  liveDataLabel?: string;
  retainedDataLabel?: string;
  changeToRetainedDataLabel?: string;
  changeToLiveDataLabel?: string;
  initialDataSource?: 'live' | 'retained';
  onResetToDefault?: (state: QueryBuilderState) => void;
  onDeleteAllFilters?: () => void;
  onDataSourceChange?: (source: 'live' | 'retained') => void;
  onStateChange?: (state: QueryBuilderState) => void;
  onSerializedChange?: (result: QueryBuilderApplyResult) => void;
  /** Callback for lookup field search - returns options for the lookup dropdown */
  onLookupSearch?: (fieldId: string, searchText: string) => Promise<QueryBuilderLookupOption[]> | QueryBuilderLookupOption[];
  /** Callback to fetch fields for a related entity. If provided, this is used instead of the native Web API. */
  onFetchEntityFields?: (entityLogicalName: string) => Promise<QueryBuilderField[]>;
  /** Debug/trace callback for logging component behavior */
  onTrace?: (message: string, data?: any) => void;
  /** Enable verbose console.debug tracing (disabled by default) */
  debug?: boolean;
}
