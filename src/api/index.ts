export {
  webApiGet,
  setWebApiFetch,
  setWebApiBaseUrl,
  getWebApiBaseUrl,
  escapeODataString,
  WebApiError,
} from './webApi';
export type { WebApiCollection, WebApiRequestOptions } from './webApi';

export {
  getEntityDefinition,
  getEntityAttributes,
  getEntityOptionSets,
  getAttributeOptions,
  clearMetadataCache,
} from './metadata';
export { labelOf } from './metadata.types';
export type {
  AttributeMetadata,
  DateTimeBehavior,
  DateTimeFormat,
  EntityDefinition,
  LocalizedLabel,
  OptionSetValue,
} from './metadata.types';
