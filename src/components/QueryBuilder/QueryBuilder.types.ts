export type QueryBuilderDataType = 'string' | 'number' | 'datetime' | 'boolean' | 'optionset' | 'lookup';

export interface QueryBuilderOption {
  label: string;
  value: string | number;
}

export interface QueryBuilderField {
  id: string;
  label: string;
  dataType: QueryBuilderDataType;
  options?: QueryBuilderOption[];
}

export type QueryBuilderOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'between'
  | 'contains'
  | 'notcontains'
  | 'startswith'
  | 'endswith'
  | 'containsdata'
  | 'null'
  | 'notnull';

export interface QueryBuilderCondition {
  id: string;
  kind?: 'field' | 'relatedEntity';
  fieldId: string;
  operator: QueryBuilderOperator;
  value?: string | number | boolean;
  value2?: string | number | boolean;
  /** Display name for lookup values (the GUID is stored in value) */
  valueDisplayName?: string;
  relatedEntityName?: string;
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
}

export interface QueryBuilderRelatedEntity {
  id: string;
  label: string;
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
  entityDisplayName?: string;
  fields?: QueryBuilderField[];
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
}
