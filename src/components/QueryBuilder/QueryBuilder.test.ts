import { describe, it, expect } from 'vitest';
import { serializeQueryBuilderState, parseFetchXmlToState, validateQueryBuilderState } from './QueryBuilder';
import type { QueryBuilderField, QueryBuilderState } from './QueryBuilder.types';

const testFields: QueryBuilderField[] = [
    { id: 'name', label: 'Name', dataType: 'string' },
    { id: 'revenue', label: 'Revenue', dataType: 'number' },
    { id: 'createdon', label: 'Created On', dataType: 'datetime' },
    { id: 'isactive', label: 'Is Active', dataType: 'boolean' },
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

describe('serializeQueryBuilderState', () => {
    describe('FetchXML serialization', () => {
        it('serializes a simple equals condition', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Contoso' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('<condition attribute="name" operator="eq" value="Contoso" />');
            expect(result.fetchXml).toContain('<entity name="account">');
        });

        it('serializes contains operator with like pattern', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'contains', value: 'test' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('operator="like"');
            expect(result.fetchXmlFilter).toContain('value="%test%"');
        });

        it('serializes startswith operator with like pattern', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'startswith', value: 'A' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('value="A%"');
        });

        it('serializes endswith operator with like pattern', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'endswith', value: 'Inc' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('value="%Inc"');
        });

        it('serializes null operator', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'null', value: '' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('<condition attribute="name" operator="null" />');
        });

        it('serializes notnull operator', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'notnull', value: '' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('operator="not-null"');
        });

        it('serializes between operator as two conditions', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'revenue', operator: 'between', value: '1000', value2: '5000' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('operator="ge" value="1000"');
            expect(result.fetchXmlFilter).toContain('operator="le" value="5000"');
        });

        it('serializes boolean field as 1 or 0', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'isactive', operator: 'eq', value: true },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('value="1"');
        });

        it('serializes OR logic group', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'or',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'A' },
                            { id: 'cond2', fieldId: 'name', operator: 'eq', value: 'B' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('<filter type="or">');
        });

        it('escapes XML special characters', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: '<script>&"test"</script>' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('&lt;script&gt;');
            expect(result.fetchXmlFilter).toContain('&amp;');
            expect(result.fetchXmlFilter).toContain('&quot;');
        });

        it('wraps multiple groups in outer AND filter', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [{ id: 'cond1', fieldId: 'name', operator: 'eq', value: 'A' }],
                    },
                    {
                        id: 'grp2',
                        logic: 'or',
                        conditions: [{ id: 'cond2', fieldId: 'name', operator: 'eq', value: 'B' }],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            // Should have outer filter wrapping both
            expect(result.fetchXmlFilter).toMatch(/^<filter type="and">/);
            expect(result.fetchXmlFilter).toContain('<filter type="and">');
            expect(result.fetchXmlFilter).toContain('<filter type="or">');
        });

        it('serializes lookup field with GUID value', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            {
                                id: 'cond1',
                                fieldId: 'ownerid',
                                operator: 'eq',
                                value: '12345678-1234-1234-1234-123456789012',
                                valueDisplayName: 'John Doe',
                            },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.fetchXmlFilter).toContain('attribute="ownerid"');
            expect(result.fetchXmlFilter).toContain('value="12345678-1234-1234-1234-123456789012"');
        });
    });

    describe('OData serialization', () => {
        it('serializes simple equals condition', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Contoso' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("name eq 'Contoso'");
        });

        it('serializes contains as contains function', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'contains', value: 'test' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("contains(name, 'test')");
        });

        it('serializes startswith as startswith function', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'startswith', value: 'A' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("startswith(name, 'A')");
        });

        it('serializes endswith as endswith function', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'endswith', value: 'Inc' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("endswith(name, 'Inc')");
        });

        it('serializes null as eq null', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'null', value: '' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe('name eq null');
        });

        it('serializes notnull as ne null', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'notnull', value: '' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe('name ne null');
        });

        it('serializes between as ge and le', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'revenue', operator: 'between', value: 1000, value2: 5000 },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe('(revenue ge 1000 and revenue le 5000)');
        });

        it('serializes number field without quotes', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'revenue', operator: 'gt', value: 50000 },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe('revenue gt 50000');
        });

        it('serializes boolean field as true/false', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'isactive', operator: 'eq', value: true },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe('isactive eq true');
        });

        it('escapes single quotes in string values', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: "O'Brien" },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("name eq 'O''Brien'");
        });

        it('joins multiple conditions with group logic', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'or',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'A' },
                            { id: 'cond2', fieldId: 'name', operator: 'eq', value: 'B' },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("(name eq 'A' or name eq 'B')");
        });

        it('joins multiple groups with AND', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [{ id: 'cond1', fieldId: 'name', operator: 'eq', value: 'A' }],
                    },
                    {
                        id: 'grp2',
                        logic: 'and',
                        conditions: [{ id: 'cond2', fieldId: 'revenue', operator: 'gt', value: 1000 }],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("name eq 'A' and revenue gt 1000");
        });

        it('serializes lookup field with GUID as quoted string', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            {
                                id: 'cond1',
                                fieldId: 'ownerid',
                                operator: 'eq',
                                value: '12345678-1234-1234-1234-123456789012',
                            },
                        ],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.odataFilter).toBe("ownerid eq '12345678-1234-1234-1234-123456789012'");
        });
    });

    describe('result structure', () => {
        it('returns state, fetchXmlFilter, fetchXml, and odataFilter', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [{ id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Test' }],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result).toHaveProperty('state');
            expect(result).toHaveProperty('fetchXmlFilter');
            expect(result).toHaveProperty('fetchXml');
            expect(result).toHaveProperty('odataFilter');
        });

        it('returns cloned state (not same reference)', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [{ id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Test' }],
                    },
                ],
            };

            const result = serializeQueryBuilderState(state, testFields, 'account');

            expect(result.state).not.toBe(state);
            expect(result.state.groups).not.toBe(state.groups);
        });
    });
});

