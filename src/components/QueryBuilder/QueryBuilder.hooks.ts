/**
 * QueryBuilder Hooks
 * 
 * Custom React hooks for QueryBuilder field loading and metadata operations.
 */

import * as React from 'react';
import type { QueryBuilderField, QueryBuilderLookupTarget } from './QueryBuilder.types';
import { dataTypeFromAttribute } from './QueryBuilder.utils';

/**
 * Parse Dynamics 365 attribute metadata into QueryBuilderField format.
 */
export const parseAttributeToField = (attr: any): QueryBuilderField => {
    const dataType = dataTypeFromAttribute(attr);
    const optionSet = attr?.OptionSet?.Options;
    const options =
        dataType === 'optionset' && Array.isArray(optionSet)
            ? optionSet
                .map((opt: any) => ({
                    label: opt?.Label?.UserLocalizedLabel?.Label || opt?.Label || String(opt?.Value),
                    value: opt?.Value,
                }))
                .filter((opt: { label: string; value: string | number }) => opt.value !== undefined && opt.value !== null)
            : undefined;

    const displayName = attr.DisplayName;
    const label = typeof displayName === 'string'
        ? displayName
        : (displayName?.UserLocalizedLabel?.Label || attr.SchemaName || attr.LogicalName);

    return {
        id: attr.LogicalName,
        label,
        schemaName: attr.SchemaName,
        dataType,
        options,
    };
};

/**
 * Filter function for Dynamics 365 attributes - determines if attribute should be included.
 */
export const isValidAttribute = (attr: any, forAdvancedFind: boolean = true): boolean => {
    if (!attr?.LogicalName) return false;
    if (forAdvancedFind && attr?.IsValidForAdvancedFind === false) return false;
    
    const attrType = attr.AttributeType || attr.AttributeTypeName?.Value;
    // Skip virtual, uniqueidentifier (except primary key), and internal attributes
    if (attrType === 'Virtual' || attrType === 'CalendarRules') return false;
    if (attrType === 'Uniqueidentifier' && !attr.LogicalName.endsWith('id')) return false;
    
    return true;
};

/**
 * Extract attributes array from Dynamics 365 metadata response.
 */
export const extractAttributesArray = (metadata: any): any[] => {
    const attributesCollection = metadata?.Attributes?._collection || metadata?.Attributes || {};
    return Array.isArray(attributesCollection)
        ? attributesCollection
        : Object.keys(attributesCollection).map((key) => attributesCollection[key]);
};

export interface UseEntityFieldsResult {
    fields: QueryBuilderField[];
    entitySetName: string | undefined;
    loading: boolean;
    error: Error | null;
}

/**
 * Hook to load entity fields from Dynamics 365 metadata.
 * 
 * @param entityName - Logical name of the entity
 * @param providedFields - Consumer-provided fields (if any, skip loading)
 * @param providedEntitySetName - Consumer-provided entity set name
 * @param fallbackFields - Fallback fields if loading fails
 */
