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

            expect(result.fetchXmlFilter).toContain('operator="between"');
            expect(result.fetchXmlFilter).toContain('<value>1000</value>');
            expect(result.fetchXmlFilter).toContain('<value>5000</value>');
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

            // OData uses _fieldname_value format for lookups, and GUIDs are not quoted
            expect(result.odataFilter).toBe("_ownerid_value eq 12345678-1234-1234-1234-123456789012");
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

            expect(result.state!.groups[0].conditions[0].operator).toBe('begins-with');
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

            expect(result.state!.groups[0].conditions[0].operator).toBe('ends-with');
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

            expect(result.state!.groups[0].conditions[0].operator).toBe('not-null');
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

describe('serializeQueryBuilderState - Related Entity (link-entity)', () => {
    const testFieldsWithLookup: QueryBuilderField[] = [
        { id: 'name', label: 'Name', dataType: 'string' },
        { id: 'ownerid', label: 'Owner', dataType: 'lookup', targets: [{ entityLogicalName: 'systemuser' }, { entityLogicalName: 'team' }] },
        { id: 'pricelevelid', label: 'Price List', dataType: 'lookup', targets: [{ entityLogicalName: 'pricelevel' }] },
    ];

    it('serializes related entity condition as link-entity', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [
                                {
                                    id: 'nested1',
                                    fieldId: 'fullname',
                                    operator: 'eq',
                                    value: 'John Doe',
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        expect(result.fetchXml).toContain('<link-entity name="systemuser"');
        expect(result.fetchXml).toContain('from="systemuserid"');
        expect(result.fetchXml).toContain('to="ownerid"');
        expect(result.fetchXml).toContain('<condition attribute="fullname" operator="eq" value="John Doe"');
    });

    it('serializes related entity with OR nested logic', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedLogic: 'or',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'eq', value: 'John' },
                                { id: 'nested2', fieldId: 'fullname', operator: 'eq', value: 'Jane' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        expect(result.fetchXml).toContain('<filter type="or">');
        expect(result.fetchXml).toContain('value="John"');
        expect(result.fetchXml).toContain('value="Jane"');
    });

    it('serializes multiple related entity conditions', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'contains', value: 'Admin' },
                            ],
                        },
                        {
                            id: 'cond2',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'pricelevelid',
                            relatedEntityTarget: 'pricelevel',
                            nestedConditions: [
                                { id: 'nested2', fieldId: 'name', operator: 'eq', value: 'Standard' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        expect(result.fetchXml).toContain('<link-entity name="systemuser"');
        expect(result.fetchXml).toContain('<link-entity name="pricelevel"');
        expect(result.fetchXml).toContain('to="ownerid"');
        expect(result.fetchXml).toContain('to="pricelevelid"');
    });

    it('serializes nested condition with null operator', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'email', operator: 'null', value: '' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        expect(result.fetchXml).toContain('<condition attribute="email" operator="null"');
    });

    it('combines regular condition with related entity condition', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Contoso' },
                        {
                            id: 'cond2',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'eq', value: 'John' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        expect(result.fetchXml).toContain('<condition attribute="name" operator="eq" value="Contoso"');
        expect(result.fetchXml).toContain('<link-entity name="systemuser"');
    });

    it('includes empty link-entity when nested conditions are empty', () => {
        // Note: Empty nested conditions still generate link-entity (design decision)
        // Validation should catch this case before serialization
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Test' },
                        {
                            id: 'cond2',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        // Serializer still outputs link-entity (validation should prevent this case)
        expect(result.fetchXml).toContain('<link-entity');
        expect(result.fetchXml).toContain('<condition attribute="name"');
    });

    it('serializes related entity to OData using navigation property syntax', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'primarycontactid',
                            relatedEntityTarget: 'contact',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'firstname', operator: 'eq', value: 'John' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        // OData should use navigation property syntax: primarycontactid/firstname eq 'John'
        expect(result.odataFilter).toBe("primarycontactid/firstname eq 'John'");
    });

    it('serializes related entity with multiple nested conditions to OData', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedLogic: 'and',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'eq', value: 'John Doe' },
                                { id: 'nested2', fieldId: 'emailaddress1', operator: 'notnull', value: '' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        // Multiple conditions should be combined with logic operator
        expect(result.odataFilter).toBe("(ownerid/fullname eq 'John Doe' and ownerid/emailaddress1 ne null)");
    });

    it('serializes related entity with OR logic to OData', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedLogic: 'or',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'eq', value: 'John' },
                                { id: 'nested2', fieldId: 'fullname', operator: 'eq', value: 'Jane' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        // OR logic for multiple conditions
        expect(result.odataFilter).toBe("(ownerid/fullname eq 'John' or ownerid/fullname eq 'Jane')");
    });

    it('combines regular and related entity conditions in OData', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Contoso' },
                        {
                            id: 'cond2',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'contains', value: 'Admin' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFieldsWithLookup, 'account');

        // Both regular condition and related entity condition should be in OData
        expect(result.odataFilter).toBe("(name eq 'Contoso' and contains(ownerid/fullname, 'Admin'))");
    });
});

