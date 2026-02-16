/**
 * QueryBuilder Utils
 * 
 * Validation, helpers, and metadata utilities for QueryBuilder.
 */

import type {
    QueryBuilderCondition,
    QueryBuilderField,
    QueryBuilderGroup,
    QueryBuilderState,
    QueryBuilderDataType,
} from './QueryBuilder.types';
import { getOperatorsForType, getOperatorByValue, operatorRequiresValue } from './QueryBuilder.operators';

/** Fallback fields for when none are provided */
export const FALLBACK_FIELDS: QueryBuilderField[] = [
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

/**
 * Validation error details
 */
export interface QueryBuilderValidationError {
    groupId: string;
    conditionId: string;
    fieldLabel: string;
    message: string;
}

/**
 * Validation result
 */
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

/**
 * Validate the QueryBuilder state
 */
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
                validateRelatedEntityCondition(condition, group.id, errors);
                continue;
            }

            validateFieldCondition(condition, group.id, fields, errors);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate a related entity condition
 */
const validateRelatedEntityCondition = (
    condition: QueryBuilderCondition,
    groupId: string,
    errors: QueryBuilderValidationError[]
): void => {
    if (!condition.relatedEntityName) {
        errors.push({
            groupId,
            conditionId: condition.id,
            fieldLabel: 'Related Entity',
            message: 'Related entity not selected',
        });
        return;
    }

    if (!condition.nestedConditions || condition.nestedConditions.length === 0) {
        errors.push({
            groupId,
            conditionId: condition.id,
            fieldLabel: 'Related Entity',
            message: 'At least one nested condition is required',
        });
        return;
    }

    // Validate each nested condition
    const nestedFields = condition.nestedFields || [];
    for (const nestedCond of condition.nestedConditions) {
        const nestedField = nestedFields.find((f) => f.id === nestedCond.fieldId);
        const nestedFieldLabel = nestedField?.label || nestedCond.fieldId || 'Field';

        // Skip value check for operators that don't require values
        const requiresValue = operatorRequiresValue(nestedCond.operator);
        if (!requiresValue) continue;

        // Check for empty value (handle arrays for in/not-in)
        if (isValueEmpty(nestedCond.value)) {
            errors.push({
                groupId,
                conditionId: nestedCond.id,
                fieldLabel: nestedFieldLabel,
                message: 'Value is required',
            });
        }
    }
};

/**
 * Validate a field condition
 */
const validateFieldCondition = (
    condition: QueryBuilderCondition,
    groupId: string,
    fields: QueryBuilderField[],
    errors: QueryBuilderValidationError[]
): void => {
    const field = fields.find((f) => f.id === condition.fieldId);
    const fieldLabel = field?.label || condition.fieldId;

    // Check if field exists
    if (!field) {
        errors.push({
            groupId,
            conditionId: condition.id,
            fieldLabel,
            message: `Unknown field: ${condition.fieldId}`,
        });
        return;
    }

    // Skip value check for operators that don't require values
    const requiresValue = operatorRequiresValue(condition.operator);
    if (!requiresValue) return;

    // Check for empty value
    if (isValueEmpty(condition.value)) {
        errors.push({
            groupId,
            conditionId: condition.id,
            fieldLabel,
            message: 'Value is required',
        });
    }

    // Check between/two-value operators have second value
    const operatorDef = getOperatorByValue(condition.operator);
    if (operatorDef?.requiresValue2) {
        if (isValueEmpty(condition.value2)) {
            errors.push({
                groupId,
                conditionId: condition.id,
                fieldLabel,
                message: 'Second value is required for this operator',
            });
        }
    }
};

/**
 * Check if a value is empty
 */
const isValueEmpty = (value: any): boolean => {
    if (value === undefined || value === null) return true;
    if (Array.isArray(value)) {
        return value.length === 0 || value.every(v => v === undefined || v === null || String(v).trim() === '');
    }
    return String(value).trim() === '';
};

/**
 * Infer data type from Dynamics 365 attribute metadata
 */
export const dataTypeFromAttribute = (attribute: any): QueryBuilderDataType => {
    const type = String(attribute?.AttributeType || attribute?.Type || '').toLowerCase();
    
    if (['picklist', 'state', 'status'].includes(type)) return 'optionset';
    if (['lookup', 'customer', 'owner', 'partylist', 'uniqueidentifier'].includes(type)) return 'lookup';
    if (['datetime'].includes(type)) return 'datetime';
    if (['boolean'].includes(type)) return 'boolean';
    if (['integer', 'decimal', 'double', 'money', 'bigint', 'int'].includes(type)) return 'number';
    
    return 'string';
};

/**
 * Get default value for a field based on its type
 */
export const getDefaultValueForField = (field: QueryBuilderField): string | number | boolean => {
    if (field.dataType === 'optionset' && field.options && field.options.length > 0) {
        return String(field.options[0].value);
    }
    return '';
};

/**
 * Create a new condition for a field
 */
export const createCondition = (defaultField: QueryBuilderField): QueryBuilderCondition => {
    const operators = getOperatorsForType(defaultField.dataType);
    return {
        id: `cond_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        kind: 'field',
        fieldId: defaultField.id,
        operator: operators[0]?.value as any || 'eq',
        value: getDefaultValueForField(defaultField),
        value2: '',
    };
};

/**
 * Create a new related entity condition
 */
export const createRelatedCondition = (
    relatedEntityName?: string,
    relatedEntityTarget?: string
): QueryBuilderCondition => ({
    id: `rel_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    kind: 'relatedEntity',
    fieldId: relatedEntityName || '__related_entity__',
    operator: 'containsdata',
    value: '',
    value2: '',
    relatedEntityName,
    relatedEntityTarget,
    nestedConditions: [],
    nestedLogic: 'and',
    nestedFields: [],
});

/**
 * Create a new group
 */
export const createGroup = (defaultField: QueryBuilderField): QueryBuilderGroup => ({
    id: `grp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    logic: 'and',
    conditions: [createCondition(defaultField)],
});

/**
 * Clone state for immutable updates
 */
export const cloneState = (
    state: QueryBuilderState | undefined,
    defaultField: QueryBuilderField
): QueryBuilderState => {
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
                relatedEntityTarget: condition.relatedEntityTarget,
                nestedConditions: condition.nestedConditions ? [...condition.nestedConditions] : undefined,
                nestedLogic: condition.nestedLogic,
                nestedFields: condition.nestedFields ? [...condition.nestedFields] : undefined,
            })),
        })),
    };
};

/**
 * Generate a unique ID
 */
export const generateId = (prefix: string = 'id'): string => {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

/**
 * Deep compare two QueryBuilder states
 */
export const statesEqual = (a: QueryBuilderState, b: QueryBuilderState): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Get operators available for a data type (for UI dropdown)
 */
export const getOperatorOptionsForType = (
    dataType: QueryBuilderDataType
): Array<{ value: string; label: string }> => {
    return getOperatorsForType(dataType).map(op => ({
        value: op.value,
        label: op.label,
    }));
};

/**
 * Check if an operator is valid for a data type
 */
export const isOperatorValidForType = (operator: string, dataType: QueryBuilderDataType): boolean => {
    const operators = getOperatorsForType(dataType);
    return operators.some(op => op.value === operator);
};
