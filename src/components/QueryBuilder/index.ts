// Main component and legacy exports (for backward compatibility)
export { QueryBuilder, serializeQueryBuilderState, parseFetchXmlToState, validateQueryBuilderState } from './QueryBuilder';
export type { ParseFetchXmlResult, QueryBuilderValidationError, QueryBuilderValidationResult } from './QueryBuilder';

// Type exports
export type {
  QueryBuilderProps,
  QueryBuilderField,
  QueryBuilderOption,
  QueryBuilderOperator,
  QueryBuilderCondition,
  QueryBuilderGroup,
  QueryBuilderState,
  QueryBuilderApplyResult,
  QueryBuilderRelatedEntity,
  QueryBuilderLookupOption,
  QueryBuilderLookupTarget,
  QueryBuilderDataType,
} from './QueryBuilder.types';

// Operator utilities (new modular exports)
export {
  ALL_OPERATORS,
  getOperatorsForType,
  getOperatorByValue,
  operatorRequiresValue,
  operatorIsMultiValue,
  operatorRequiresValue2,
  getOperatorValueType,
  isOperatorFetchXmlOnly,
  getOperatorsForTypeSimple,
} from './QueryBuilder.operators';
export type { OperatorDefinition } from './QueryBuilder.operators';

// Serialization utilities
export { conditionToFetchXml, conditionToOData, relatedEntityToLinkEntity, relatedEntityToOData, escapeXml, prettyPrintXml } from './QueryBuilder.serializer';

// Parser utilities
export { parseFetchXmlToState as parseFetchXml, validateFetchXmlSyntax } from './QueryBuilder.parser';

// Helper utilities
export { FALLBACK_FIELDS, dataTypeFromAttribute, getDefaultValueForField, createCondition, createRelatedCondition, createGroup, cloneState, getOperatorOptionsForType } from './QueryBuilder.utils';

// Hooks for field loading and metadata
export {
  useEntityFields,
  loadEntityFields,
  parseAttributeToField,
  isValidAttribute,
  extractAttributesArray,
  useXrmAvailability,
} from './QueryBuilder.hooks';
export type { UseEntityFieldsResult, RelatedEntityFieldsResult } from './QueryBuilder.hooks';

// LookupValueInput internal component (for advanced customization)
export { LookupValueInput } from './QueryBuilder.LookupInput';
export type { LookupValueInputProps } from './QueryBuilder.LookupInput';