describe('parseFetchXmlToState', () => {
    describe('successful parsing', () => {
        it('parses simple equals condition', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter type="and">
                            <condition attribute="name" operator="eq" value="Contoso" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.error).toBeNull();
            expect(result.state).not.toBeNull();
            expect(result.state!.groups).toHaveLength(1);
            expect(result.state!.groups[0].logic).toBe('and');
            expect(result.state!.groups[0].conditions).toHaveLength(1);
            expect(result.state!.groups[0].conditions[0].fieldId).toBe('name');
            expect(result.state!.groups[0].conditions[0].operator).toBe('eq');
            expect(result.state!.groups[0].conditions[0].value).toBe('Contoso');
        });

        it('parses like operator with contains pattern', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter>
                            <condition attribute="name" operator="like" value="%test%" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.error).toBeNull();
            expect(result.state!.groups[0].conditions[0].operator).toBe('contains');
            expect(result.state!.groups[0].conditions[0].value).toBe('test');
        });

        it('parses like operator with startswith pattern', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter>
                            <condition attribute="name" operator="like" value="A%" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups[0].conditions[0].operator).toBe('startswith');
            expect(result.state!.groups[0].conditions[0].value).toBe('A');
        });

        it('parses like operator with endswith pattern', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter>
                            <condition attribute="name" operator="like" value="%Inc" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups[0].conditions[0].operator).toBe('endswith');
            expect(result.state!.groups[0].conditions[0].value).toBe('Inc');
        });

        it('parses not-null operator', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter>
                            <condition attribute="name" operator="not-null" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups[0].conditions[0].operator).toBe('notnull');
        });

        it('parses OR filter logic', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter type="or">
                            <condition attribute="name" operator="eq" value="A" />
                            <condition attribute="name" operator="eq" value="B" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups[0].logic).toBe('or');
            expect(result.state!.groups[0].conditions).toHaveLength(2);
        });

        it('parses multiple filter groups', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter type="and">
                            <condition attribute="name" operator="eq" value="A" />
                        </filter>
                        <filter type="or">
                            <condition attribute="revenue" operator="gt" value="1000" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups).toHaveLength(2);
            expect(result.state!.groups[0].logic).toBe('and');
            expect(result.state!.groups[1].logic).toBe('or');
        });

        it('defaults to AND logic when type not specified', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter>
                            <condition attribute="name" operator="eq" value="Test" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups[0].logic).toBe('and');
        });

        it('maps attribute to known field', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter>
                            <condition attribute="revenue" operator="gt" value="1000" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups[0].conditions[0].fieldId).toBe('revenue');
        });

        it('preserves unknown attribute names', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter>
                            <condition attribute="unknownfield" operator="eq" value="test" />
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state!.groups[0].conditions[0].fieldId).toBe('unknownfield');
        });
    });

    describe('error handling', () => {
        it('returns error for empty input', () => {
            const result = parseFetchXmlToState('', testFields);

            expect(result.state).toBeNull();
            expect(result.error).toBe('Please enter FetchXML content.');
        });

        it('returns error for whitespace-only input', () => {
            const result = parseFetchXmlToState('   \n\t  ', testFields);

            expect(result.state).toBeNull();
            expect(result.error).toBe('Please enter FetchXML content.');
        });

        it('returns error for invalid XML', () => {
            const result = parseFetchXmlToState('<fetch><entity></fetch>', testFields);

            expect(result.state).toBeNull();
            expect(result.error).toContain('XML parsing error');
        });

        it('returns error when no filter conditions found', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <attribute name="name" />
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.state).toBeNull();
            expect(result.error).toContain('No filter conditions found');
        });
    });

    describe('edge cases', () => {
        it('handles filter with no conditions by creating default condition', () => {
            const xml = `
                <fetch>
                    <entity name="account">
                        <filter type="and">
                        </filter>
                    </entity>
                </fetch>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.error).toBeNull();
            expect(result.state!.groups).toHaveLength(1);
            expect(result.state!.groups[0].conditions).toHaveLength(1);
        });

        it('parses just filter fragment without fetch wrapper', () => {
            const xml = `
                <filter type="and">
                    <condition attribute="name" operator="eq" value="Test" />
                </filter>
            `;

            const result = parseFetchXmlToState(xml, testFields);

            expect(result.error).toBeNull();
            expect(result.state!.groups).toHaveLength(1);
        });
    });
});

describe('validateQueryBuilderState', () => {
    describe('valid queries', () => {
        it('returns valid for complete query', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Test' },
                        ],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('allows empty value for null operator', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'null', value: '' },
                        ],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(true);
        });

        it('allows empty value for notnull operator', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'notnull', value: '' },
                        ],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(true);
        });
    });

    describe('invalid queries', () => {
        it('returns error for empty value', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'name', operator: 'eq', value: '' },
                        ],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toBe('Value is required');
            expect(result.errors[0].fieldLabel).toBe('Name');
        });

        it('returns error for missing second value in between operator', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'revenue', operator: 'between', value: '100', value2: '' },
                        ],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Second value'))).toBe(true);
        });

        it('returns error for unknown field', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', fieldId: 'unknownfield', operator: 'eq', value: 'Test' },
                        ],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(false);
            expect(result.errors[0].message).toContain('Unknown field');
        });

        it('returns error for empty group', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(false);
            expect(result.errors[0].message).toBe('Group has no conditions');
        });

        it('returns error for related entity without selection', () => {
            const state: QueryBuilderState = {
                groups: [
                    {
                        id: 'grp1',
                        logic: 'and',
                        conditions: [
                            { id: 'cond1', kind: 'relatedEntity', fieldId: '', operator: 'eq', value: '', relatedEntityName: '' },
                        ],
                    },
                ],
            };

            const result = validateQueryBuilderState(state, testFields);

            expect(result.isValid).toBe(false);
            expect(result.errors[0].message).toBe('Related entity not selected');
        });
    });
});
