import * as React from 'react';
import { Button, Combobox, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, Input, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Option, Select, Spinner, Text, Textarea } from '@fluentui/react-components';
import { AddRegular, ArrowDownloadRegular, ArrowResetRegular, ArrowUploadRegular, CheckmarkCircleRegular, CopyRegular, DeleteRegular, DismissRegular, MoreHorizontalRegular, WarningRegular } from '@fluentui/react-icons';
import { mergeClasses, useQueryBuilderStyles } from './QueryBuilder.styles';
import { Lookup } from '../Lookup';
import type { LookupOption } from '../Lookup';
import type {
    QueryBuilderApplyResult,
    QueryBuilderCondition,
    QueryBuilderField,
    QueryBuilderGroup,
    QueryBuilderLookupOption,
    QueryBuilderProps,
    QueryBuilderState,
} from './QueryBuilder.types';

const FALLBACK_FIELDS: QueryBuilderField[] = [
    { id: 'name', label: 'Name', dataType: 'string' },
    { id: 'createdon', label: 'Created On', dataType: 'datetime' },
    {
        id: 'statecode',
        label: 'State',
        dataType: 'optionset',
        options: [
            { label: 'Active', value: 0 },
            { label: 'Inactive', value: 1 },
        ],
    },
    { id: 'ownerid', label: 'Owner', dataType: 'lookup' },
];

const escapeXml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const prettyPrintXml = (xml: string): string => {
    const INDENT = '  ';
    let formatted = '';
    let indent = 0;
    const tokens = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/g).filter(Boolean);

    for (const token of tokens) {
        if (token.startsWith('</')) {
            indent--;
            formatted += INDENT.repeat(Math.max(indent, 0)) + token + '\n';
        } else if (token.startsWith('<') && token.endsWith('/>')) {
            formatted += INDENT.repeat(indent) + token + '\n';
        } else if (token.startsWith('<')) {
            formatted += INDENT.repeat(indent) + token + '\n';
            indent++;
        } else {
            formatted += INDENT.repeat(indent) + token + '\n';
        }
    }

    return formatted.trim();
};

export interface QueryBuilderValidationError {
    groupId: string;
    conditionId: string;
    fieldLabel: string;
    message: string;
}

export interface QueryBuilderValidationResult {
    isValid: boolean;
    errors: QueryBuilderValidationError[];
    apiValidation?: {
        available: boolean;
        tested: boolean;
        success?: boolean;
        recordCount?: number;
        errorMessage?: string;
    };
}