export const useEntityFields = (
    entityName: string,
    providedFields?: QueryBuilderField[],
    providedEntitySetName?: string,
    fallbackFields: QueryBuilderField[] = [],
): UseEntityFieldsResult => {
    const [fields, setFields] = React.useState<QueryBuilderField[]>(
        providedFields && providedFields.length > 0 ? providedFields : fallbackFields
    );
    const [entitySetName, setEntitySetName] = React.useState<string | undefined>(providedEntitySetName);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    // Update fields when providedFields change
    React.useEffect(() => {
        if (providedFields && providedFields.length > 0) {
            setFields(providedFields);
        }
    }, [providedFields]);

    // Load fields from Xrm metadata
    React.useEffect(() => {
        let disposed = false;

        const loadFields = async () => {
            if (providedFields && providedFields.length > 0) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const xrm = (window as any).Xrm;
                if (!xrm?.Utility?.getEntityMetadata) {
                    return;
                }

                const metadata = await xrm.Utility.getEntityMetadata(entityName);

                // Extract EntitySetName for OData queries
                if (metadata?.EntitySetName && !disposed) {
                    setEntitySetName(metadata.EntitySetName);
                }

                const attributesArray = extractAttributesArray(metadata);

                // First pass: collect all unique target entity names from lookup fields
                const targetEntityNames = new Set<string>();
                for (const attribute of attributesArray) {
                    if (Array.isArray(attribute?.Targets)) {
                        for (const target of attribute.Targets) {
                            const targetName = typeof target === 'string' ? target : target?.entityLogicalName;
                            if (targetName) targetEntityNames.add(targetName);
                        }
                    }
                }

                // Fetch metadata for each target entity to get entitySetName and primaryNameAttribute
                const targetMetadataCache: Record<string, { entitySetName?: string; displayName?: string; primaryNameAttribute?: string }> = {};
                for (const targetEntityName of targetEntityNames) {
                    try {
                        const targetMeta = await xrm.Utility.getEntityMetadata(targetEntityName);
                        targetMetadataCache[targetEntityName] = {
                            entitySetName: targetMeta?.EntitySetName,
                            displayName: targetMeta?.DisplayName?.UserLocalizedLabel?.Label || targetMeta?.LogicalName,
                            primaryNameAttribute: targetMeta?.PrimaryNameAttribute,
                        };
                    } catch (targetErr) {
                        console.warn(`[QueryBuilder] Could not fetch metadata for target entity "${targetEntityName}":`, targetErr);
                    }
                }

                const resolvedFields: QueryBuilderField[] = attributesArray
                    .filter((attr: any) => isValidAttribute(attr, true))
                    .map((attr: any) => {
                        const baseField = parseAttributeToField(attr);

                        // Parse lookup targets and enrich with cached metadata
                        const targets: QueryBuilderLookupTarget[] | undefined = 
                            baseField.dataType === 'lookup' && Array.isArray(attr.Targets)
                                ? attr.Targets.map((target: any) => {
                                    const entityLogicalName = typeof target === 'string' ? target : (target?.entityLogicalName || target);
                                    const cached = targetMetadataCache[entityLogicalName] || {};
                                    return {
                                        entityLogicalName,
                                        entitySetName: target?.entitySetName || cached.entitySetName,
                                        displayName: target?.displayName || cached.displayName,
                                        primaryNameAttribute: target?.primaryNameAttribute || cached.primaryNameAttribute,
                                    };
                                })
                                : undefined;

                        return { ...baseField, targets };
                    })
                    .sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));

                if (!disposed && resolvedFields.length > 0) {
                    setFields(resolvedFields);
                }
            } catch (err) {
                console.error('[QueryBuilder] Error loading fields:', err);
                if (!disposed) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                if (!disposed) {
                    setLoading(false);
                }
            }
        };

        loadFields();
        return () => {
            disposed = true;
        };
    }, [entityName, providedFields]);

    return { fields, entitySetName, loading, error };
};

export interface RelatedEntityFieldsResult {
    fields: QueryBuilderField[];
    loading: boolean;
    error: Error | null;
}

/**
 * Load fields for a related entity from Dynamics 365 metadata.
 * This is a standalone function, not a hook, because it's called in response to user actions.
 */
export const loadEntityFields = async (targetEntity: string): Promise<QueryBuilderField[]> => {
    const xrm = (window as any).Xrm;
    if (!xrm?.Utility?.getEntityMetadata) {
        console.warn('[QueryBuilder] Xrm.Utility.getEntityMetadata not available');
        return [];
    }

    const metadata = await xrm.Utility.getEntityMetadata(targetEntity);

    if (!metadata) {
        console.warn('[QueryBuilder] No metadata returned for entity:', targetEntity);
        return [];
    }

    const attributesArray = extractAttributesArray(metadata);

    if (attributesArray.length === 0) {
        console.warn('[QueryBuilder] No attributes found in metadata for entity:', targetEntity);
        return [];
    }

    return attributesArray
        .filter((attr: any) => isValidAttribute(attr, false))
        .map((attr: any) => parseAttributeToField(attr))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
};

/**
 * Check if Xrm WebApi is available (running in Dynamics 365).
 */
export const useXrmAvailability = (): boolean => {
    return React.useMemo(() => {
        try {
            return typeof (window as any).Xrm?.WebApi?.retrieveMultipleRecords === 'function';
        } catch {
            return false;
        }
    }, []);
};
