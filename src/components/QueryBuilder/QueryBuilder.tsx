import * as React from 'react';
import { Button, Combobox, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, Dropdown, Input, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Option, Spinner, Text, Textarea } from '@fluentui/react-components';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { AddRegular, ArrowDownloadRegular, ArrowResetRegular, ArrowUploadRegular, CheckmarkCircleRegular, CopyRegular, DeleteRegular, DismissRegular, EditRegular, EyeOffRegular, EyeRegular, MoreHorizontalRegular, WarningRegular } from '@fluentui/react-icons';
import { mergeClasses, useQueryBuilderStyles } from './QueryBuilder.styles';
import { DEFAULT_FIELD_APPEARANCE, toListboxAppearance, toTextareaAppearance } from '../../types/appearance';
import { Lookup } from '../Lookup';
import type { LookupOption } from '../Lookup';
import type {
    QueryBuilderApplyResult,
    QueryBuilderCondition,
    QueryBuilderField,
    QueryBuilderGroup,
    QueryBuilderLookupOption,
    QueryBuilderLookupTarget,
    QueryBuilderOption,
    QueryBuilderProps,
    QueryBuilderRelatedEntity,
    QueryBuilderState,
} from './QueryBuilder.types';

// Import from new modular files
import { getOperatorsForType, getOperatorsForTypeSimple, operatorRequiresValue, operatorIsMultiValue, operatorRequiresValue2, getOperatorValueType } from './QueryBuilder.operators';
import { serializeQueryBuilderState, prettyPrintXml, escapeXml } from './QueryBuilder.serializer';
import { parseFetchXmlToState, ParseFetchXmlResult } from './QueryBuilder.parser';
import {
    DEFAULT_BOOLEAN_OPTIONS,
    FALLBACK_FIELDS,
    buildFieldOptions,
    formatDateOnly,
    isTrueValue,
    validateQueryBuilderState,
    dataTypeFromAttribute,
    getDefaultValueForField,
    createCondition,
    createRelatedCondition,
    createGroup,
    cloneState,
    getOperatorOptionsForType,
    QueryBuilderValidationError,
    QueryBuilderValidationResult,
} from './QueryBuilder.utils';
import { LookupValueInput } from './QueryBuilder.LookupInput';
import { loadEntityFields, useEntityFields, extractAttributesArray, isValidAttribute, parseAttributeToField } from './QueryBuilder.hooks';
import { enrichLookupFields, enrichOptionsetFields, fetchOptionSetMetadata } from './QueryBuilder.enrichment';

// Re-export for backward compatibility
export type { QueryBuilderValidationError, QueryBuilderValidationResult };
export { validateQueryBuilderState, serializeQueryBuilderState, parseFetchXmlToState };
export type { ParseFetchXmlResult };