describe('serializeQueryBuilderState - Additional operators', () => {
    const testFields: QueryBuilderField[] = [
        { id: 'name', label: 'Name', dataType: 'string' },
        { id: 'revenue', label: 'Revenue', dataType: 'number' },
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
    ];

    it('serializes less than (lt) operator', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'revenue', operator: 'lt', value: 5000 },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.fetchXmlFilter).toContain('operator="lt" value="5000"');
        expect(result.odataFilter).toBe('revenue lt 5000');
    });

    it('serializes not equals (ne) operator', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'ne', value: 'Test' },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.fetchXmlFilter).toContain('operator="ne" value="Test"');
        expect(result.odataFilter).toBe("name ne 'Test'");
    });

    it('serializes optionset value as integer', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'statecode', operator: 'eq', value: 0 },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.fetchXmlFilter).toContain('value="0"');
        expect(result.odataFilter).toBe('statecode eq 0');
    });

    it('serializes datetime field in ISO format', () => {
        const dateValue = '2025-01-15T10:30:00.000Z';
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'createdon', operator: 'gt', value: dateValue },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.fetchXmlFilter).toContain(`value="${dateValue}"`);
        expect(result.odataFilter).toContain(dateValue);
    });

    it('serializes datetime field without quotes in OData', () => {
        // This specifically tests that datetime values are NOT wrapped in quotes
        // OData requires datetime values as unquoted ISO 8601 format
        const testFields: QueryBuilderField[] = [
            { id: 'createdon', label: 'Created On', dataType: 'datetime' },
        ];

        const dateValue = '2025-06-20';
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'createdon', operator: 'ge', value: dateValue },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        // OData should NOT have quotes around datetime value
        // Should be: createdon ge 2025-06-20T00:00:00Z
        // NOT: createdon ge '2025-06-20T00:00:00Z'
        expect(result.odataFilter).toBe('createdon ge 2025-06-20T00:00:00Z');
        expect(result.odataFilter).not.toContain("'2025-06-20");
    });

    it('serializes datetime between operator correctly in OData', () => {
        const testFields: QueryBuilderField[] = [
            { id: 'createdon', label: 'Created On', dataType: 'datetime' },
        ];

        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'createdon', operator: 'between', value: '2025-01-01', value2: '2025-12-31' },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        // Both date values should be unquoted with time component
        expect(result.odataFilter).toBe('(createdon ge 2025-01-01T00:00:00Z and createdon le 2025-12-31T00:00:00Z)');
    });
});

describe('validateQueryBuilderState - Related entity validation', () => {
    const testFields: QueryBuilderField[] = [
        { id: 'name', label: 'Name', dataType: 'string' },
        { id: 'ownerid', label: 'Owner', dataType: 'lookup', targets: [{ entityLogicalName: 'systemuser' }] },
    ];

    it('validates related entity with valid nested conditions', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'eq', value: 'John' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = validateQueryBuilderState(state, testFields);

        // Related entity with nested conditions should be valid
        // (actual validation depends on implementation)
        expect(result.errors.filter(e => e.message === 'Related entity not selected')).toHaveLength(0);
    });

    it('returns error when related entity has no nested conditions', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [],
                        },
                    ],
                },
            ],
        };

        const result = validateQueryBuilderState(state, testFields);

        expect(result.isValid).toBe(false);
    });

    it('returns error when nested condition has empty value', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedConditions: [
                                { id: 'nested1', fieldId: 'fullname', operator: 'eq', value: '' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = validateQueryBuilderState(state, testFields);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.message === 'Value is required')).toBe(true);
    });
});