export const validateQueryBuilderState = (
    state: QueryBuilderState,
    fields: QueryBuilderField[]
): QueryBuilderValidationResult => {
    const errors: QueryBuilderValidationError[] = [];

    for (const group of state.groups) {
        if (group.conditions.length === 0) {
            errors.push({
                groupId: group.id,
                conditionId: '',
                fieldLabel: 'Group',
                message: 'Group has no conditions',
            });
            continue;
        }

        for (const condition of group.conditions) {
            if (condition.kind === 'relatedEntity') {
                if (!condition.relatedEntityName) {
                    errors.push({
                        groupId: group.id,
                        conditionId: condition.id,
                        fieldLabel: 'Related Entity',
                        message: 'Related entity not selected',
                    });
                }
                continue;
            }

            const field = fields.find((f) => f.id === condition.fieldId);
            const fieldLabel = field?.label || condition.fieldId;

            // Check if field exists
            if (!field) {
                errors.push({
                    groupId: group.id,
                    conditionId: condition.id,
                    fieldLabel,
                    message: `Unknown field: ${condition.fieldId}`,
                });
                continue;
            }

            // Skip value check for null/notnull operators
            const isNullOperator = condition.operator === 'null' || condition.operator === 'notnull';
            if (isNullOperator) continue;

            // Check for empty value
            const value = condition.value;
            const isEmpty = value === undefined || value === null || String(value).trim() === '';

            if (isEmpty) {
                errors.push({
                    groupId: group.id,
                    conditionId: condition.id,
                    fieldLabel,
                    message: 'Value is required',
                });
            }

            // Check between operator has second value
            if (condition.operator === 'between') {
                const value2 = condition.value2;
                const isEmpty2 = value2 === undefined || value2 === null || String(value2).trim() === '';
                if (isEmpty2) {
                    errors.push({
                        groupId: group.id,
                        conditionId: condition.id,
                        fieldLabel,
                        message: 'Second value is required for Between operator',
                    });
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

const dataTypeFromAttribute = (attribute: any): QueryBuilderField['dataType'] => {
    const type = String(attribute?.AttributeType || attribute?.Type || '').toLowerCase();
    if (['picklist', 'state', 'status'].includes(type)) return 'optionset';
    if (['lookup', 'customer', 'owner', 'partylist', 'uniqueidentifier'].includes(type)) return 'lookup';
    if (['datetime'].includes(type)) return 'datetime';
    if (['boolean'].includes(type)) return 'boolean';
    if (['integer', 'decimal', 'double', 'money', 'bigint', 'int'].includes(type)) return 'number';
    return 'string';
};

const getOperatorsForType = (dataType: QueryBuilderField['dataType']): Array<{ value: string; label: string }> => {
    const common = [
        { value: 'eq', label: 'Equals' },
        { value: 'ne', label: 'Not Equals' },
        { value: 'null', label: 'Is Empty' },
        { value: 'notnull', label: 'Has Value' },
    ];

    if (dataType === 'string') {
        return [
            { value: 'contains', label: 'Contains' },
            { value: 'notcontains', label: 'Does Not Contain' },
            { value: 'startswith', label: 'Starts With' },
            { value: 'endswith', label: 'Ends With' },
            ...common,
        ];
    }

    if (dataType === 'number' || dataType === 'datetime') {
        return [
            { value: 'gt', label: 'Greater Than' },
            { value: 'ge', label: 'Greater Than Or Equal' },
            { value: 'lt', label: 'Less Than' },
            { value: 'le', label: 'Less Than Or Equal' },
            { value: 'between', label: 'Between' },
            ...common,
        ];
    }

    return common;
};

const getDefaultValueForField = (field: QueryBuilderField): string | number | boolean => {
    if (field.dataType === 'optionset' && field.options && field.options.length > 0) {
        return String(field.options[0].value);
    }

    return '';
};

const createCondition = (defaultField: QueryBuilderField): QueryBuilderCondition => ({
    id: `cond_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    kind: 'field',
    fieldId: defaultField.id,
    operator: getOperatorsForType(defaultField.dataType)[0].value as any,
    value: getDefaultValueForField(defaultField),
    value2: '',
});

const createRelatedCondition = (relatedEntityName?: string): QueryBuilderCondition => ({
    id: `rel_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    kind: 'relatedEntity',
    fieldId: '__related_entity__',
    operator: 'containsdata',
    value: '',
    value2: '',
    relatedEntityName,
});

const parseFetchXmlOperator = (op: string): QueryBuilderCondition['operator'] => {
    const map: Record<string, QueryBuilderCondition['operator']> = {
        'eq': 'eq',
        'ne': 'ne',
        'gt': 'gt',
        'ge': 'ge',
        'lt': 'lt',
        'le': 'le',
        'null': 'null',
        'not-null': 'notnull',
        'like': 'contains',
        'not-like': 'notcontains',
    };
    return map[op] || 'eq';
};

export interface ParseFetchXmlResult {
    state: QueryBuilderState | null;
    error: string | null;
}

export const parseFetchXmlToState = (xml: string, fields: QueryBuilderField[]): ParseFetchXmlResult => {
    try {
        const trimmed = xml.trim();
        if (!trimmed) {
            return { state: null, error: 'Please enter FetchXML content.' };
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(trimmed, 'application/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            const errorText = parseError.textContent || 'Unknown XML parsing error';
            return { state: null, error: `XML parsing error: ${errorText.slice(0, 200)}` };
        }

        const groups: QueryBuilderGroup[] = [];
        const defaultField = fields[0] || FALLBACK_FIELDS[0];

        // Find all filter elements (top-level or nested)
        const filterElements = doc.querySelectorAll('filter');

        // Also gather any standalone condition elements not inside a filter
        const topLevelConditions: QueryBuilderCondition[] = [];

        const parseCondition = (condEl: Element): QueryBuilderCondition => {
            const attr = condEl.getAttribute('attribute') || '';
            const rawOp = condEl.getAttribute('operator') || 'eq';
            let value = condEl.getAttribute('value') || '';

            // Handle like patterns
            let operator = parseFetchXmlOperator(rawOp);
            if (rawOp === 'like') {
                if (value.startsWith('%') && value.endsWith('%')) {
                    operator = 'contains';
                    value = value.slice(1, -1);
                } else if (value.endsWith('%')) {
                    operator = 'startswith';
                    value = value.slice(0, -1);
                } else if (value.startsWith('%')) {
                    operator = 'endswith';
                    value = value.slice(1);
                }
            }

            const field = fields.find((f) => f.id === attr);
            return {
                id: `cond_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                kind: 'field',
                fieldId: field?.id || attr || defaultField.id,
                operator,
                value,
                value2: '',
            };
        };

        filterElements.forEach((filterEl, idx) => {
            const logic = (filterEl.getAttribute('type') || 'and').toLowerCase() as 'and' | 'or';
            const conditions: QueryBuilderCondition[] = [];

            // Get conditions directly under this filter (not in nested filters)
            filterEl.querySelectorAll(':scope > condition').forEach((condEl) => {
                conditions.push(parseCondition(condEl));
            });

            // Even empty filters become groups (user can add conditions)
            groups.push({
                id: `grp_${Date.now()}_${idx}`,
                logic,
                conditions: conditions.length > 0 ? conditions : [createCondition(defaultField)],
            });
        });

        // If no filter elements, look for conditions directly under entity
        if (filterElements.length === 0) {
            const entityConditions = doc.querySelectorAll('entity > condition, fetch > entity > condition');
            entityConditions.forEach((condEl) => {
                topLevelConditions.push(parseCondition(condEl));
            });

            if (topLevelConditions.length > 0) {
                groups.push({
                    id: `grp_${Date.now()}_0`,
                    logic: 'and',
                    conditions: topLevelConditions,
                });
            }
        }

        // If still no groups, inform user no filter conditions were found
        if (groups.length === 0) {
            return { 
                state: null,
                error: 'No filter conditions found in the FetchXML. The QueryBuilder imports <filter> and <condition> elements. Your FetchXML only contains attributes and entity definitions.',
            };
        }

        return { state: { groups }, error: null };
    } catch (err) {
        return { state: null, error: `Error parsing FetchXML: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
};

const createGroup = (defaultField: QueryBuilderField): QueryBuilderGroup => ({
    id: `grp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    logic: 'and',
    conditions: [createCondition(defaultField)],
});

const cloneState = (state: QueryBuilderState | undefined, defaultField: QueryBuilderField): QueryBuilderState => {
    if (!state?.groups?.length) {
        return { groups: [createGroup(defaultField)] };
    }

    return {
        groups: state.groups.map((group) => ({
            id: group.id || `grp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            logic: group.logic || 'and',
            conditions: (group.conditions || []).map((condition) => ({
                id: condition.id || `cond_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                kind: condition.kind || 'field',
                fieldId: condition.fieldId || defaultField.id,
                operator: (condition.operator || 'eq') as any,
                value: condition.value ?? '',
                value2: condition.value2 ?? '',
                relatedEntityName: condition.relatedEntityName,
            })),
        })),
    };
};

export const serializeQueryBuilderState = (
    state: QueryBuilderState,
    fields: QueryBuilderField[],
    entityName: string,
): QueryBuilderApplyResult => {
    const defaultField = fields[0] || FALLBACK_FIELDS[0];

    const conditionToFetchXml = (condition: QueryBuilderCondition, field: QueryBuilderField): string => {
        if (condition.kind === 'relatedEntity') {
            const alias = escapeXml(condition.relatedEntityName || 'related');
            return `<condition entityname="${alias}" attribute="${alias}id" operator="not-null" />`;
        }

        const attr = escapeXml(condition.fieldId);
        const operatorMap: Record<string, string> = {
            eq: 'eq',
            ne: 'ne',
            gt: 'gt',
            ge: 'ge',
            lt: 'lt',
            le: 'le',
            null: 'null',
            notnull: 'not-null',
            contains: 'like',
            notcontains: 'not-like',
            startswith: 'like',
            endswith: 'like',
        };

        const operator = operatorMap[condition.operator] || 'eq';

        if (condition.operator === 'null' || condition.operator === 'notnull') {
            return `<condition attribute="${attr}" operator="${operator}" />`;
        }

        if (condition.operator === 'between') {
            return [
                `<condition attribute="${attr}" operator="ge" value="${escapeXml(String(condition.value ?? ''))}" />`,
                `<condition attribute="${attr}" operator="le" value="${escapeXml(String(condition.value2 ?? ''))}" />`,
            ].join('');
        }

        let value = condition.value;
        if (field.dataType === 'boolean') {
            value = value === true || value === 'true' || value === 1 || value === '1' ? '1' : '0';
        }

        if (condition.operator === 'contains' || condition.operator === 'notcontains') value = `%${value}%`;
        if (condition.operator === 'startswith') value = `${value}%`;
        if (condition.operator === 'endswith') value = `%${value}`;

        return `<condition attribute="${attr}" operator="${operator}" value="${escapeXml(String(value ?? ''))}" />`;
    };

    const conditionToOData = (condition: QueryBuilderCondition, field: QueryBuilderField): string => {
        if (condition.kind === 'relatedEntity') {
            return `${condition.relatedEntityName || 'related'} ne null`;
        }

        const quote = (val: any): string => {
            if (field.dataType === 'number') return String(val ?? 0);
            if (field.dataType === 'boolean') return val === true || val === 'true' || val === 1 || val === '1' ? 'true' : 'false';
            return `'${String(val ?? '').replace(/'/g, "''")}'`;
        };

        switch (condition.operator) {
            case 'eq':
                return `${condition.fieldId} eq ${quote(condition.value)}`;
            case 'ne':
                return `${condition.fieldId} ne ${quote(condition.value)}`;
            case 'gt':
                return `${condition.fieldId} gt ${quote(condition.value)}`;
            case 'ge':
                return `${condition.fieldId} ge ${quote(condition.value)}`;
            case 'lt':
                return `${condition.fieldId} lt ${quote(condition.value)}`;
            case 'le':
                return `${condition.fieldId} le ${quote(condition.value)}`;
            case 'null':
                return `${condition.fieldId} eq null`;
            case 'notnull':
                return `${condition.fieldId} ne null`;
            case 'contains':
                return `contains(${condition.fieldId}, ${quote(condition.value)})`;
            case 'notcontains':
                return `not contains(${condition.fieldId}, ${quote(condition.value)})`;
            case 'startswith':
                return `startswith(${condition.fieldId}, ${quote(condition.value)})`;
            case 'endswith':
                return `endswith(${condition.fieldId}, ${quote(condition.value)})`;
            case 'between':
                return `(${condition.fieldId} ge ${quote(condition.value)} and ${condition.fieldId} le ${quote(condition.value2)})`;
            default:
                return `${condition.fieldId} eq ${quote(condition.value)}`;
        }
    };

    const filterParts = state.groups.map((group) => {
        const conditionsXml = group.conditions
            .map((condition) => {
                const field = fields.find((candidate) => candidate.id === condition.fieldId) || defaultField;
                return conditionToFetchXml(condition, field);
            })
            .join('');

        return `<filter type="${group.logic}">${conditionsXml}</filter>`;
    });

    const fetchXmlFilter =
        filterParts.length > 1 ? `<filter type="and">${filterParts.join('')}</filter>` : filterParts[0] || '<filter type="and"></filter>';

    const fetchXml = `<fetch version="1.0"><entity name="${escapeXml(entityName)}">${fetchXmlFilter}</entity></fetch>`;

    const odataFilter = state.groups
        .map((group) => {
            const rowFilters = group.conditions
                .map((condition) => {
                    const field = fields.find((candidate) => candidate.id === condition.fieldId) || defaultField;
                    return conditionToOData(condition, field);
                })
                .filter(Boolean);

            return rowFilters.length > 1 ? `(${rowFilters.join(` ${group.logic} `)})` : rowFilters[0] || '';
        })
        .filter(Boolean)
        .join(' and ');

    return {
        state: JSON.parse(JSON.stringify(state)) as QueryBuilderState,
        fetchXmlFilter,
        fetchXml,
        odataFilter,
    };
};

/** Internal component for lookup field value input */
interface LookupValueInputProps {
    fieldId: string;
    value: string;
    displayName: string;
    disabled: boolean;
    onLookupSearch?: (fieldId: string, searchText: string) => Promise<QueryBuilderLookupOption[]> | QueryBuilderLookupOption[];
    onValueChange: (value: string, displayName: string) => void;
}

const LookupValueInput: React.FC<LookupValueInputProps> = ({
    fieldId,
    value,
    displayName,
    disabled,
    onLookupSearch,
    onValueChange,
}) => {
    const [lookupOptions, setLookupOptions] = React.useState<LookupOption[]>([]);
    const [lookupLoading, setLookupLoading] = React.useState(false);

    const handleSearchChange = React.useCallback(
        async (searchText: string) => {
            if (!onLookupSearch) return;

            setLookupLoading(true);
            try {
                const results = await onLookupSearch(fieldId, searchText);
                setLookupOptions(
                    results.map((r) => ({
                        key: r.key,
                        text: r.text,
                        secondaryText: r.secondaryText,
                    })),
                );
            } finally {
                setLookupLoading(false);
            }
        },
        [fieldId, onLookupSearch],
    );

    const handleOptionSelect = React.useCallback(
        (option: LookupOption | null) => {
            if (option) {
                onValueChange(option.key, option.text);
            } else {
                onValueChange('', '');
            }
        },
        [onValueChange],
    );

    // Build selected option for display
    const selectedOption: LookupOption | null = value
        ? { key: value, text: displayName || value }
        : null;

    return (
        <Lookup
            size="small"
            appearance="filled-darker"
            placeholder="Search..."
            aria-label="Lookup value"
            options={lookupOptions}
            selectedOption={selectedOption}
            onSearchChange={handleSearchChange}
            onOptionSelect={handleOptionSelect}
            loading={lookupLoading}
            disabled={disabled || !onLookupSearch}
            clearable
            minSearchLength={1}
        />
    );
};

export const QueryBuilder: React.FC<QueryBuilderProps> = (props) => {
    const styles = useQueryBuilderStyles();
    const [loading, setLoading] = React.useState(false);
    const [availableFields, setAvailableFields] = React.useState<QueryBuilderField[]>(
        props.fields && props.fields.length > 0 ? props.fields : FALLBACK_FIELDS,
    );

    const defaultField = availableFields[0] || FALLBACK_FIELDS[0];

    const [builderState, setBuilderState] = React.useState<QueryBuilderState>(() => cloneState(props.initialState, defaultField));
    const initialFetchXmlParsedRef = React.useRef(false);

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
                const xrm = (window as any).Xrm;
                if (xrm?.Utility?.getEntityMetadata) {
                    const metadata = await xrm.Utility.getEntityMetadata(props.entityName);
                    const attributesCollection = metadata?.Attributes?._collection || metadata?.Attributes || {};
                    const attributesArray: any[] = Array.isArray(attributesCollection)
                        ? attributesCollection
                        : Object.keys(attributesCollection).map((key) => attributesCollection[key]);

                    const resolvedFields: QueryBuilderField[] = attributesArray
                        .filter((attribute: any) => attribute?.LogicalName && attribute?.IsValidForAdvancedFind !== false)
                        .slice(0, 100)
                        .map((attribute: any) => {
                            const dataType = dataTypeFromAttribute(attribute);
                            const optionSet = attribute?.OptionSet?.Options;
                            const options =
                                dataType === 'optionset' && Array.isArray(optionSet)
                                    ? optionSet
                                        .map((option: any) => ({
                                            label: option?.Label?.UserLocalizedLabel?.Label || option?.Label || String(option?.Value),
                                            value: option?.Value,
                                        }))
                                        .filter((option: { label: string; value: string | number }) => option.value !== undefined && option.value !== null)
                                    : undefined;

                            return {
                                id: attribute.LogicalName,
                                label: attribute.DisplayName?.UserLocalizedLabel?.Label || attribute.DisplayName || attribute.SchemaName || attribute.LogicalName,
                                dataType,
                                options,
                            };
                        })
                        .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));

                    if (!disposed && resolvedFields.length > 0) {
                        setAvailableFields(resolvedFields);
                    }
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
    }, [props.entityName, props.fields]);

    React.useEffect(() => {
        props.onStateChange?.(builderState);
    }, [builderState, props.onStateChange]);

    // Debounce serialization to avoid recalculating on every keystroke
    React.useEffect(() => {
        if (!props.onSerializedChange) return;
        const timeout = setTimeout(() => {
            props.onSerializedChange?.(serializeQueryBuilderState(builderState, availableFields, props.entityName));
        }, 150);
        return () => clearTimeout(timeout);
    }, [availableFields, builderState, props.entityName, props.onSerializedChange]);

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

                const relatedName = props.relatedEntities?.[0]?.id;
                const relatedGroup = createGroup(defaultField);
                relatedGroup.conditions = [createRelatedCondition(relatedName)];

                return {
                    groups: [...previous.groups, relatedGroup],
                };
            }

            return previous;
        });
    }, [defaultField, props.allowGroups, props.allowRelatedEntity, props.relatedEntities]);

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
        const payload = serializeQueryBuilderState(builderState, availableFields, props.entityName);
        const blob = new Blob([payload.fetchXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${props.entityName}-filters.xml`;
        anchor.click();
        URL.revokeObjectURL(url);
    }, [availableFields, builderState, props.entityName]);

    const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
    const [uploadXmlText, setUploadXmlText] = React.useState('');
    const [uploadError, setUploadError] = React.useState<string | null>(null);

    const [validationDialogOpen, setValidationDialogOpen] = React.useState(false);
    const [validationResult, setValidationResult] = React.useState<QueryBuilderValidationResult | null>(null);
    const [apiValidating, setApiValidating] = React.useState(false);
    const invalidConditionIds = React.useMemo(() => {
        if (!validationResult) return new Set<string>();
        return new Set(validationResult.errors.map((e) => e.conditionId).filter(Boolean));
    }, [validationResult]);

    // Check if Xrm WebApi is available (running in Dynamics 365)
    const isXrmAvailable = React.useMemo(() => {
        try {
            return typeof (window as any).Xrm?.WebApi?.retrieveMultipleRecords === 'function';
        } catch {
            return false;
        }
    }, []);

    const onValidate = React.useCallback(async () => {
        const result = validateQueryBuilderState(builderState, availableFields);
        
        // Add API validation info
        if (!isXrmAvailable) {
            result.apiValidation = {
                available: false,
                tested: false,
            };
            setValidationResult(result);
            setValidationDialogOpen(true);
            return;
        }

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

        // Test against XRM API
        setApiValidating(true);
        setValidationResult(result);
        setValidationDialogOpen(true);

        try {
            const Xrm = (window as any).Xrm;
            const { odataFilter } = serializeQueryBuilderState(builderState, availableFields, props.entityName);
            const options = odataFilter ? `?$filter=${odataFilter}&$top=1&$count=true` : '?$top=1&$count=true';
            
            const response = await Xrm.WebApi.retrieveMultipleRecords(props.entityName, options);
            
            setValidationResult({
                ...result,
                apiValidation: {
                    available: true,
                    tested: true,
                    success: true,
                    recordCount: response['@odata.count'] ?? response.entities?.length ?? 0,
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
    }, [builderState, availableFields, isXrmAvailable, props.entityName]);

    const onOpenUploadDialog = React.useCallback(() => {
        setUploadXmlText('');
        setUploadError(null);
        setUploadDialogOpen(true);
    }, []);

    const onApplyUploadedXml = React.useCallback(() => {
        const result = parseFetchXmlToState(uploadXmlText, availableFields);
        if (result.state) {
            setBuilderState(result.state);
            setUploadDialogOpen(false);
            setUploadError(null);
        } else {
            setUploadError(result.error || 'Invalid FetchXML.');
        }
    }, [uploadXmlText, availableFields]);

    const serialized = serializeQueryBuilderState(builderState, availableFields, props.entityName);

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
                    Edit filters: {props.entityDisplayName || props.entityName}
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
                            onClick={onOpenUploadDialog}
                        >
                            Import FetchXML
                        </Button>
                    )}

                    <Dialog open={uploadDialogOpen} onOpenChange={(_, data) => setUploadDialogOpen(data.open)}>
                        <DialogSurface style={{ maxWidth: '600px' }}>
                            <DialogBody>
                                <DialogTitle>Import FetchXML</DialogTitle>
                                <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <Text>Paste your FetchXML below to rebuild the query:</Text>
                                    <Textarea
                                        placeholder="<fetch><entity name='account'><filter>...</filter></entity></fetch>"
                                        value={uploadXmlText}
                                        onChange={(_, data) => setUploadXmlText(data.value)}
                                        style={{ minHeight: '200px', fontFamily: 'monospace' }}
                                        resize="vertical"
                                    />
                                    {uploadError && (
                                        <Text style={{ color: 'var(--colorStatusDangerForeground1)' }}>{uploadError}</Text>
                                    )}
                                </DialogContent>
                                <DialogActions>
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
                        <DialogSurface style={{ maxWidth: '500px' }}>
                            <DialogBody>
                                <DialogTitle>Query Validation</DialogTitle>
                                <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Local Validation Section */}
                                    <div>
                                        <Text weight="semibold" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                        <Text weight="semibold" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {loading ? (
                <div className={styles.loadingWrap}>
                    <Spinner label="Loading fields..." />
                </div>
            ) : (
                <div className={styles.groupsContainer}>
                    <div className={styles.rootLogicRow}>
                        <Combobox className={styles.rootLogicSelect} size="small" appearance="filled-darker" value="AND" disabled>
                            <Option value="AND">AND</Option>
                        </Combobox>
                    </div>
                    {builderState.groups.map((group, groupIndex) => {
                        const hasBetweenOperator = group.conditions.some((c) => c.operator === 'between');
                        const headerRowClass = mergeClasses(
                            styles.columnHeaderRow,
                            hasBetweenOperator && styles.columnHeaderRowWithBetween,
                        );
                        const rowGridClass = mergeClasses(
                            styles.rowGrid,
                            hasBetweenOperator && styles.rowGridWithBetween,
                        );
                        const isLastGroup = groupIndex === builderState.groups.length - 1;

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
                                            <Combobox
                                                className={styles.groupLogicSelect}
                                                size="small"
                                                appearance="filled-darker"
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
                                                return (
                                                    <div className={relatedEntityRowClass} key={condition.id}>
                                                        <div className={connectorClass}>
                                                            <div className={styles.conditionConnectorLine} />
                                                            <div className={styles.conditionConnectorBranch} />
                                                        </div>
                                                        <div className={rowGridClass} role="row">
                                                            <div className={styles.fieldCell} role="gridcell">
                                                                <Select
                                                                    className={styles.compactControl}
                                                                    size="small"
                                                                    appearance="filled-darker"
                                                                    aria-label="Related entity"
                                                                    value={condition.relatedEntityName || ''}
                                                                    onChange={(_, data) =>
                                                                        updateGroup(group.id, (current) => ({
                                                                            ...current,
                                                                            conditions: current.conditions.map((row) =>
                                                                                row.id === condition.id ? { ...row, relatedEntityName: data.value } : row,
                                                                            ),
                                                                        }))
                                                                    }
                                                                >
                                                                    {props.relatedEntities && props.relatedEntities.length > 0 ? (
                                                                        props.relatedEntities.map((related) => (
                                                                            <Option key={related.id} value={related.id}>
                                                                                {related.label}
                                                                            </Option>
                                                                        ))
                                                                    ) : (
                                                                        <Option value="">Choose a related entity...</Option>
                                                                    )}
                                                                </Select>
                                                            </div>

                                                            <div className={styles.operatorCell} role="gridcell">
                                                                <Combobox
                                                                    className={styles.compactControl}
                                                                    size="small"
                                                                    appearance="filled-darker"
                                                                    value="Contains data"
                                                                    aria-label="Operator"
                                                                    disabled
                                                                >
                                                                    <Option value="containsdata">Contains data</Option>
                                                                </Combobox>
                                                            </div>
                                                            <div className={styles.valueCell} role="gridcell" />
                                                            {hasBetweenOperator && <div className={styles.andCell} role="gridcell" />}

                                                            <div className={styles.removeCell} role="gridcell">
                                                                {renderRowActions(() => removeCondition(group.id, condition.id))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const selectedField = availableFields.find((field) => field.id === condition.fieldId) || defaultField;
                                            const operators = getOperatorsForType(selectedField.dataType);
                                            const isNullOperator = condition.operator === 'null' || condition.operator === 'notnull';
                                            const isBetween = condition.operator === 'between';
                                            const conditionRowClass = mergeClasses(
                                                styles.conditionTreeRow,
                                                invalidConditionIds.has(condition.id) && styles.conditionInvalid,
                                            );

                                            return (
                                                <div className={conditionRowClass} key={condition.id}>
                                                    <div className={connectorClass}>
                                                        <div className={styles.conditionConnectorLine} />
                                                        <div className={styles.conditionConnectorBranch} />
                                                    </div>
                                                    <div className={rowGridClass} role="row">
                                                        <div className={styles.fieldCell} role="gridcell">
                                                            <Select
                                                                className={styles.compactControl}
                                                                size="small"
                                                                appearance="filled-darker"
                                                                aria-label="Field"
                                                                value={condition.fieldId}
                                                                onChange={(_, data) => {
                                                                    const nextField = availableFields.find((field) => field.id === data.value) || defaultField;
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
                                                            >
                                                                {availableFields.map((field) => (
                                                                    <Option key={field.id} value={field.id}>
                                                                        {field.label}
                                                                    </Option>
                                                                ))}
                                                            </Select>
                                                        </div>

                                                        <div className={styles.operatorCell} role="gridcell">
                                                            <Select
                                                                className={styles.compactControl}
                                                                size="small"
                                                                appearance="filled-darker"
                                                                aria-label="Operator"
                                                                value={condition.operator}
                                                                onChange={(_, data) =>
                                                                    updateGroup(group.id, (current) => ({
                                                                        ...current,
                                                                        conditions: current.conditions.map((row) =>
                                                                            row.id === condition.id
                                                                                ? {
                                                                                    ...row,
                                                                                    operator: (data.value as any) || row.operator,
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
                                                            </Select>
                                                        </div>

                                                        {selectedField.dataType === 'optionset' && selectedField.options ? (
                                                            <div className={styles.valueCell} role="gridcell">
                                                                <Select
                                                                    className={styles.compactControl}
                                                                    size="small"
                                                                    appearance="filled-darker"
                                                                    aria-label="Value"
                                                                    value={
                                                                        condition.value !== undefined && condition.value !== null && String(condition.value) !== ''
                                                                            ? String(condition.value)
                                                                            : String(selectedField.options[0]?.value ?? '')
                                                                    }
                                                                    disabled={isNullOperator}
                                                                    onChange={(_, data) =>
                                                                        updateGroup(group.id, (current) => ({
                                                                            ...current,
                                                                            conditions: current.conditions.map((row) =>
                                                                                row.id === condition.id
                                                                                    ? {
                                                                                        ...row,
                                                                                        value: data.value ?? row.value,
                                                                                    }
                                                                                    : row,
                                                                            ),
                                                                        }))
                                                                    }
                                                                >
                                                                    {selectedField.options.map((option) => (
                                                                        <Option key={String(option.value)} value={String(option.value)}>
                                                                            {option.label}
                                                                        </Option>
                                                                    ))}
                                                                </Select>
                                                            </div>
                                                        ) : selectedField.dataType === 'lookup' ? (
                                                            <div className={styles.valueCell} role="gridcell">
                                                                <LookupValueInput
                                                                    fieldId={condition.fieldId}
                                                                    value={String(condition.value ?? '')}
                                                                    displayName={condition.valueDisplayName ?? ''}
                                                                    disabled={isNullOperator}
                                                                    onLookupSearch={props.onLookupSearch}
                                                                    onValueChange={(value, displayName) =>
                                                                        updateGroup(group.id, (current) => ({
                                                                            ...current,
                                                                            conditions: current.conditions.map((row) =>
                                                                                row.id === condition.id
                                                                                    ? { ...row, value, valueDisplayName: displayName }
                                                                                    : row,
                                                                            ),
                                                                        }))
                                                                    }
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className={styles.valueCell} role="gridcell">
                                                                <Input
                                                                    className={styles.compactControl}
                                                                    size="small"
                                                                    appearance="filled-darker"
                                                                    aria-label="Value"
                                                                    type={selectedField.dataType === 'datetime' ? 'date' : selectedField.dataType === 'number' ? 'number' : 'text'}
                                                                    value={String(condition.value ?? '')}
                                                                    onChange={(_, data) =>
                                                                        updateGroup(group.id, (current) => ({
                                                                            ...current,
                                                                            conditions: current.conditions.map((row) =>
                                                                                row.id === condition.id ? { ...row, value: data.value } : row,
                                                                            ),
                                                                        }))
                                                                    }
                                                                    disabled={isNullOperator}
                                                                    placeholder={selectedField.dataType === 'boolean' ? 'true/false' : 'Value'}
                                                                />
                                                            </div>
                                                        )}

                                                        {hasBetweenOperator && (
                                                            isBetween ? (
                                                                <div className={styles.andCell} role="gridcell">
                                                                    <Input
                                                                        className={styles.compactControl}
                                                                        size="small"
                                                                        appearance="filled-darker"
                                                                        aria-label="Second value"
                                                                        type={selectedField.dataType === 'datetime' ? 'date' : selectedField.dataType === 'number' ? 'number' : 'text'}
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
                                                                </div>
                                                            ) : (
                                                                <div className={styles.andCell} role="gridcell" />
                                                            )
                                                        )}

                                                        <div className={styles.removeCell} role="gridcell">
                                                            {renderRowActions(() => removeCondition(group.id, condition.id))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add row button */}
                                        <div className={styles.addButtonRow}>
                                            <div className={styles.addButtonConnector}>
                                                <div className={styles.addButtonConnectorLine} />
                                                <div className={styles.addButtonConnectorBranch} />
                                            </div>
                                            <Button appearance="outline" size="small" icon={<AddRegular />} onClick={() => addRowToGroup(group.id)}>
                                                Add row
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
                                    {props.allowRelatedEntity !== false && (
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

            {props.showODataPreview && (
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
                    <Text className={styles.previewCode}>{serialized.odataFilter || '(empty)'}</Text>
                </div>
            )}

            {props.showFetchXmlPreview && (
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
    );
};
