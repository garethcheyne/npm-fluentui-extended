// Shared appearance handling - every field component defaults to filled-darker
export { DEFAULT_FIELD_APPEARANCE, toListboxAppearance, toTextareaAppearance } from './types/appearance';
export type { FieldAppearance, ListboxAppearance, TextareaAppearance } from './types/appearance';

// Components
export { Lookup } from './components/Lookup';
export type { LookupProps, LookupOption, LookupOptionDetail } from './components/Lookup';

export { CommandBar } from './components/CommandBar';
export type { CommandBarProps, CommandBarItem, CommandBarItemAppearance } from './components/CommandBar';

export { EntityGrid } from './components/EntityGrid';
export type {
	EntityGridProps,
	EntityGridColumn,
	EntityGridSort,
	EntityGridSortDirection,
} from './components/EntityGrid';

export { DateTimeField } from './components/DateTimeField';
export type { DateTimeFieldProps, DateTimeBehavior } from './components/DateTimeField';
export { parseStoredValue, formatStoredValue } from './components/DateTimeField';

export { OptionSetField } from './components/OptionSetField';
export type { OptionSetFieldProps, OptionSetOption } from './components/OptionSetField';
export { formatMultiSelectValue, parseSelectedValues } from './components/OptionSetField';

export { RecordHoverCard } from './components/RecordHoverCard';
export type {
	RecordHoverCardProps,
	RecordHoverCardRecord,
	RecordHoverCardDetail,
} from './components/RecordHoverCard';

// Dynamics 365 Web API client shared by the metadata-aware components
export {
	webApiGet,
	setWebApiFetch,
	setWebApiBaseUrl,
	getWebApiBaseUrl,
	WebApiError,
	getEntityDefinition,
	getEntityAttributes,
	getEntityOptionSets,
	getAttributeOptions,
	clearMetadataCache,
} from './api';
export type {
	AttributeMetadata,
	EntityDefinition,
	OptionSetValue,
	WebApiCollection,
} from './api';
export { QueryBuilder, serializeQueryBuilderState } from './components/QueryBuilder';
export type {
	QueryBuilderProps,
	QueryBuilderField,
	QueryBuilderOption,
	QueryBuilderOperator,
	QueryBuilderCondition,
	QueryBuilderGroup,
	QueryBuilderState,
	QueryBuilderQueryOptions,
	QueryBuilderApplyResult,
	QueryBuilderRelatedEntity,
	QueryBuilderDataType,
} from './components/QueryBuilder';