export const QueryBuilder: React.FC<QueryBuilderProps> = (props) => {
    const styles = useQueryBuilderStyles();
    
    // Debug tracing — only logs to console when debug={true}; always calls onTrace if provided
    const trace = React.useCallback((message: string, data?: any) => {
        if (props.debug) {
            console.debug(
                '%c FluentUI-Extended ',
                'background: #845EF7; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
                message,
                data || ''
            );
        }
        props.onTrace?.(message, data);
    }, [props.debug, props.onTrace]);
    
    const [loading, setLoading] = React.useState(false);
    const [availableFields, setAvailableFields] = React.useState<QueryBuilderField[]>(
        props.fields && props.fields.length > 0 ? props.fields : FALLBACK_FIELDS,
    );
    // EntitySetName for OData queries (e.g., "accounts" instead of "account")
    const [entitySetName, setEntitySetName] = React.useState<string | undefined>(props.entitySetName);

    const defaultField = availableFields[0] || FALLBACK_FIELDS[0];

    // Convert fields to LookupOption format for field selector
    const fieldLookupOptions: LookupOption[] = React.useMemo(() => {
        const formatDataType = (dataType: QueryBuilderField['dataType']): string => {
            const labels: Record<QueryBuilderField['dataType'], string> = {
                string: 'Text',
                number: 'Number',
                datetime: 'Date/Time',
                boolean: 'Yes/No',
                optionset: 'Choice',
                lookup: 'Lookup',
            };
            return labels[dataType] || dataType;
        };

        // Deduplicate fields by id (take first occurrence)
        const uniqueFields = availableFields.reduce((acc, field) => {
            if (!acc.some(f => f.id === field.id)) {
                acc.push(field);
            }
            return acc;
        }, [] as QueryBuilderField[]);

        return uniqueFields.map((field) => ({
            key: field.id,
            text: field.label,
            details: [
                { label: 'Logical Name', value: field.id },
                ...(field.schemaName ? [{ label: 'Schema Name', value: field.schemaName }] : []),
                { label: 'Type', value: formatDataType(field.dataType) },
            ],
            data: field,
        }));
    }, [availableFields]);

    // Compute related entities from lookup fields (auto-detect if not provided via props)
    const computedRelatedEntities: QueryBuilderRelatedEntity[] = React.useMemo(() => {
        // If consumer provided related entities, use those
        if (props.relatedEntities && props.relatedEntities.length > 0) {
            return props.relatedEntities;
        }

        // Auto-detect from lookup fields
        const related: QueryBuilderRelatedEntity[] = [];
        for (const field of availableFields) {
            if (field.dataType === 'lookup' && field.targets && field.targets.length > 0) {
                for (const target of field.targets) {
                    related.push({
                        id: field.id, // Use lookup field name as ID (for link-entity)
                        label: `${field.label} (${target.displayName || target.entityLogicalName})`,
                        lookupField: field.id,
                        targetEntity: target.entityLogicalName,
                        targetEntitySetName: target.entitySetName,
                        targetPrimaryIdAttribute: target.primaryIdAttribute,
                    });
                }
            }
        }
        return related;
    }, [availableFields, props.relatedEntities]);

    const [builderState, setBuilderState] = React.useState<QueryBuilderState>(() => cloneState(props.initialState, defaultField));
    const initialFetchXmlParsedRef = React.useRef(false);

    // Dynamics renders fields filled rather than outlined. Comboboxes and dropdowns take a
    // narrower union than text inputs, so the two are resolved separately.
    const fieldAppearance = props.appearance ?? DEFAULT_FIELD_APPEARANCE;
    const listboxAppearance = toListboxAppearance(fieldAppearance);

    /**
     * Root <fetch> options with the explicit props layered over whatever an imported
     * query carried. Everything that serializes reads this rather than `builderState`
     * directly, so the props win consistently across preview, download and validate.
     */
    const effectiveState = React.useMemo<QueryBuilderState>(() => {
        const merged = { ...builderState.queryOptions };
        if (props.distinct !== undefined) merged.distinct = props.distinct;
        if (props.noLock !== undefined) merged.noLock = props.noLock;
        if (props.top !== undefined) merged.top = props.top;
        return Object.keys(merged).length > 0 ? { ...builderState, queryOptions: merged } : builderState;
    }, [builderState, props.distinct, props.noLock, props.top]);

    // Parse initialFetchXml once fields are available
    React.useEffect(() => {
        if (
            props.initialFetchXml &&
            !initialFetchXmlParsedRef.current &&
            availableFields.length > 0 &&
            availableFields !== FALLBACK_FIELDS
        ) {
            const result = parseFetchXmlToState(props.initialFetchXml, availableFields);
            if (result.state) {
                setBuilderState(result.state);
                initialFetchXmlParsedRef.current = true;
            }
        }
    }, [props.initialFetchXml, availableFields]);

    React.useEffect(() => {
        if (props.fields && props.fields.length > 0) {
            setAvailableFields(props.fields);
        }
    }, [props.fields]);

    React.useEffect(() => {
        let disposed = false;

        const loadFields = async () => {
            if (props.fields && props.fields.length > 0) {
                return;
            }

            setLoading(true);
            try {
                // Fetch entity metadata using native Web API
                const entityResponse = await fetch(
                    `/api/data/v9.2/EntityDefinitions(LogicalName='${props.entityName}')?$select=EntitySetName,DisplayName,PrimaryNameAttribute,PrimaryIdAttribute`,
                    {
                        headers: {
                            'OData-MaxVersion': '4.0',
                            'OData-Version': '4.0',
                            'Accept': 'application/json',
                        },
                    }
                );

                if (!entityResponse.ok) {
                    console.warn('[QueryBuilder] Failed to fetch entity metadata');
                    return;
                }

                const entityMetadata = await entityResponse.json();

                // Extract EntitySetName for OData queries
                if (entityMetadata?.EntitySetName && !disposed) {
                    setEntitySetName(entityMetadata.EntitySetName);
                }

                // Fetch regular attributes
                const attributesResponse = await fetch(
                    `/api/data/v9.2/EntityDefinitions(LogicalName='${props.entityName}')/Attributes?$select=LogicalName,SchemaName,DisplayName,AttributeType,AttributeTypeName,IsValidForAdvancedFind`,
                    {
                        headers: {
                            'OData-MaxVersion': '4.0',
                            'OData-Version': '4.0',
                            'Accept': 'application/json',
                        },
                    }
                );

                if (!attributesResponse.ok) {
                    console.warn('[QueryBuilder] Failed to fetch entity attributes');
                    return;
                }

                const attributesData = await attributesResponse.json();
                const attributesArray = attributesData.value || [];

                // Fetch lookup attributes separately with Targets property
                const lookupResponse = await fetch(
                    `/api/data/v9.2/EntityDefinitions(LogicalName='${props.entityName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,SchemaName,DisplayName,AttributeType,AttributeTypeName,Targets`,
                    {
                        headers: {
                            'OData-MaxVersion': '4.0',
                            'OData-Version': '4.0',
                            'Accept': 'application/json',
                        },
                    }
                );

                const lookupData = lookupResponse.ok ? await lookupResponse.json() : { value: [] };
                const lookupAttributes = lookupData.value || [];

                // Fetch selectable values for optionset/boolean attributes - option metadata
                // cannot be expanded from the base Attributes collection
                const optionSetMap = await fetchOptionSetMetadata(props.entityName, trace);

                // Create a map of lookup attributes by LogicalName for easy lookup
                const lookupMap = new Map<string, any>(lookupAttributes.map((attr: any) => [attr.LogicalName, attr]));

                // Merge lookup Targets and option set metadata into the main attributes array
                const mergedAttributes = attributesArray.map((attr: any) => {
                    const lookupAttr = lookupMap.get(attr.LogicalName);
                    return {
                        ...attr,
                        ...(lookupAttr?.Targets ? { Targets: lookupAttr.Targets } : {}),
                        ...optionSetMap.get(attr.LogicalName),
                    };
                });

                // First pass: collect all unique target entity names from lookup fields
                const targetEntityNames = new Set<string>();
                for (const attribute of mergedAttributes) {
                    if (Array.isArray(attribute?.Targets)) {
                        for (const target of attribute.Targets) {
                            const entityName = typeof target === 'string' ? target : target?.entityLogicalName;
                            if (entityName) targetEntityNames.add(entityName);
                        }
                    }
                }

                // Fetch metadata for each target entity to get entitySetName, primaryNameAttribute
                // and primaryIdAttribute (needed for the link-entity "from" attribute)
                const targetMetadataCache: Record<string, { entitySetName?: string; displayName?: string; primaryNameAttribute?: string; primaryIdAttribute?: string }> = {};
                for (const targetEntityName of targetEntityNames) {
                    try {
                        const targetResponse = await fetch(
                            `/api/data/v9.2/EntityDefinitions(LogicalName='${targetEntityName}')?$select=EntitySetName,DisplayName,PrimaryNameAttribute,PrimaryIdAttribute`,
                            {
                                headers: {
                                    'OData-MaxVersion': '4.0',
                                    'OData-Version': '4.0',
                                    'Accept': 'application/json',
                                },
                            }
                        );
                        if (targetResponse.ok) {
                            const targetMeta = await targetResponse.json();
                            targetMetadataCache[targetEntityName] = {
                                entitySetName: targetMeta?.EntitySetName,
                                displayName: targetMeta?.DisplayName?.UserLocalizedLabel?.Label || targetMeta?.LogicalName,
                                primaryNameAttribute: targetMeta?.PrimaryNameAttribute,
                                primaryIdAttribute: targetMeta?.PrimaryIdAttribute,
                            };
                        }
                    } catch (targetErr) {
                        console.warn(`[QueryBuilder] Could not fetch metadata for target entity "${targetEntityName}":`, targetErr);
                    }
                }

                const resolvedFields: QueryBuilderField[] = mergedAttributes
                    .filter((attribute: any) => attribute?.LogicalName && attribute?.IsValidForAdvancedFind !== false)
                    .map((attribute: any) => {
                        const dataType = dataTypeFromAttribute(attribute);

                        // Parse lookup targets and enrich with cached metadata
                        const targets = dataType === 'lookup' && Array.isArray(attribute.Targets)
                            ? attribute.Targets.map((target: any) => {
                                const entityLogicalName = typeof target === 'string' ? target : (target?.entityLogicalName || target);
                                const cached = targetMetadataCache[entityLogicalName] || {};
                                return {
                                    entityLogicalName,
                                    entitySetName: target?.entitySetName || cached.entitySetName,
                                    displayName: target?.displayName || cached.displayName,
                                    primaryNameAttribute: target?.primaryNameAttribute || cached.primaryNameAttribute,
                                    primaryIdAttribute: target?.primaryIdAttribute || cached.primaryIdAttribute,
                                };
                            })
                            : undefined;

                        // DisplayName can be an object with UserLocalizedLabel or a string
                        const displayName = attribute.DisplayName;
                        const label = typeof displayName === 'string'
                            ? displayName
                            : (displayName?.UserLocalizedLabel?.Label || attribute.SchemaName || attribute.LogicalName);

                        return {
                            id: attribute.LogicalName,
                            label,
                            schemaName: attribute.SchemaName,
                            dataType,
                            options: buildFieldOptions(attribute, dataType),
                            targets,
                        };
                    })
                    .sort((left: QueryBuilderField, right: QueryBuilderField) => String(left.label).localeCompare(String(right.label), undefined, { sensitivity: 'base' }));

                if (!disposed && resolvedFields.length > 0) {
                    setAvailableFields(resolvedFields);
                }
            } catch (error) {
                console.error('[QueryBuilder] Error loading fields:', error);
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
    }, [props.entityName, props.fields]);

    React.useEffect(() => {
        props.onStateChange?.(builderState);
    }, [builderState, props.onStateChange]);

    // Debounce serialization to avoid recalculating on every keystroke
    React.useEffect(() => {
        if (!props.onSerializedChange) return;
        const timeout = setTimeout(() => {
            props.onSerializedChange?.(serializeQueryBuilderState(effectiveState, availableFields, props.entityName, entitySetName));
        }, 150);
        return () => clearTimeout(timeout);
    }, [availableFields, effectiveState, entitySetName, props.entityName, props.onSerializedChange]);

    React.useEffect(() => {
        const fallbackField = availableFields[0] || FALLBACK_FIELDS[0];

        if (!fallbackField) {
            return;
        }

        setBuilderState((previous) => {
            let hasChanges = false;

            const groups = previous.groups.map((group) => {
                const conditions = group.conditions.map((condition) => {
                    if (condition.kind === 'relatedEntity') {
                        return condition;
                    }

                    // Skip normalization for unknown fields — preserve original fieldId so it round-trips correctly
                    if (condition.isUnknownField && !availableFields.some((f) => f.id === condition.fieldId)) {
                        return condition;
                    }

                    const matchedField = availableFields.find((field) => field.id === condition.fieldId) || fallbackField;
                    const operators = getOperatorsForType(matchedField.dataType);
                    const nextOperator = operators.some((item) => item.value === condition.operator)
                        ? condition.operator
                        : (operators[0]?.value as any);

                    let nextValue = condition.value;
                    if (matchedField.dataType === 'optionset' && matchedField.options && matchedField.options.length > 0) {
                        const isValidOption = matchedField.options.some((item) => String(item.value) === String(condition.value ?? ''));
                        if (!isValidOption) {
                            nextValue = String(matchedField.options[0].value);
                        }
                    }
                    // Booleans have no empty state - an unset value would silently serialize as "No"
                    if (matchedField.dataType === 'boolean' && String(condition.value ?? '').trim() === '') {
                        nextValue = getDefaultValueForField(matchedField);
                    }

                    if (condition.fieldId !== matchedField.id || condition.operator !== nextOperator || condition.value !== nextValue) {
                        hasChanges = true;
                        return {
                            ...condition,
                            fieldId: matchedField.id,
                            operator: nextOperator,
                            value: nextValue,
                        };
                    }

                    return condition;
                });

                if (conditions !== group.conditions) {
                    return { ...group, conditions };
                }

                return group;
            });

            return hasChanges ? { groups } : previous;
        });
    }, [availableFields]);

    const updateGroup = React.useCallback((groupId: string, updater: (group: QueryBuilderGroup) => QueryBuilderGroup) => {
        setBuilderState((previous) => ({
            groups: previous.groups.map((group) => (group.id === groupId ? updater(group) : group)),
        }));
    }, []);

    const removeCondition = React.useCallback(
        (groupId: string, conditionId: string) => {
            updateGroup(groupId, (group) => {
                const remaining = group.conditions.filter((condition) => condition.id !== conditionId);
                return {
                    ...group,
                    conditions: remaining.length > 0 ? remaining : [createCondition(defaultField)],
                };
            });
        },
        [defaultField, updateGroup],
    );

    // Load metadata for a related entity and store fields in nestedFields
    const loadRelatedEntityFields = React.useCallback(
        async (groupId: string, conditionId: string, targetEntity: string) => {
            trace('[QueryBuilder] Loading related entity fields', { groupId, conditionId, targetEntity });
            
            try {
                let resolvedFields: QueryBuilderField[] = [];

                // Use callback if provided, otherwise use native Web API
                if (props.onFetchEntityFields) {
                    trace('[QueryBuilder] Using custom onFetchEntityFields callback');
                    resolvedFields = await props.onFetchEntityFields(targetEntity);
                } else {
                    // Use native Web API directly (same origin)
                    // Note: Cannot select Targets or expand OptionSet on base Attributes collection
                    const url = `/api/data/v9.2/EntityDefinitions(LogicalName='${targetEntity}')/Attributes?$select=LogicalName,SchemaName,DisplayName,AttributeType,AttributeTypeName`;
                    trace('[QueryBuilder] Fetching entity metadata', { url });
                    
                    const response = await fetch(url, {
                        headers: {
                            'OData-MaxVersion': '4.0',
                            'OData-Version': '4.0',
                            'Accept': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        // Try to get error details from response
                        let errorDetails: any = null;
                        try {
                            errorDetails = await response.json();
                        } catch {
                            // Ignore if response isn't JSON
                        }
                        
                        const errorMsg = `Failed to fetch entity metadata: ${response.status} ${response.statusText}`;
                        console.warn('[QueryBuilder]', errorMsg);
                        trace('[QueryBuilder] Metadata fetch failed', { 
                            status: response.status, 
                            statusText: response.statusText,
                            url,
                            targetEntity,
                            error: errorDetails?.error || errorDetails
                        });
                        
                        // Log specific error message if available
                        if (errorDetails?.error?.message) {
                            console.warn('[QueryBuilder] API Error:', errorDetails.error.message);
                            trace('[QueryBuilder] API Error Message', { message: errorDetails.error.message });
                        }
                        
                        return;
                    }

                    const data = await response.json();
                    const attributesArray = data.value || [];
                    trace('[QueryBuilder] Received attributes', { count: attributesArray.length });

                    if (attributesArray.length === 0) {
                        console.warn('[QueryBuilder] No attributes found for entity:', targetEntity);
                        trace('[QueryBuilder] No attributes found', { targetEntity });
                        return;
                    }

                    // Map attributes to fields
                    const fieldsWithoutOptions = attributesArray
                        .filter((attr: any) => {
                            if (!attr?.LogicalName) return false;
                            const attrType = attr.AttributeType || attr.AttributeTypeName?.Value;
                            if (attrType === 'Virtual' || attrType === 'CalendarRules') return false;
                            if (attrType === 'Uniqueidentifier' && !attr.LogicalName.endsWith('id')) return false;
                            return true;
                        })
                        .map((attr: any) => {
                            const dataType = dataTypeFromAttribute(attr);
                            const displayName = attr.DisplayName;
                            const label = typeof displayName === 'string'
                                ? displayName
                                : (displayName?.UserLocalizedLabel?.Label || attr.SchemaName || attr.LogicalName);

                            return {
                                id: attr.LogicalName,
                                label,
                                schemaName: attr.SchemaName,
                                dataType,
                                // Store raw attribute for metadata fetching
                                _raw: attr,
                            };
                        });

                    // Enrich lookup fields with target metadata
                    await enrichLookupFields(fieldsWithoutOptions, targetEntity, trace);
                    
                    // Enrich optionset fields with option values
                    await enrichOptionsetFields(fieldsWithoutOptions, targetEntity, trace);
                    
                    // Remove _raw property before returning
                    resolvedFields = fieldsWithoutOptions.map((f: any) => {
                        const { _raw, ...field } = f;
                        return field;
                    }).sort((a: QueryBuilderField, b: QueryBuilderField) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
                    
                    trace('[QueryBuilder] Resolved fields', { 
                        count: resolvedFields.length,
                        fields: resolvedFields.map(f => ({ id: f.id, dataType: f.dataType, hasOptions: !!f.options }))
                    });
                }

                if (resolvedFields.length > 0) {
                    // Auto-add a default condition if none exist
                    const defaultCondition = createCondition(resolvedFields[0]);
                    trace('[QueryBuilder] Creating default nested condition', { 
                        field: resolvedFields[0].id,
                        dataType: resolvedFields[0].dataType,
                        hasOptions: !!resolvedFields[0].options
                    });

                    updateGroup(groupId, (group) => ({
                        ...group,
                        conditions: group.conditions.map((cond) =>
                            cond.id === conditionId
                                ? {
                                    ...cond,
                                    nestedFields: resolvedFields,
                                    nestedConditions: (!cond.nestedConditions || cond.nestedConditions.length === 0)
                                        ? [defaultCondition]
                                        : cond.nestedConditions,
                                }
                                : cond
                        ),
                    }));
                } else {
                    console.warn('[QueryBuilder] No valid fields resolved for entity:', targetEntity);
                    trace('[QueryBuilder] No valid fields resolved', { targetEntity });
                }
            } catch (error) {
                console.error('[QueryBuilder] Error loading related entity fields:', error);
                trace('[QueryBuilder] Exception in loadRelatedEntityFields', { 
                    targetEntity,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
            }
        },
        [props.onFetchEntityFields, updateGroup, trace],
    );

    // Add a nested condition to a related entity
    const addNestedCondition = React.useCallback(
        (groupId: string, conditionId: string, nestedFields: QueryBuilderField[]) => {
            const nestedDefault = nestedFields[0] || defaultField;
            const newCondition = createCondition(nestedDefault);

            updateGroup(groupId, (group) => ({
                ...group,
                conditions: group.conditions.map((cond) =>
                    cond.id === conditionId
                        ? { ...cond, nestedConditions: [...(cond.nestedConditions || []), newCondition] }
                        : cond
                ),
            }));
        },
        [defaultField, updateGroup],
    );

    // Remove a nested condition from a related entity
    const removeNestedCondition = React.useCallback(
        (groupId: string, conditionId: string, nestedConditionId: string) => {
            updateGroup(groupId, (group) => ({
                ...group,
                conditions: group.conditions.map((cond) =>
                    cond.id === conditionId
                        ? { ...cond, nestedConditions: (cond.nestedConditions || []).filter((nc) => nc.id !== nestedConditionId) }
                        : cond
                ),
            }));
        },
        [updateGroup],
    );

    // Update a nested condition within a related entity
    const updateNestedCondition = React.useCallback(
        (groupId: string, conditionId: string, nestedConditionId: string, updater: (nc: QueryBuilderCondition) => QueryBuilderCondition) => {
            updateGroup(groupId, (group) => ({
                ...group,
                conditions: group.conditions.map((cond) =>
                    cond.id === conditionId
                        ? {
                            ...cond,
                            nestedConditions: (cond.nestedConditions || []).map((nc) =>
                                nc.id === nestedConditionId ? updater(nc) : nc
                            ),
                        }
                        : cond
                ),
            }));
        },
        [updateGroup],
    );

    const addItem = React.useCallback((action: 'group' | 'related') => {
        setBuilderState((previous) => {
            if (action === 'group') {
                if (props.allowGroups === false) {
                    return previous;
                }
                return { groups: [...previous.groups, createGroup(defaultField)] };
            }

            if (action === 'related') {
                if (props.allowRelatedEntity === false) {
                    return previous;
                }

                const firstRelated = computedRelatedEntities[0];
                const relatedGroup = createGroup(defaultField);
                relatedGroup.conditions = [createRelatedCondition(firstRelated?.id, firstRelated?.targetEntity)];

                return {
                    groups: [...previous.groups, relatedGroup],
                };
            }

            return previous;
        });
    }, [computedRelatedEntities, defaultField, props.allowGroups, props.allowRelatedEntity]);

    // Auto-load fields for related entity conditions that have a relatedEntityName but no nestedFields
    // Also ensure relatedEntityTarget is set for existing conditions
    React.useEffect(() => {
        for (const group of builderState.groups) {
            for (const condition of group.conditions) {
                if (
                    condition.kind === 'relatedEntity' &&
                    condition.relatedEntityName
                ) {
                    // Find the related entity to get targetEntity
                    const related = computedRelatedEntities.find(r => r.id === condition.relatedEntityName);

                    // Backfill target metadata for conditions restored from FetchXML or initialState
                    const needsTarget = !!related?.targetEntity && !condition.relatedEntityTarget;
                    const needsPrimaryId = !!related?.targetPrimaryIdAttribute && !condition.relatedEntityPrimaryId;
                    if (needsTarget || needsPrimaryId) {
                        updateGroup(group.id, (current) => ({
                            ...current,
                            conditions: current.conditions.map((c) =>
                                c.id === condition.id
                                    ? {
                                        ...c,
                                        relatedEntityTarget: related?.targetEntity ?? c.relatedEntityTarget,
                                        relatedEntityPrimaryId: related?.targetPrimaryIdAttribute ?? c.relatedEntityPrimaryId,
                                        fieldId: condition.relatedEntityName || c.fieldId,
                                    }
                                    : c
                            ),
                        }));
                    }

                    // Load fields if not loaded
                    if (related?.targetEntity && (!condition.nestedFields || condition.nestedFields.length === 0)) {
                        loadRelatedEntityFields(group.id, condition.id, related.targetEntity);
                    }
                }
            }
        }
    }, [builderState.groups, computedRelatedEntities, loadRelatedEntityFields, updateGroup]);

    const addRowToGroup = React.useCallback(
        (groupId: string) => {
            updateGroup(groupId, (current) => ({
                ...current,
                conditions: [...current.conditions, createCondition(defaultField)],
            }));
        },
        [defaultField, updateGroup],
    );

    const onReset = React.useCallback(() => {
        const nextState = cloneState(props.defaultState, defaultField);
        setBuilderState(nextState);
        props.onResetToDefault?.(nextState);
    }, [defaultField, props]);

    const onDeleteAll = React.useCallback(() => {
        const resetState: QueryBuilderState = { groups: [createGroup(defaultField)] };
        setBuilderState(resetState);
        props.onDeleteAllFilters?.();
    }, [defaultField, props]);

    const onDownloadFetchXml = React.useCallback(() => {
        const payload = serializeQueryBuilderState(effectiveState, availableFields, props.entityName, entitySetName);
        const blob = new Blob([payload.fetchXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${props.entityName}-filters.xml`;
        anchor.click();
        URL.revokeObjectURL(url);
    }, [availableFields, builderState, entitySetName, props.entityName]);

    // Preview visibility is toggleable from the toolbar; the props seed the initial state
    const [odataPreviewVisible, setODataPreviewVisible] = React.useState(props.showODataPreview ?? false);
    const [fetchXmlPreviewVisible, setFetchXmlPreviewVisible] = React.useState(props.showFetchXmlPreview ?? false);

    React.useEffect(() => {
        if (props.showODataPreview !== undefined) setODataPreviewVisible(props.showODataPreview);
    }, [props.showODataPreview]);

    React.useEffect(() => {
        if (props.showFetchXmlPreview !== undefined) setFetchXmlPreviewVisible(props.showFetchXmlPreview);
    }, [props.showFetchXmlPreview]);

    const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
    const [xmlDialogMode, setXmlDialogMode] = React.useState<'import' | 'edit'>('import');
    const [uploadXmlText, setUploadXmlText] = React.useState('');
    const [uploadError, setUploadError] = React.useState<string | null>(null);

    const [validationDialogOpen, setValidationDialogOpen] = React.useState(false);
    const [validationResult, setValidationResult] = React.useState<QueryBuilderValidationResult | null>(null);
    const [apiValidating, setApiValidating] = React.useState(false);
    const invalidConditionIds = React.useMemo(() => {
        if (!validationResult) return new Set<string>();
        return new Set(validationResult.errors.map((e) => e.conditionId).filter(Boolean));
    }, [validationResult]);

    const onValidate = React.useCallback(async () => {
        const result = validateQueryBuilderState(builderState, availableFields);

        // If local validation failed, don't test API
        if (!result.isValid) {
            result.apiValidation = {
                available: true,
                tested: false,
            };
            setValidationResult(result);
            setValidationDialogOpen(true);
            return;
        }

        // Test against Web API directly
        setApiValidating(true);
        setValidationResult(result);
        setValidationDialogOpen(true);

        try {
            const { odataFilter } = serializeQueryBuilderState(effectiveState, availableFields, props.entityName, entitySetName);
            const entitySetForApi = entitySetName || props.entityName;
            const queryOptions = odataFilter ? `$filter=${odataFilter}&$top=1&$count=true` : '$top=1&$count=true';

            const response = await fetch(`/api/data/v9.2/${entitySetForApi}?${queryOptions}`, {
                headers: {
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Accept': 'application/json',
                    'Prefer': 'odata.include-annotations="*"',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP ${response.status}`);
            }

            const data = await response.json();

            setValidationResult({
                ...result,
                apiValidation: {
                    available: true,
                    tested: true,
                    success: true,
                    recordCount: data['@odata.count'] ?? data.value?.length ?? 0,
                },
            });
        } catch (err: any) {
            setValidationResult({
                ...result,
                apiValidation: {
                    available: true,
                    tested: true,
                    success: false,
                    errorMessage: err?.message || 'Unknown API error',
                },
            });
        } finally {
            setApiValidating(false);
        }
    }, [builderState, availableFields, entitySetName, props.entityName]);

    /**
     * Open the FetchXML dialog.
     *
     * "import" starts empty for pasting in a query from elsewhere; "edit" starts from the
     * query currently in the builder so it can be tweaked or overwritten in place.
     */
    const openXmlDialog = React.useCallback((mode: 'import' | 'edit', initialXml: string) => {
        setXmlDialogMode(mode);
        setUploadXmlText(initialXml);
        setUploadError(null);
        setUploadDialogOpen(true);
    }, []);

    const onApplyUploadedXml = React.useCallback(() => {
        const result = parseFetchXmlToState(uploadXmlText, availableFields);
        if (result.state) {
            setBuilderState(result.state);
            setUploadDialogOpen(false);
            setUploadError(null);
            trace('[QueryBuilder] Applied FetchXML from dialog', { mode: xmlDialogMode });
        } else {
            setUploadError(result.error || 'Invalid FetchXML.');
        }
    }, [uploadXmlText, availableFields, trace, xmlDialogMode]);

    const serialized = serializeQueryBuilderState(effectiveState, availableFields, props.entityName, entitySetName);

    const renderValueInput = React.useCallback(
        (
            field: QueryBuilderField,
            condition: QueryBuilderCondition,
            isNullOperator: boolean,
            onValueChange: (value: string | number | boolean | (string | number)[], displayName?: string) => void,
        ) => {
            // If we have valueDisplayName but field type is not detected as lookup,
            // still render as lookup (this happens when parsing FetchXML where field metadata isn't loaded yet)
            const hasLookupDisplayName = condition.valueDisplayName && condition.valueDisplayName.trim() !== '';
            const shouldRenderAsLookup = field.dataType === 'lookup' || hasLookupDisplayName;

            // Free-text fallback, also used when a choice field's options failed to load so the
            // condition stays editable instead of rendering an empty cell
            const renderFreeTextInput = (type: 'text' | 'number' = 'text') => (
                <Input
                    className={styles.compactControl}
                    size="small"
                    appearance={fieldAppearance}
                    aria-label="Value"
                    type={type}
                    value={String(condition.value ?? '')}
                    onChange={(_, data) => onValueChange(data.value)}
                    disabled={isNullOperator}
                    placeholder="Value"
                />
            );

            if (shouldRenderAsLookup) {
                return (
                    <LookupValueInput
                        fieldId={condition.fieldId}
                        value={String(condition.value ?? '')}
                        displayName={condition.valueDisplayName ?? ''}
                        disabled={isNullOperator}
                        targets={field.targets}
                        onLookupSearch={props.onLookupSearch}
                        onValueChange={(value, displayName) => onValueChange(value, displayName)}
                        appearance={fieldAppearance}
                    />
                );
            }

            // Some operators dictate the input regardless of the field type: "Last X Days" on a
            // date column takes a count, and fiscal period/year operators take a number
            const operatorValueType = getOperatorValueType(condition.operator);
            if (operatorValueType === 'number') return renderFreeTextInput('number');

            switch (field.dataType) {
                case 'optionset': {
                    // Options can be missing when metadata failed to load or the consumer supplied
                    // the field without them - fall back to raw entry rather than an unusable cell
                    if (!field.options || field.options.length === 0) return renderFreeTextInput();

                    const isMultiSelect = condition.operator === 'in' || condition.operator === 'not-in';

                    if (isMultiSelect) {
                        // Multi-select mode for in/not-in operators
                        const currentValues: (string | number)[] = Array.isArray(condition.value)
                            ? condition.value
                            : (condition.value !== undefined && condition.value !== null && String(condition.value) !== ''
                                ? [condition.value as string | number]
                                : []);

                        const selectedLabels = currentValues
                            .map(v => field.options!.find(opt => String(opt.value) === String(v))?.label)
                            .filter(Boolean)
                            .join(', ') || 'Select values...';

                        return (
                            <Dropdown
                                className={styles.compactControl}
                                size="small"
                                appearance={listboxAppearance}
                                aria-label="Value"
                                listbox={{ className: styles.optionsetListbox }}
                                multiselect
                                selectedOptions={currentValues.map(v => String(v))}
                                value={selectedLabels}
                                disabled={isNullOperator}
                                onOptionSelect={(_, data) => {
                                    const newValues = data.selectedOptions.map(v => {
                                        // Try to preserve number type if original was number
                                        const opt = field.options!.find(o => String(o.value) === v);
                                        return opt ? opt.value : v;
                                    });
                                    onValueChange(newValues as (string | number)[]);
                                }}
                            >
                                {field.options.map((option) => (
                                    <Option key={String(option.value)} value={String(option.value)}>
                                        {option.label}
                                    </Option>
                                ))}
                            </Dropdown>
                        );
                    }

                    // Single-select mode for eq/ne operators
                    return (
                        <Dropdown
                            className={styles.compactControl}
                            size="small"
                            appearance={listboxAppearance}
                            aria-label="Value"
                            listbox={{ className: styles.optionsetListbox }}
                            selectedOptions={[
                                condition.value !== undefined && condition.value !== null && String(condition.value) !== ''
                                    ? String(condition.value)
                                    : String(field.options[0]?.value ?? '')
                            ]}
                            value={
                                field.options.find(opt => String(opt.value) === String(condition.value))?.label
                                || field.options[0]?.label
                                || ''
                            }
                            disabled={isNullOperator}
                            onOptionSelect={(_, data) => onValueChange(data.optionValue ?? String(condition.value ?? ''))}
                        >
                            {field.options.map((option) => (
                                <Option key={String(option.value)} value={String(option.value)}>
                                    {option.label}
                                </Option>
                            ))}
                        </Dropdown>
                    );
                }

                case 'datetime':
                    return (
                        <DatePicker
                            className={styles.compactControl}
                            size="small"
                            appearance={fieldAppearance}
                            aria-label="Value"
                            value={condition.value ? new Date(String(condition.value)) : null}
                            onSelectDate={(date) => onValueChange(formatDateOnly(date))}
                            disabled={isNullOperator}
                            placeholder="Select date..."
                        />
                    );

                case 'boolean': {
                    // Two-option fields carry their own labels in Dynamics (e.g. "Allowed"/"Not Allowed"),
                    // so prefer the metadata labels and only fall back to Yes/No
                    const booleanOptions = field.options && field.options.length > 0
                        ? field.options
                        : DEFAULT_BOOLEAN_OPTIONS;

                    // Match on truthiness, not string equality - the stored value may be '1', 'true' or true
                    const selectedOption =
                        booleanOptions.find((option) => isTrueValue(option.value) === isTrueValue(condition.value))
                        ?? booleanOptions[0];

                    return (
                        <Dropdown
                            className={styles.compactControl}
                            size="small"
                            appearance={listboxAppearance}
                            aria-label="Value"
                            selectedOptions={[String(selectedOption.value)]}
                            value={selectedOption.label}
                            disabled={isNullOperator}
                            onOptionSelect={(_, data) => onValueChange(data.optionValue ?? String(selectedOption.value))}
                        >
                            {booleanOptions.map((option) => (
                                <Option key={String(option.value)} value={String(option.value)}>
                                    {option.label}
                                </Option>
                            ))}
                        </Dropdown>
                    );
                }

                case 'number':
                    return renderFreeTextInput('number');

                default: // 'string' and any other types
                    return renderFreeTextInput();
            }
        },
        [styles.compactControl, styles.optionsetListbox, props.onLookupSearch],
    );

    const renderRowActions = React.useCallback(
        (onDelete: () => void) => (
            <Menu positioning="below-end">
                <MenuTrigger disableButtonEnhancement>
                    <Button size="small" appearance="outline" icon={<MoreHorizontalRegular />} aria-label="Row options" />
                </MenuTrigger>
                <MenuPopover>
                    <MenuList>
                        <MenuItem icon={<DeleteRegular />} onClick={onDelete}>
                            Delete
                        </MenuItem>
                        <MenuItem disabled>Make group</MenuItem>
                    </MenuList>
                </MenuPopover>
            </Menu>
        ),
        [],
    );

    return (
        <div className={styles.container}>
            <div className={styles.headerRow}>
                <Text weight="semibold" className={styles.headerTitle}>
                    Query Builder: {props.entityDisplayName || props.entityName}
                </Text>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.toolbarGroup}>
                    {props.showResetToDefaultButton !== false && (
                        <Button
                            size="small"
                            appearance="transparent"
                            icon={<ArrowResetRegular />}
                            onClick={onReset}
                        >
                            Reset to default
                        </Button>
                    )}
                    {props.showDownloadFetchXmlButton !== false && (
                        <Button
                            size="small"
                            appearance="transparent"
                            icon={<ArrowDownloadRegular />}
                            onClick={onDownloadFetchXml}
                        >
                            Download FetchXML
                        </Button>
                    )}
                    {props.showUploadFetchXmlButton !== false && (
                        <Button
                            size="small"
                            appearance="transparent"
                            icon={<ArrowUploadRegular />}
                            onClick={() => openXmlDialog('import', '')}
                            title="Paste in FetchXML from elsewhere to rebuild the query"
                        >
                            Import FetchXML
                        </Button>
                    )}
                    {props.showEditFetchXmlButton !== false && (
                        <Button
                            size="small"
                            appearance="transparent"
                            icon={<EditRegular />}
                            onClick={() => openXmlDialog('edit', serialized.fetchXml ? prettyPrintXml(serialized.fetchXml) : '')}
                            title="View and edit the FetchXML for the current query"
                        >
                            Edit FetchXML
                        </Button>
                    )}
                    {props.showPreviewToggleButtons !== false && (
                        <>
                            <Button
                                size="small"
                                appearance={odataPreviewVisible ? 'secondary' : 'transparent'}
                                icon={odataPreviewVisible ? <EyeOffRegular /> : <EyeRegular />}
                                onClick={() => setODataPreviewVisible((visible) => !visible)}
                            >
                                {odataPreviewVisible ? 'Hide OData' : 'Show OData'}
                            </Button>
                            <Button
                                size="small"
                                appearance={fetchXmlPreviewVisible ? 'secondary' : 'transparent'}
                                icon={fetchXmlPreviewVisible ? <EyeOffRegular /> : <EyeRegular />}
                                onClick={() => setFetchXmlPreviewVisible((visible) => !visible)}
                            >
                                {fetchXmlPreviewVisible ? 'Hide FetchXML' : 'Show FetchXML'}
                            </Button>
                        </>
                    )}

                    <Dialog open={uploadDialogOpen} onOpenChange={(_, data) => setUploadDialogOpen(data.open)}>
                        <DialogSurface className={styles.dialogSurfaceNarrow}>
                            <DialogBody>
                                <DialogTitle>
                                    {xmlDialogMode === 'edit' ? 'Edit FetchXML' : 'Import FetchXML'}
                                </DialogTitle>
                                <DialogContent className={styles.dialogUploadContent}>
                                    <Text>
                                        {xmlDialogMode === 'edit'
                                            ? 'This is the FetchXML for the current query. Edit it, or paste a different query over it — applying rebuilds the builder from what is below.'
                                            : 'Paste your FetchXML below to rebuild the query:'}
                                    </Text>
                                    <Textarea
                                        placeholder="<fetch><entity name='account'><filter>...</filter></entity></fetch>"
                                        value={uploadXmlText}
                                        onChange={(_, data) => setUploadXmlText(data.value)}
                                        // Textarea has no underline variant, so that one falls back to outline
                                        appearance={toTextareaAppearance(fieldAppearance)}
                                        className={styles.monacoTextarea}
                                        resize="vertical"
                                    />
                                    {uploadError && (
                                        <Text className={styles.uploadErrorText}>{uploadError}</Text>
                                    )}
                                </DialogContent>
                                <DialogActions>
                                    {xmlDialogMode === 'edit' && (
                                        <Button
                                            appearance="subtle"
                                            icon={<CopyRegular />}
                                            onClick={() => navigator.clipboard.writeText(uploadXmlText)}
                                            title="Copy to clipboard"
                                        >
                                            Copy
                                        </Button>
                                    )}
                                    <DialogTrigger disableButtonEnhancement>
                                        <Button appearance="secondary">Cancel</Button>
                                    </DialogTrigger>
                                    <Button appearance="primary" onClick={onApplyUploadedXml} disabled={!uploadXmlText.trim()}>
                                        Apply
                                    </Button>
                                </DialogActions>
                            </DialogBody>
                        </DialogSurface>
                    </Dialog>
                    {props.showValidateButton !== false && (
                        <Button
                            size="small"
                            appearance="transparent"
                            icon={<CheckmarkCircleRegular />}
                            onClick={onValidate}
                        >
                            Validate
                        </Button>
                    )}

                    <Dialog open={validationDialogOpen} onOpenChange={(_, data) => setValidationDialogOpen(data.open)}>
                        <DialogSurface className={styles.dialogSurfaceCompact}>
                            <DialogBody>
                                <DialogTitle>Query Validation</DialogTitle>
                                <DialogContent className={styles.dialogValidationContent}>
                                    {/* Local Validation Section */}
                                    <div>
                                        <Text weight="semibold" className={styles.validationSectionTitle}>
                                            {validationResult?.isValid ? (
                                                <span className={styles.validationSuccess}>
                                                    <CheckmarkCircleRegular className={styles.validationIcon} />
                                                    Query Structure: Valid
                                                </span>
                                            ) : (
                                                <span className={styles.validationError}>
                                                    <WarningRegular className={styles.validationIcon} />
                                                    Query Structure: Errors Found
                                                </span>
                                            )}
                                        </Text>
                                        {!validationResult?.isValid && (
                                            <ul className={styles.validationErrorList}>
                                                {validationResult?.errors.map((error, idx) => (
                                                    <li key={idx} className={styles.validationErrorItem}>
                                                        <strong>{error.fieldLabel}:</strong> {error.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* API Validation Section */}
                                    <div className={styles.apiValidationSection}>
                                        <Text weight="semibold" className={styles.validationSectionTitle}>
                                            Dynamics 365 API Test
                                        </Text>
                                        {!validationResult?.apiValidation?.available ? (
                                            <Text className={styles.apiUnavailable}>
                                                API validation unavailable — not running in Dynamics 365 environment.
                                            </Text>
                                        ) : !validationResult?.isValid ? (
                                            <Text className={styles.apiUnavailable}>
                                                Fix query structure errors before testing against the API.
                                            </Text>
                                        ) : apiValidating ? (
                                            <div className={styles.validationApiRow}>
                                                <Spinner size="tiny" />
                                                <Text>Testing query against Dynamics 365...</Text>
                                            </div>
                                        ) : validationResult?.apiValidation?.tested ? (
                                            validationResult.apiValidation.success ? (
                                                <Text className={styles.validationSuccess}>
                                                    <CheckmarkCircleRegular className={styles.validationIcon} />
                                                    Query executed successfully. {validationResult.apiValidation.recordCount ?? 0} record(s) would match.
                                                </Text>
                                            ) : (
                                                <Text className={styles.validationError}>
                                                    <WarningRegular className={styles.validationIcon} />
                                                    API Error: {validationResult.apiValidation.errorMessage}
                                                </Text>
                                            )
                                        ) : (
                                            <Text className={styles.apiUnavailable}>Waiting for validation...</Text>
                                        )}
                                    </div>
                                </DialogContent>
                                <DialogActions>
                                    <DialogTrigger disableButtonEnhancement>
                                        <Button appearance="primary">OK</Button>
                                    </DialogTrigger>
                                </DialogActions>
                            </DialogBody>
                        </DialogSurface>
                    </Dialog>
                    {props.showDeleteAllFiltersButton !== false && (
                        <Button
                            size="small"
                            appearance="transparent"
                            icon={<DeleteRegular />}
                            onClick={onDeleteAll}
                        >
                            Delete all filters
                        </Button>
                    )}
                </div>
            </div>

            <div className={styles.scrollArea}>
            {loading ? (
                <div className={styles.loadingWrap}>
                    <Spinner label="Loading fields..." />
                </div>
            ) : (
                <div className={styles.groupsContainer}>
                    <div className={styles.rootLogicRow}>
                        <Combobox className={styles.rootLogicSelect} size="small" appearance={listboxAppearance} value="AND" disabled>
                            <Option value="AND">AND</Option>
                        </Combobox>
                    </div>
                    {builderState.groups.map((group, groupIndex) => {
                        // between, not-between and the fiscal period-and-year operators all take a second value
                        const hasBetweenOperator = group.conditions.some((c) => operatorRequiresValue2(c.operator));
                        const headerRowClass = mergeClasses(
                            styles.columnHeaderRow,
                            hasBetweenOperator && styles.columnHeaderRowWithBetween,
                        );
                        const rowGridClass = mergeClasses(
                            styles.rowGrid,
                            hasBetweenOperator && styles.rowGridWithBetween,
                        );
                        const isLastGroup = groupIndex === builderState.groups.length - 1;
                        // Hide group logic dropdown when the only condition is a related entity
                        const isOnlySingleRelatedEntity = group.conditions.length === 1 && group.conditions[0].kind === 'relatedEntity';
                        const showGroupLogic = !isOnlySingleRelatedEntity;

                        return (
                            <div className={styles.groupTreeRow} key={group.id}>
                                {/* Tree connector column */}
                                <div className={mergeClasses(styles.treeConnector, isLastGroup && styles.treeConnectorLast)}>
                                    <div className={styles.treeConnectorLine} />
                                    <div className={styles.treeConnectorBranch} />
                                </div>

                                {/* Group card */}
                                <div className={styles.groupCard} role="grid" aria-label={`Filter group ${groupIndex + 1}`}>
                                    <div className={styles.groupHeader}>
                                        <div className={styles.groupHeaderLeft}>
                                            {showGroupLogic && (
                                                <Combobox
                                                    className={styles.groupLogicSelect}
                                                    size="small"
                                                    appearance={listboxAppearance}
                                                    selectedOptions={[group.logic]}
                                                    value={group.logic === 'or' ? 'OR' : 'AND'}
                                                    aria-label="Group logic"
                                                    onOptionSelect={(_, data) =>
                                                        updateGroup(group.id, (current) => ({
                                                            ...current,
                                                            logic: data.optionValue === 'or' ? 'or' : 'and',
                                                        }))
                                                    }
                                                >
                                                    <Option value="and">AND</Option>
                                                    <Option value="or">OR</Option>
                                                </Combobox>
                                            )}
                                        </div>

                                        <div className={styles.groupHeaderRight}>
                                            {props.allowGroups !== false && builderState.groups.length > 1 && (
                                                <Button
                                                    size="small"
                                                    appearance="subtle"
                                                    icon={<DismissRegular />}
                                                    aria-label="Remove group"
                                                    onClick={() =>
                                                        setBuilderState((previous) => ({
                                                            groups: previous.groups.filter((candidate) => candidate.id !== group.id),
                                                        }))
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className={headerRowClass} role="row" aria-hidden="true">
                                        <span className={styles.headerField}>Field</span>
                                        <span className={styles.headerOperator}>Operator</span>
                                        <span className={styles.headerValue}>Value</span>
                                        {hasBetweenOperator && <span className={styles.headerAnd}>And</span>}
                                        <span className={styles.headerRemove} />
                                    </div>

                                    <div className={styles.conditionsList}>
                                        {group.conditions.map((condition, conditionIndex) => {
                                            const isLastCondition = conditionIndex === group.conditions.length - 1;
                                            const connectorClass = mergeClasses(
                                                styles.conditionConnector,
                                                isLastCondition && styles.conditionConnectorLast,
                                            );

                                            if (condition.kind === 'relatedEntity') {
                                                const relatedEntityRowClass = mergeClasses(
                                                    styles.conditionTreeRow,
                                                    invalidConditionIds.has(condition.id) && styles.conditionInvalid,
                                                );
                                                const selectedRelated = computedRelatedEntities.find(r => r.id === condition.relatedEntityName);
                                                const nestedFields = condition.nestedFields || [];
                                                const nestedConditions = condition.nestedConditions || [];
                                                const nestedDefaultField = nestedFields[0] || defaultField;

                                                // Handler to select related entity and load its fields
                                                const handleRelatedEntitySelect = (_: any, data: { optionValue?: string }) => {
                                                    const relatedId = data.optionValue;
                                                    const related = computedRelatedEntities.find(r => r.id === relatedId);

                                                    updateGroup(group.id, (current) => ({
                                                        ...current,
                                                        conditions: current.conditions.map((row) =>
                                                            row.id === condition.id
                                                                ? {
                                                                    ...row,
                                                                    relatedEntityName: relatedId,
                                                                    relatedEntityTarget: related?.targetEntity,
                                                                    relatedEntityPrimaryId: related?.targetPrimaryIdAttribute,
                                                                    fieldId: relatedId || '__related_entity__',
                                                                    nestedConditions: [],
                                                                    nestedFields: [],
                                                                }
                                                                : row,
                                                        ),
                                                    }));

                                                    // Load fields for the related entity
                                                    if (related?.targetEntity) {
                                                        loadRelatedEntityFields(group.id, condition.id, related.targetEntity);
                                                    }
                                                };

                                                return (
                                                    <div className={relatedEntityRowClass} key={condition.id}>
                                                        <div className={connectorClass}>
                                                            <div className={styles.conditionConnectorLine} />
                                                            <div className={styles.conditionConnectorBranch} />
                                                        </div>
                                                        <div className={styles.relatedEntityCard}>
                                                            <div className={styles.relatedEntityHeader}>
                                                                <Text className={styles.relatedEntityLabel}>Related:</Text>
                                                                <Button
                                                                    size="small"
                                                                    appearance="subtle"
                                                                    icon={<DismissRegular />}
                                                                    aria-label="Remove related entity"
                                                                    onClick={() => removeCondition(group.id, condition.id)}
                                                                />
                                                            </div>
                                                            <Dropdown
                                                                className={styles.relatedEntityDropdown}
                                                                size="small"
                                                                appearance={listboxAppearance}
                                                                aria-label="Related entity"
                                                                listbox={{ className: styles.optionsetListbox }}
                                                                selectedOptions={condition.relatedEntityName ? [condition.relatedEntityName] : []}
                                                                value={selectedRelated?.label || 'Select related entity...'}
                                                                onOptionSelect={handleRelatedEntitySelect}
                                                            >
                                                                {computedRelatedEntities.length > 0 ? (
                                                                    computedRelatedEntities.map((related) => (
                                                                        <Option key={related.id} value={related.id}>
                                                                            {related.label}
                                                                        </Option>
                                                                    ))
                                                                ) : (
                                                                    <Option value="">No related entities available</Option>
                                                                )}
                                                            </Dropdown>
                                                            {nestedConditions.length > 1 && (
                                                                <Combobox
                                                                    size="small"
                                                                    appearance={listboxAppearance}
                                                                    className={styles.nestedLogicDropdown}
                                                                    selectedOptions={[condition.nestedLogic || 'and']}
                                                                    value={condition.nestedLogic === 'or' ? 'OR' : 'AND'}
                                                                    aria-label="Nested logic"
                                                                    onOptionSelect={(_, data) =>
                                                                        updateGroup(group.id, (current) => ({
                                                                            ...current,
                                                                            conditions: current.conditions.map((row) =>
                                                                                row.id === condition.id
                                                                                    ? { ...row, nestedLogic: data.optionValue === 'or' ? 'or' : 'and' }
                                                                                    : row,
                                                                            ),
                                                                        }))
                                                                    }
                                                                >
                                                                    <Option value="and">AND</Option>
                                                                    <Option value="or">OR</Option>
                                                                </Combobox>
                                                            )}

                                                            {/* Nested conditions for the related entity */}
                                                            {/* Show if: we have fields loaded, OR we have existing conditions (from parsed FetchXML) */}
                                                            {selectedRelated && (nestedFields.length > 0 || nestedConditions.length > 0) && (
                                                                <div className={styles.relatedEntityConditions}>
                                                                    {/* Column headers for nested conditions */}
                                                                    <div className={styles.nestedConditionHeader}>
                                                                        <span>Field</span>
                                                                        <span>Operator</span>
                                                                        <span>Value</span>
                                                                        <span />
                                                                    </div>

                                                                    {nestedConditions.map((nestedCond) => {
                                                                        const nestedField = nestedFields.find(f => f.id === nestedCond.fieldId) || nestedDefaultField;
                                                                        const nestedOperators = getOperatorsForType(nestedField.dataType);
                                                                        const isNestedNullOp = !operatorRequiresValue(nestedCond.operator);

                                                                        // Build lookup options for nested field selector using same format as main field selector
                                                                        const formatDataType = (dataType: QueryBuilderField['dataType']): string => {
                                                                            const labels: Record<QueryBuilderField['dataType'], string> = {
                                                                                string: 'Text',
                                                                                number: 'Number',
                                                                                datetime: 'Date/Time',
                                                                                boolean: 'Yes/No',
                                                                                optionset: 'Choice',
                                                                                lookup: 'Lookup',
                                                                            };
                                                                            return labels[dataType] || dataType;
                                                                        };

                                                                        const nestedFieldLookupOptions: LookupOption[] = nestedFields.map((f) => ({
                                                                            key: f.id,
                                                                            text: f.label,
                                                                            details: [
                                                                                { label: 'Logical Name', value: f.id },
                                                                                ...(f.schemaName ? [{ label: 'Schema Name', value: f.schemaName }] : []),
                                                                                { label: 'Type', value: formatDataType(f.dataType) },
                                                                            ],
                                                                            data: f,
                                                                        }));

                                                                        return (
                                                                            <div key={nestedCond.id} className={styles.nestedConditionRow}>
                                                                                <Lookup
                                                                                    className={styles.compactControl}
                                                                                    size="small"
                                                                                    appearance={fieldAppearance}
                                                                                    aria-label="Field"
                                                                                    options={nestedFieldLookupOptions}
                                                                                    selectedKey={nestedCond.fieldId}
                                                                                    clearable={false}
                                                                                    placeholder="Select field..."
                                                                                    onOptionSelect={(option) => {
                                                                                        if (!option) return;
                                                                                        const newField = (option.data as QueryBuilderField) || nestedFields.find(f => f.id === option.key) || nestedDefaultField;
                                                                                        updateNestedCondition(group.id, condition.id, nestedCond.id, (nc) => ({
                                                                                            ...nc,
                                                                                            fieldId: newField.id,
                                                                                            operator: getOperatorsForType(newField.dataType)[0].value as any,
                                                                                            value: getDefaultValueForField(newField),
                                                                                        }));
                                                                                    }}
                                                                                />

                                                                                <Dropdown
                                                                                    className={styles.compactControl}
                                                                                    size="small"
                                                                                    appearance={listboxAppearance}
                                                                                    aria-label="Operator"
                                                                                    selectedOptions={[nestedCond.operator]}
                                                                                    value={nestedOperators.find(op => op.value === nestedCond.operator)?.label || ''}
                                                                                    onOptionSelect={(_, data) =>
                                                                                        updateNestedCondition(group.id, condition.id, nestedCond.id, (nc) => ({
                                                                                            ...nc,
                                                                                            operator: (data.optionValue as any) || nc.operator,
                                                                                        }))
                                                                                    }
                                                                                >
                                                                                    {nestedOperators.map(op => (
                                                                                        <Option key={op.value} value={op.value}>{op.label}</Option>
                                                                                    ))}
                                                                                </Dropdown>

                                                                                {renderValueInput(nestedField, nestedCond, isNestedNullOp, (value, displayName) => {
                                                                                    updateNestedCondition(group.id, condition.id, nestedCond.id, (nc) => ({
                                                                                        ...nc,
                                                                                        value,
                                                                                        valueDisplayName: displayName,
                                                                                    }));
                                                                                })}

                                                                                {renderRowActions(() => removeNestedCondition(group.id, condition.id, nestedCond.id))}
                                                                            </div>
                                                                        );
                                                                    })}

                                                                    <div className={styles.relatedEntityAddRow}>
                                                                        <Button
                                                                            size="small"
                                                                            appearance="outline"
                                                                            icon={<AddRegular />}
                                                                            onClick={() => addNestedCondition(group.id, condition.id, nestedFields)}
                                                                        >
                                                                            Add condition
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Show loading state only when no conditions exist and fields are loading */}
                                                            {selectedRelated && nestedFields.length === 0 && nestedConditions.length === 0 && (
                                                                <div className={styles.emptyRelatedEntity}>
                                                                    <Spinner size="tiny" label="Loading fields..." />
                                                                </div>
                                                            )}
                                                            {!selectedRelated && (
                                                                <div className={styles.emptyRelatedEntity}>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const isFieldUnknown = condition.isUnknownField && !availableFields.some(f => f.id === condition.fieldId);
                                            const selectedField = availableFields.find((field) => field.id === condition.fieldId) || defaultField;
                                            const operators = getOperatorsForType(selectedField.dataType);
                                            // Covers null/not-null and every no-value operator (today, this-week, eq-userid...)
                                            const isNullOperator = !operatorRequiresValue(condition.operator);
                                            const isBetween = operatorRequiresValue2(condition.operator);
                                            // Fiscal period-and-year operators take two numbers even on a date
                                            // column, so the second input must not become a date picker
                                            const secondValueIsNumeric = getOperatorValueType(condition.operator) === 'number';
                                            const conditionRowClass = mergeClasses(
                                                styles.conditionTreeRow,
                                                (invalidConditionIds.has(condition.id) || isFieldUnknown) && styles.conditionInvalid,
                                            );

                                            return (
                                                <div className={conditionRowClass} key={condition.id}>
                                                    <div className={connectorClass}>
                                                        <div className={styles.conditionConnectorLine} />
                                                        <div className={styles.conditionConnectorBranch} />
                                                    </div>
                                                    {isFieldUnknown ? (
                                                        <div className={styles.conditionUnknownBanner}>
                                                            <span>⚠</span>
                                                            <span className={styles.conditionUnknownText}>Unknown field <strong>{condition.fieldId}</strong> — not found in entity metadata. Update or remove this condition before saving.</span>
                                                            <Button
                                                                appearance="subtle"
                                                                size="small"
                                                                className={styles.conditionUnknownButton}
                                                                onClick={() => removeCondition(group.id, condition.id)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                    <div className={rowGridClass} role="row">
                                                        <div className={styles.fieldCell} role="gridcell">
                                                            <Lookup
                                                                className={styles.compactControl}
                                                                size="small"
                                                                appearance={fieldAppearance}
                                                                aria-label="Field"
                                                                options={fieldLookupOptions}
                                                                selectedKey={condition.fieldId}
                                                                clearable={false}
                                                                placeholder="Select field..."
                                                                onOptionSelect={(option) => {
                                                                    if (!option) return;
                                                                    const nextField = (option.data as QueryBuilderField) || availableFields.find((field) => field.id === option.key) || defaultField;
                                                                    updateGroup(group.id, (current) => ({
                                                                        ...current,
                                                                        conditions: current.conditions.map((row) =>
                                                                            row.id === condition.id
                                                                                ? {
                                                                                    ...row,
                                                                                    fieldId: nextField.id,
                                                                                    operator: getOperatorsForType(nextField.dataType)[0].value as any,
                                                                                    value: getDefaultValueForField(nextField),
                                                                                    value2: '',
                                                                                }
                                                                                : row,
                                                                        ),
                                                                    }));
                                                                }}
                                                            />
                                                        </div>

                                                        <div className={styles.operatorCell} role="gridcell">
                                                            <Dropdown
                                                                className={styles.compactControl}
                                                                size="small"
                                                                appearance={listboxAppearance}
                                                                aria-label="Operator"
                                                                value={operators.find((op) => op.value === condition.operator)?.label || ''}
                                                                selectedOptions={[condition.operator]}
                                                                onOptionSelect={(_, data) =>
                                                                    updateGroup(group.id, (current) => ({
                                                                        ...current,
                                                                        conditions: current.conditions.map((row) =>
                                                                            row.id === condition.id
                                                                                ? {
                                                                                    ...row,
                                                                                    operator: (data.optionValue as any) || row.operator,
                                                                                }
                                                                                : row,
                                                                        ),
                                                                    }))
                                                                }
                                                            >
                                                                {operators.map((operator) => (
                                                                    <Option key={operator.value} value={operator.value}>
                                                                        {operator.label}
                                                                    </Option>
                                                                ))}
                                                            </Dropdown>
                                                        </div>

                                                        <div className={styles.valueCell} role="gridcell">
                                                            {renderValueInput(selectedField, condition, isNullOperator, (value, displayName) => {
                                                                updateGroup(group.id, (current) => ({
                                                                    ...current,
                                                                    conditions: current.conditions.map((row) =>
                                                                        row.id === condition.id
                                                                            ? { ...row, value, valueDisplayName: displayName }
                                                                            : row,
                                                                    ),
                                                                }));
                                                            })}
                                                        </div>

                                                        {hasBetweenOperator && (
                                                            isBetween ? (
                                                                <div className={styles.andCell} role="gridcell">
                                                                    {selectedField.dataType === 'datetime' && !secondValueIsNumeric ? (
                                                                        <DatePicker
                                                                            className={styles.compactControl}
                                                                            size="small"
                                                                            appearance={fieldAppearance}
                                                                            aria-label="Second value"
                                                                            value={condition.value2 ? new Date(String(condition.value2)) : null}
                                                                            onSelectDate={(date) =>
                                                                                updateGroup(group.id, (current) => ({
                                                                                    ...current,
                                                                                    conditions: current.conditions.map((row) =>
                                                                                        row.id === condition.id
                                                                                            ? { ...row, value2: formatDateOnly(date) }
                                                                                            : row,
                                                                                    ),
                                                                                }))
                                                                            }
                                                                            placeholder="And"
                                                                        />
                                                                    ) : (
                                                                        <Input
                                                                            className={styles.compactControl}
                                                                            size="small"
                                                                            appearance={fieldAppearance}
                                                                            aria-label="Second value"
                                                                            type={secondValueIsNumeric || selectedField.dataType === 'number' ? 'number' : 'text'}
                                                                            value={String(condition.value2 ?? '')}
                                                                            onChange={(_, data) =>
                                                                                updateGroup(group.id, (current) => ({
                                                                                    ...current,
                                                                                    conditions: current.conditions.map((row) =>
                                                                                        row.id === condition.id ? { ...row, value2: data.value } : row,
                                                                                    ),
                                                                                }))
                                                                            }
                                                                            placeholder="And"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className={styles.andCell} role="gridcell" />
                                                            )
                                                        )}

                                                        <div className={styles.removeCell} role="gridcell">
                                                            {renderRowActions(() => removeCondition(group.id, condition.id))}
                                                        </div>
                                                    </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Add condition button */}
                                        <div className={styles.addButtonRow}>
                                            <div className={styles.addButtonConnector}>
                                                <div className={styles.addButtonConnectorLine} />
                                                <div className={styles.addButtonConnectorBranch} />
                                            </div>
                                            <Button appearance="outline" size="small" icon={<AddRegular />} onClick={() => addRowToGroup(group.id)}>
                                                Add condition
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Bottom-level Add button for groups and related entities */}
                    <div className={styles.bottomAddRow}>
                        <div className={styles.bottomAddConnector}>
                            <div className={styles.bottomAddConnectorLine} />
                            <div className={styles.bottomAddConnectorBranch} />
                        </div>
                        <Menu positioning="below-start">
                            <MenuTrigger disableButtonEnhancement>
                                <Button appearance="outline" size="small" icon={<AddRegular />}>
                                    Add
                                </Button>
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    {props.allowGroups !== false && (
                                        <MenuItem icon={<span className={styles.menuGlyph}>≡</span>} onClick={() => addItem('group')}>
                                            Add group
                                        </MenuItem>
                                    )}
                                    {props.allowRelatedEntity !== false && computedRelatedEntities.length > 0 && (
                                        <MenuItem icon={<span className={styles.menuGlyph}>▦</span>} onClick={() => addItem('related')}>
                                            Add related entity
                                        </MenuItem>
                                    )}
                                </MenuList>
                            </MenuPopover>
                        </Menu>
                    </div>
                </div>
            )}

            {odataPreviewVisible && (
                <div className={styles.previewCard}>
                    <div className={styles.previewHeader}>
                        <Text weight="semibold">OData Preview</Text>
                        <Button
                            appearance="subtle"
                            icon={<CopyRegular />}
                            size="small"
                            onClick={() => navigator.clipboard.writeText(serialized.odataFilter || '')}
                            title="Copy to clipboard"
                        />
                    </div>
                    {serialized.odataUnsupported.length > 0 && (
                        <div className={styles.previewNotice} role="note">
                            <WarningRegular className={styles.previewNoticeIcon} />
                            <div>
                                <Text weight="semibold">
                                    This query can&apos;t be fully expressed in OData.
                                </Text>
                                <ul className={styles.previewNoticeList}>
                                    {serialized.odataUnsupported.map((unsupported, index) => (
                                        <li key={`${unsupported.fieldId}_${unsupported.operator}_${index}`}>
                                            <strong>{unsupported.fieldLabel}</strong> &mdash; &ldquo;{unsupported.operatorLabel}&rdquo;
                                        </li>
                                    ))}
                                </ul>
                                <Text>
                                    {serialized.odataUnsupported.length === 1 ? 'This operator is' : 'These operators are'}
                                    {' '}evaluated by the FetchXML engine and {serialized.odataUnsupported.length === 1 ? 'has' : 'have'} no
                                    OData equivalent, so {serialized.odataUnsupported.length === 1 ? 'it has' : 'they have'} been left out of the
                                    filter below. Use the FetchXML output to run this query.
                                </Text>
                            </div>
                        </div>
                    )}
                    <Text className={styles.previewCode}>{serialized.odataFilter || '(empty)'}</Text>
                </div>
            )}

            {fetchXmlPreviewVisible && (
                <div className={styles.previewCard}>
                    <div className={styles.previewHeader}>
                        <Text weight="semibold">FetchXML Preview</Text>
                        <Button
                            appearance="subtle"
                            icon={<CopyRegular />}
                            size="small"
                            onClick={() => navigator.clipboard.writeText(serialized.fetchXml || '')}
                            title="Copy to clipboard"
                        />
                    </div>
                    <Text className={styles.previewCode}>{serialized.fetchXml ? prettyPrintXml(serialized.fetchXml) : '(empty)'}</Text>
                </div>
            )}
            </div>
        </div>
    );
};
