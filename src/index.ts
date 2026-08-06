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
export { DateTimeRangeField } from './components/DateTimeField';
export type { DateTimeFieldProps, DateTimeRangeFieldProps, DateTimeRangeFieldChange, DateTimeRangeValue, DateTimeBehavior } from './components/DateTimeField';
export { parseStoredValue, formatStoredValue } from './components/DateTimeField';

export { OptionSetField } from './components/OptionSetField';
export type { OptionSetFieldProps, OptionSetOption } from './components/OptionSetField';
export { formatMultiSelectValue, parseSelectedValues } from './components/OptionSetField';

export { SystemUserPersona, SystemUserCard } from './components/SystemUserPersona';
export type {
	SystemUserPersonaProps,
	SystemUserPersonaSize,
	SystemUserContactItem,
	SystemUserCardProps,
} from './components/SystemUserPersona';

export { OwnerLookup } from './components/OwnerLookup';
export type { OwnerLookupProps } from './components/OwnerLookup';

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
	getSystemUser,
	searchSystemUsers,
	systemUserImageUrl,
	initialsOf,
	searchOwners,
	searchTeams,
	getOwner,
	ownerFromUser,
} from './api';
export type {
	AttributeMetadata,
	EntityDefinition,
	OptionSetValue,
	WebApiCollection,
	SystemUserRecord,
	SearchSystemUsersOptions,
	OwnerRecord,
	OwnerType,
	SearchOwnersOptions,
} from './api';
export {
	QueryBuilder,
	serializeQueryBuilderState,
	// Documented under Programmatic API, so they belong on the package root
	parseFetchXmlToState,
	validateQueryBuilderState,
	validateFetchXmlSyntax,
} from './components/QueryBuilder';
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