describe('serializeQueryBuilderState - in/not-in operators', () => {
    it('serializes in operator with multiple values to FetchXML', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'field',
                            fieldId: 'statecode',
                            operator: 'in',
                            value: [1, 2, 3],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.fetchXmlFilter).toContain('operator="in"');
        expect(result.fetchXmlFilter).toContain('<value>1</value>');
        expect(result.fetchXmlFilter).toContain('<value>2</value>');
        expect(result.fetchXmlFilter).toContain('<value>3</value>');
    });

    it('serializes not-in operator with multiple values to FetchXML', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'field',
                            fieldId: 'statecode',
                            operator: 'not-in',
                            value: [100, 200],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.fetchXmlFilter).toContain('operator="not-in"');
        expect(result.fetchXmlFilter).toContain('<value>100</value>');
        expect(result.fetchXmlFilter).toContain('<value>200</value>');
    });

    it('serializes in operator to OData', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'field',
                            fieldId: 'statecode',
                            operator: 'in',
                            value: [1, 2, 3],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.odataFilter).toBe('statecode in (1, 2, 3)');
    });

    it('serializes not-in operator to OData with multiple ne conditions', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'field',
                            fieldId: 'statecode',
                            operator: 'not-in',
                            value: [100, 200],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.odataFilter).toContain('statecode ne 100');
        expect(result.odataFilter).toContain('statecode ne 200');
        expect(result.odataFilter).toContain(' and ');
    });

    it('handles single value in array for in operator', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        {
                            id: 'cond1',
                            kind: 'field',
                            fieldId: 'statecode',
                            operator: 'in',
                            value: [42],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        expect(result.fetchXmlFilter).toContain('operator="in"');
        expect(result.fetchXmlFilter).toContain('<value>42</value>');
    });
});

describe('parseFetchXmlToState - in/not-in operators', () => {
    it('parses in operator with multiple value elements', () => {
        const xml = `
            <fetch>
                <entity name="account">
                    <filter type="and">
                        <condition attribute="statecode" operator="in">
                            <value>1</value>
                            <value>2</value>
                            <value>3</value>
                        </condition>
                    </filter>
                </entity>
            </fetch>
        `;

        const result = parseFetchXmlToState(xml, testFields);

        expect(result.error).toBeNull();
        expect(result.state!.groups[0].conditions[0].operator).toBe('in');
        expect(result.state!.groups[0].conditions[0].value).toEqual([1, 2, 3]);
    });

    it('parses not-in operator with multiple value elements', () => {
        const xml = `
            <fetch>
                <entity name="account">
                    <filter type="and">
                        <condition attribute="statecode" operator="not-in">
                            <value>100</value>
                            <value>200</value>
                        </condition>
                    </filter>
                </entity>
            </fetch>
        `;

        const result = parseFetchXmlToState(xml, testFields);

        expect(result.error).toBeNull();
        expect(result.state!.groups[0].conditions[0].operator).toBe('not-in');
        expect(result.state!.groups[0].conditions[0].value).toEqual([100, 200]);
    });

    it('parses in operator with string values', () => {
        const xml = `
            <fetch>
                <entity name="account">
                    <filter type="and">
                        <condition attribute="name" operator="in">
                            <value>Contoso</value>
                            <value>Microsoft</value>
                        </condition>
                    </filter>
                </entity>
            </fetch>
        `;

        const result = parseFetchXmlToState(xml, testFields);

        expect(result.error).toBeNull();
        expect(result.state!.groups[0].conditions[0].operator).toBe('in');
        expect(result.state!.groups[0].conditions[0].value).toEqual(['Contoso', 'Microsoft']);
    });
});

describe('validateQueryBuilderState - in/not-in operators', () => {
    const testFields: QueryBuilderField[] = [
        { id: 'name', label: 'Name', dataType: 'string' },
        {
            id: 'statecode',
            label: 'Status',
            dataType: 'optionset',
            options: [
                { label: 'Active', value: 1 },
                { label: 'Inactive', value: 2 },
            ],
        },
    ];

    it('validates in operator with array of values', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'statecode', operator: 'in', value: [1, 2] },
                    ],
                },
            ],
        };

        const result = validateQueryBuilderState(state, testFields);

        expect(result.isValid).toBe(true);
    });

    it('returns error for in operator with empty array', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'statecode', operator: 'in', value: [] },
                    ],
                },
            ],
        };

        const result = validateQueryBuilderState(state, testFields);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].message).toBe('Value is required');
    });

    it('returns error for not-in operator with undefined value', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'statecode', operator: 'not-in', value: undefined },
                    ],
                },
            ],
        };

        const result = validateQueryBuilderState(state, testFields);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].message).toBe('Value is required');
    });

    it('returns error for in operator with array of only empty values', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'in', value: ['', '  '] },
                    ],
                },
            ],
        };

        const result = validateQueryBuilderState(state, testFields);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].message).toBe('Value is required');
    });
});

