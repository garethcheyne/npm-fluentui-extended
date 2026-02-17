/**
 * QueryBuilder Field Enrichment Functions
 * 
 * Reusable functions for enriching fields with lookup targets and optionset options.
 * These functions work for both main entity fields and related entity fields.
 */

import type { QueryBuilderField, QueryBuilderLookupTarget, QueryBuilderOption } from './QueryBuilder.types';

/**
 * Enrich lookup fields with target entity metadata (EntitySetName, PrimaryNameAttribute, DisplayName).
 * This enables automatic search functionality in lookup inputs.
 * 
 * @param fields - Array of fields that may contain lookup fields
 * @param entityName - The entity that owns these fields
 * @param trace - Optional trace callback for debugging
 * @returns Fields with enriched lookup metadata
 */
export const enrichLookupFields = async (
    fields: (QueryBuilderField & { _raw?: any })[],
    entityName: string,
    trace?: (message: string, data?: any) => void
): Promise<QueryBuilderField[]> => {
    trace?.('[QueryBuilder] Enriching lookup targets for lookup fields', { entityName, fieldCount: fields.length });
    
    const lookupFields = fields.filter((f: any) => f.dataType === 'lookup' && f._raw);
    
    for (const field of lookupFields) {
        try {
            const attr = field._raw;
            const attrType = attr.AttributeType || attr.AttributeTypeName?.Value;
            
            if (attrType === 'Lookup' || attrType === 'Customer' || attrType === 'Owner') {
                const typeCast = attrType === 'Customer' ? 'CustomerAttributeMetadata' :
                               attrType === 'Owner' ? 'OwnerAttributeMetadata' :
                               'LookupAttributeMetadata';
                const targetsUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${field.id}')/Microsoft.Dynamics.CRM.${typeCast}?$select=LogicalName,Targets`;
                
                const targetsResponse = await fetch(targetsUrl, {
                    headers: {
                        'OData-MaxVersion': '4.0',
                        'OData-Version': '4.0',
                        'Accept': 'application/json',
                    },
                });
                
                if (targetsResponse.ok) {
                    const targetsData = await targetsResponse.json();
                    
                    if (targetsData.Targets && Array.isArray(targetsData.Targets)) {
                        // Fetch entity metadata for each target
                        const enrichedTargets: QueryBuilderLookupTarget[] = [];
                        
                        for (const targetEntityName of targetsData.Targets) {
                            try {
                                const entityMetaUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${targetEntityName}')?$select=LogicalName,EntitySetName,PrimaryNameAttribute,DisplayName`;
                                const entityMetaResponse = await fetch(entityMetaUrl, {
                                    headers: {
                                        'OData-MaxVersion': '4.0',
                                        'OData-Version': '4.0',
                                        'Accept': 'application/json',
                                    },
                                });
                                
                                if (entityMetaResponse.ok) {
                                    const entityMeta = await entityMetaResponse.json();
                                    enrichedTargets.push({
                                        entityLogicalName: targetEntityName,
                                        entitySetName: entityMeta.EntitySetName,
                                        primaryNameAttribute: entityMeta.PrimaryNameAttribute,
                                        displayName: entityMeta.DisplayName?.UserLocalizedLabel?.Label || targetEntityName,
                                    });
                                } else {
                                    // Fallback without metadata
                                    enrichedTargets.push({
                                        entityLogicalName: targetEntityName,
                                    });
                                }
                            } catch {
                                // Fallback without metadata
                                enrichedTargets.push({
                                    entityLogicalName: targetEntityName,
                                });
                            }
                        }
                        
                        field.targets = enrichedTargets;
                        
                        trace?.('[QueryBuilder] Enriched lookup targets', { 
                            field: field.id, 
                            targetCount: field.targets.length,
                            targets: field.targets.map((t: QueryBuilderLookupTarget) => ({
                                entity: t.entityLogicalName,
                                hasMetadata: !!(t.entitySetName && t.primaryNameAttribute)
                            }))
                        });
                    }
                }
            }
        } catch (lookupError) {
            trace?.('[QueryBuilder] Failed to enrich lookup field', { 
                field: field.id,
                error: lookupError instanceof Error ? lookupError.message : String(lookupError)
            });
        }
    }
    
    // Remove _raw property and return
    return fields.map((f: any) => {
        const { _raw, ...field } = f;
        return field;
    });
};

/**
 * Enrich optionset fields with their option values.
 * Web API limitation requires fetching optionsets separately with type casting.
 * 
 * @param fields - Array of fields that may contain optionset fields
 * @param entityName - The entity that owns these fields
 * @param trace - Optional trace callback for debugging
 * @returns Fields with enriched optionset options
 */
export const enrichOptionsetFields = async (
    fields: (QueryBuilderField & { _raw?: any })[],
    entityName: string,
    trace?: (message: string, data?: any) => void
): Promise<(QueryBuilderField & { _raw?: any })[]> => {
    trace?.('[QueryBuilder] Enriching optionset metadata for optionset fields', { entityName });
    
    const optionsetFields = fields.filter((f: any) => f.dataType === 'optionset' && f._raw);
    
    for (const field of optionsetFields) {
        try {
            const attr = field._raw;
            const attrType = attr.AttributeType || attr.AttributeTypeName?.Value;
            let optionsetUrl = '';
            
            // Use appropriate URL based on attribute type
            if (attrType === 'Picklist' || attrType === 'State' || attrType === 'Status') {
                const typeCast = attrType === 'Picklist' ? 'PicklistAttributeMetadata' : 
                               attrType === 'State' ? 'StateAttributeMetadata' : 
                               'StatusAttributeMetadata';
                optionsetUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${field.id}')/Microsoft.Dynamics.CRM.${typeCast}?$select=LogicalName&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`;
            }
            
            if (optionsetUrl) {
                const optResponse = await fetch(optionsetUrl, {
                    headers: {
                        'OData-MaxVersion': '4.0',
                        'OData-Version': '4.0',
                        'Accept': 'application/json',
                    },
                });
                
                if (optResponse.ok) {
                    const optData = await optResponse.json();
                    const optionSet = optData.OptionSet || optData.GlobalOptionSet;
                    
                    if (optionSet?.Options) {
                        field.options = optionSet.Options
                            .filter((opt: any) => opt?.Value != null)
                            .map((opt: any) => ({
                                label: opt.Label?.UserLocalizedLabel?.Label || String(opt.Value),
                                value: opt.Value,
                            }));
                        
                        trace?.('[QueryBuilder] Enriched optionset options', { 
                            field: field.id, 
                            optionCount: field.options?.length ?? 0
                        });
                    }
                }
            }
        } catch (optError) {
            trace?.('[QueryBuilder] Failed to enrich optionset field', { 
                field: field.id,
                error: optError instanceof Error ? optError.message : String(optError)
            });
        }
    }
    
    return fields;
};
