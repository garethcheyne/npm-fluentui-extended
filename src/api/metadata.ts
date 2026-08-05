/**
 * Entity metadata loader with a process-wide cache.
 *
 * Metadata is immutable for the life of a page, and several components ask for the
 * same entity, so requests are deduplicated by caching the promise rather than the
 * resolved value - two components mounting in the same tick share one round trip.
 */

import { webApiGet, WebApiError } from './webApi';
import type { AttributeMetadata, EntityDefinition } from './metadata.types';
import type { WebApiCollection } from './webApi';

const ENTITY_SELECT = 'LogicalName,EntitySetName,PrimaryNameAttribute,PrimaryIdAttribute,ObjectTypeCode,DisplayName';

/**
 * Properties available on the base AttributeMetadata type.
 *
 * `Format` and `DateTimeBehavior` are deliberately absent: they are declared on derived
 * types (StringAttributeMetadata, DateTimeAttributeMetadata, ...), and asking for them
 * here fails the whole request with "Could not find a property named 'Format' on type
 * 'Microsoft.Dynamics.CRM.AttributeMetadata'". They are merged in via a cast below.
 */
const ATTRIBUTE_SELECT =
  'LogicalName,SchemaName,DisplayName,AttributeType,AttributeTypeName,IsValidForAdvancedFind,IsValidForRead,RequiredLevel';

const entityCache = new Map<string, Promise<EntityDefinition>>();
const attributeCache = new Map<string, Promise<AttributeMetadata[]>>();
const optionSetCache = new Map<string, Promise<AttributeMetadata[]>>();

/** Clear every cached metadata response. Exposed mainly for tests and hot reload. */
export const clearMetadataCache = (): void => {
  entityCache.clear();
  attributeCache.clear();
  optionSetCache.clear();
};

/**
 * Fetch an entity definition (set name, primary attributes, display name).
 * Failures are not cached, so a transient error does not poison the entry.
 */
export const getEntityDefinition = (entityLogicalName: string): Promise<EntityDefinition> => {
  const cached = entityCache.get(entityLogicalName);
  if (cached) return cached;

  const request = webApiGet<EntityDefinition>(
    `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=${ENTITY_SELECT}`,
  ).catch((err) => {
    entityCache.delete(entityLogicalName);
    throw err;
  });

  entityCache.set(entityLogicalName, request);
  return request;
};

/**
 * Fetch attribute metadata for an entity.
 *
 * The base Attributes collection only exposes properties declared on AttributeMetadata
 * itself. Anything declared on a derived type - lookup Targets, DateTimeBehavior, Format -
 * has to be requested through a cast segment and merged in, so this issues one base query
 * plus one per enrichment.
 */
export const getEntityAttributes = (entityLogicalName: string): Promise<AttributeMetadata[]> => {
  const cached = attributeCache.get(entityLogicalName);
  if (cached) return cached;

  const request = (async () => {
    const base = await webApiGet<WebApiCollection<AttributeMetadata>>(
      `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=${ATTRIBUTE_SELECT}`,
    );

    const attributes = base.value || [];
    const byName = new Map(attributes.map((attribute) => [attribute.LogicalName, attribute]));

    /**
     * Merge properties from a derived-type cast onto the base records. Enrichments are
     * best-effort: an entity with no lookups or no date fields still returns usable
     * metadata, so a failed cast must not fail the whole load.
     */
    const enrich = async (cast: string, select: string, apply: (target: AttributeMetadata, source: AttributeMetadata) => void) => {
      try {
        const response = await webApiGet<WebApiCollection<AttributeMetadata>>(
          `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes/${cast}?$select=${select}`,
        );
        (response.value || []).forEach((source) => {
          const target = byName.get(source.LogicalName);
          if (target) apply(target, source);
        });
      } catch (err) {
        if (!(err instanceof WebApiError)) throw err;
      }
    };

    await Promise.all([
      enrich('Microsoft.Dynamics.CRM.LookupAttributeMetadata', 'LogicalName,Targets', (target, source) => {
        if (source.Targets) target.Targets = source.Targets;
      }),
      enrich(
        'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
        'LogicalName,DateTimeBehavior,Format',
        (target, source) => {
          if (source.DateTimeBehavior) target.DateTimeBehavior = source.DateTimeBehavior;
          if (source.Format) target.Format = source.Format;
        },
      ),
    ]);

    return attributes;
  })().catch((err) => {
    attributeCache.delete(entityLogicalName);
    throw err;
  });

  attributeCache.set(entityLogicalName, request);
  return request;
};

/**
 * Fetch option metadata for the picklist-like attributes of an entity.
 *
 * Both local and global option sets are expanded: a global option set leaves
 * `OptionSet` empty and puts the values on `GlobalOptionSet` instead, which is an
 * easy source of "the dropdown is empty" bugs.
 */
export const getEntityOptionSets = (entityLogicalName: string): Promise<AttributeMetadata[]> => {
  const cached = optionSetCache.get(entityLogicalName);
  if (cached) return cached;

  const expand = '$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)';
  const casts = [
    'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
    'Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata',
    'Microsoft.Dynamics.CRM.StateAttributeMetadata',
    'Microsoft.Dynamics.CRM.StatusAttributeMetadata',
  ];

  const request = (async () => {
    const results = await Promise.all(
      casts.map((cast) =>
        webApiGet<WebApiCollection<AttributeMetadata>>(
          `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes/${cast}?$select=LogicalName&${expand}`,
        )
          .then((response) => response.value || [])
          // One unsupported cast should not lose the options from the others
          .catch(() => [] as AttributeMetadata[]),
      ),
    );

    return results.flat();
  })().catch((err) => {
    optionSetCache.delete(entityLogicalName);
    throw err;
  });

  optionSetCache.set(entityLogicalName, request);
  return request;
};

/** Fetch option metadata for a single attribute. */
export const getAttributeOptions = async (
  entityLogicalName: string,
  attributeLogicalName: string,
): Promise<AttributeMetadata | undefined> => {
  const all = await getEntityOptionSets(entityLogicalName);
  return all.find((attribute) => attribute.LogicalName === attributeLogicalName);
};