describe('XML and OData validation - complex scenarios', () => {
    const testFields: QueryBuilderField[] = [
        { id: 'name', label: 'Name', dataType: 'string' },
        { id: 'revenue', label: 'Revenue', dataType: 'number' },
        { id: 'isactive', label: 'Active', dataType: 'boolean' },
        {
            id: 'statecode',
            label: 'Status',
            dataType: 'optionset',
            options: [
                { label: 'Active', value: 1 },
                { label: 'Inactive', value: 2 },
                { label: 'Pending', value: 3 },
            ],
        },
        { id: 'ownerid', label: 'Owner', dataType: 'lookup', targets: [{ entityLogicalName: 'systemuser' }] },
    ];

    it('produces parseable FetchXML for complex multi-group query', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'or',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'contains', value: 'Test' },
                        { id: 'cond2', fieldId: 'statecode', operator: 'in', value: [1, 2] },
                    ],
                },
                {
                    id: 'grp2',
                    logic: 'and',
                    conditions: [
                        { id: 'cond3', fieldId: 'revenue', operator: 'gt', value: 10000 },
                        { id: 'cond4', fieldId: 'isactive', operator: 'eq', value: true },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        // Verify the FetchXML can be parsed back
        const parseResult = parseFetchXmlToState(result.fetchXml, testFields);
        expect(parseResult.error).toBeNull();
        expect(parseResult.state).not.toBeNull();
        expect(parseResult.state!.groups.length).toBeGreaterThanOrEqual(1);
    });

    it('escapes special XML characters in values', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'eq', value: '<script>alert("XSS")</script> & test' },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account');

        // Verify escaped characters
        expect(result.fetchXml).toContain('&lt;script&gt;');
        expect(result.fetchXml).toContain('&amp;');
        expect(result.fetchXml).toContain('&quot;');
        // Verify the FetchXML is still parseable
        const parseResult = parseFetchXmlToState(result.fetchXml, testFields);
        expect(parseResult.error).toBeNull();
    });

    it('produces valid OData for in operator with special characters', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'in', value: ["O'Brien", "McDonald's"] },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account', 'accounts');

        // Verify single quotes are escaped in OData
        expect(result.odataFilter).toContain("''Brien");
        expect(result.odataFilter).toContain("McDonald''s");
        // Verify basic OData structure
        expect(result.odataFilter).toContain('name in (');
    });

    it('produces valid OData for multiple conditions with all operators', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'startswith', value: 'Test' },
                        { id: 'cond2', fieldId: 'revenue', operator: 'between', value: 1000, value2: 5000 },
                        { id: 'cond3', fieldId: 'statecode', operator: 'not-in', value: [2, 3] },
                        { id: 'cond4', fieldId: 'isactive', operator: 'notnull', value: '' },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account', 'accounts');

        // Verify all operators are properly represented
        expect(result.odataFilter).toContain('startswith(name,');
        expect(result.odataFilter).toContain('revenue ge 1000');
        expect(result.odataFilter).toContain('revenue le 5000');
        expect(result.odataFilter).toContain('statecode ne 2');
        expect(result.odataFilter).toContain('statecode ne 3');
        expect(result.odataFilter).toContain('isactive ne null');
    });

    it('produces valid output for related entity with complex nested conditions', () => {
        const state: QueryBuilderState = {
            groups: [
                {
                    id: 'grp1',
                    logic: 'and',
                    conditions: [
                        { id: 'cond1', fieldId: 'name', operator: 'eq', value: 'Contoso' },
                        {
                            id: 'cond2',
                            kind: 'relatedEntity',
                            fieldId: '',
                            operator: 'containsdata',
                            value: '',
                            relatedEntityName: 'ownerid',
                            relatedEntityTarget: 'systemuser',
                            nestedLogic: 'or',
                            nestedFields: [
                                { id: 'fullname', label: 'Full Name', dataType: 'string' },
                                { id: 'emailaddress1', label: 'Email', dataType: 'string' },
                            ],
                            nestedConditions: [
                                { id: 'n1', fieldId: 'fullname', operator: 'contains', value: 'Admin' },
                                { id: 'n2', fieldId: 'emailaddress1', operator: 'endswith', value: '@contoso.com' },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = serializeQueryBuilderState(state, testFields, 'account', 'accounts');

        // FetchXML checks
        expect(result.fetchXml).toContain('<link-entity name="systemuser"');
        expect(result.fetchXml).toContain('<filter type="or">');
        expect(result.fetchXml).toContain('operator="like" value="%Admin%"');
        expect(result.fetchXml).toContain('operator="like" value="%@contoso.com"');

        // OData checks
        expect(result.odataFilter).toContain("name eq 'Contoso'");
        expect(result.odataFilter).toContain("contains(ownerid/fullname, 'Admin')");
        expect(result.odataFilter).toContain("endswith(ownerid/emailaddress1, '@contoso.com')");
        expect(result.odataFilter).toContain(' or '); // nested OR logic
    });
});
