import { describe, it, expect } from 'vitest';
import {
  attributeChoices,
  attributeToDataType,
  attributeValueKey,
  columnFromAttribute,
  isSystemAttribute,
} from './DataGrid.metadata';
import type { AttributeMetadata } from '../../api/metadata.types';

const attribute = (over: Partial<AttributeMetadata>): AttributeMetadata => ({
  LogicalName: 'field',
  AttributeType: 'String',
  ...over,
});

describe('attributeToDataType', () => {
  it('maps the numeric families apart', () => {
    expect(attributeToDataType(attribute({ AttributeType: 'Integer' }))).toBe('integer');
    expect(attributeToDataType(attribute({ AttributeType: 'Decimal' }))).toBe('decimal');
    expect(attributeToDataType(attribute({ AttributeType: 'Money' }))).toBe('money');
  });

  it('reads a DateOnly attribute as a date, not a datetime', () => {
    // Rendering a time against a value that has none reads as a bug, and the
    // time it shows is meaningless
    expect(
      attributeToDataType(
        attribute({ AttributeType: 'DateTime', DateTimeBehavior: { Value: 'DateOnly' } }),
      ),
    ).toBe('date');
    expect(attributeToDataType(attribute({ AttributeType: 'DateTime' }))).toBe('datetime');
  });

  it('treats every picklist family as a choice', () => {
    for (const type of ['Picklist', 'State', 'Status', 'MultiSelectPicklist']) {
      expect(attributeToDataType(attribute({ AttributeType: type }))).toBe('choice');
    }
  });

  it('treats customer and owner as lookups', () => {
    expect(attributeToDataType(attribute({ AttributeType: 'Lookup' }))).toBe('lookup');
    expect(attributeToDataType(attribute({ AttributeType: 'Customer' }))).toBe('lookup');
    expect(attributeToDataType(attribute({ AttributeType: 'Owner' }))).toBe('lookup');
  });

  it('resolves a virtual multi-select through the suffixed type name', () => {
    expect(
      attributeToDataType(
        attribute({
          AttributeType: 'Virtual',
          AttributeTypeName: { Value: 'MultiSelectPicklistType' },
        }),
      ),
    ).toBe('choice');
  });
});

describe('attributeValueKey', () => {
  it('returns the annotated key for a lookup', () => {
    // The Web API returns `primarycontactid` as `_primarycontactid_value`;
    // asking for the bare name gets nothing back
    expect(attributeValueKey(attribute({ LogicalName: 'primarycontactid', AttributeType: 'Lookup' })))
      .toBe('_primarycontactid_value');
  });

  it('leaves every other type alone', () => {
    expect(attributeValueKey(attribute({ LogicalName: 'name' }))).toBe('name');
  });
});

describe('attributeChoices', () => {
  it('reads a global option set, not just a local one', () => {
    // A global set leaves OptionSet empty; reading only that is the usual cause
    // of a choice column rendering raw integers
    const choices = attributeChoices(
      attribute({
        GlobalOptionSet: {
          Options: [{ Value: 1, Label: { UserLocalizedLabel: { Label: 'Open' } }, Color: '#107c10' }],
        },
      }),
    );
    expect(choices).toEqual([{ value: 1, label: 'Open', color: '#107c10' }]);
  });

  it('falls back to the raw value when an option has no label', () => {
    const choices = attributeChoices(attribute({ OptionSet: { Options: [{ Value: 7 }] } }));
    expect(choices[0].label).toBe('7');
  });
});

describe('isSystemAttribute', () => {
  it('recognises the audit and ownership columns', () => {
    expect(isSystemAttribute('createdby')).toBe(true);
    expect(isSystemAttribute('ModifiedOn')).toBe(true);
    expect(isSystemAttribute('ownerid')).toBe(true);
    expect(isSystemAttribute('hnc_manualcostex')).toBe(false);
  });
});

describe('columnFromAttribute', () => {
  it('locks a column Dataverse will not accept a write to', () => {    const column = columnFromAttribute(
      attribute({ LogicalName: 'calculated', IsValidForUpdate: { Value: false } }),
    );
    expect(column.editable).toBe(false);
  });

  it('lets metadata decide, even for a system column', () => {
    // The checked-in system list must not override the org's own answer: a table
    // configured to allow a write should get an editor
    const column = columnFromAttribute(
      attribute({ LogicalName: 'createdon', AttributeType: 'DateTime', IsValidForUpdate: { Value: true } }),
    );
    expect(column.editable).toBe(true);
  });

  it('gives a system person column a hover card', () => {
    const column = columnFromAttribute(
      attribute({ LogicalName: 'modifiedby', AttributeType: 'Lookup', Targets: ['systemuser'] }),
    );
    expect(column.hoverCard).toBe(true);
    expect(column.lookupEntity).toBe('systemuser');
  });

  it('carries maxLength and precision through to the editor', () => {
    expect(columnFromAttribute(attribute({ MaxLength: 35 })).maxLength).toBe(35);
    expect(
      columnFromAttribute(attribute({ AttributeType: 'Money', Precision: 3 })).precision,
    ).toBe(3);
  });

  it('resolves a lookup through its formatted-value annotation', () => {
    const column = columnFromAttribute(
      attribute({ LogicalName: 'primarycontactid', AttributeType: 'Lookup', Targets: ['contact'] }),
    );
    const row = {
      _primarycontactid_value: 'guid-1',
      '_primarycontactid_value@OData.Community.Display.V1.FormattedValue': 'Jane Smith',
      '_primarycontactid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'contact',
    };
    const value = column.getLookupValue?.({
      value: 'guid-1',
      row,
      rowId: 'r1',
      column,
      // Not touched by getLookupValue, and building a real TanStack row here
      // would tie the test to that library's internals for no gain.
      tableRow: undefined as never,
      readOnly: true,
    });
    expect(value).toEqual({ id: 'guid-1', text: 'Jane Smith', entity: 'contact' });
  });

  it('returns null for an unset lookup rather than an empty reference', () => {
    const column = columnFromAttribute(
      attribute({ LogicalName: 'primarycontactid', AttributeType: 'Lookup' }),
    );
    const value = column.getLookupValue?.({
      value: null,
      row: {},
      rowId: 'r1',
      column,
      tableRow: undefined as never,
      readOnly: true,
    });
    expect(value).toBeNull();
  });

  it('reads a lookup name off the expanded record when no annotation is present', () => {
    // The second of the two routes: metadata says which attribute on the target
    // holds its name, so an $expand can supply it without annotations
    const column = columnFromAttribute(
      attribute({ LogicalName: 'productid', AttributeType: 'Lookup', Targets: ['product'] }),
      [],
      { targetEntity: 'product', navigationProperty: 'productid', nameAttribute: 'name' },
    );
    const value = column.getLookupValue?.({
      value: 'guid-9',
      row: { _productid_value: 'guid-9', productid: { name: 'Widget' } },
      rowId: 'r1',
      column,
      tableRow: undefined as never,
      readOnly: true,
    });
    expect(value?.text).toBe('Widget');
  });

  it('prefers the annotation over the expanded record', () => {
    const column = columnFromAttribute(
      attribute({ LogicalName: 'productid', AttributeType: 'Lookup', Targets: ['product'] }),
      [],
      { targetEntity: 'product', navigationProperty: 'productid', nameAttribute: 'name' },
    );
    const value = column.getLookupValue?.({
      value: 'guid-9',
      row: {
        _productid_value: 'guid-9',
        '_productid_value@OData.Community.Display.V1.FormattedValue': 'Annotated',
        productid: { name: 'Expanded' },
      },
      rowId: 'r1',
      column,
      tableRow: undefined as never,
      readOnly: true,
    });
    expect(value?.text).toBe('Annotated');
  });
});

describe('image columns', () => {
  const imageColumn = () =>
    columnFromAttribute(attribute({ LogicalName: 'entityimage', AttributeType: 'Image' }));

  it('is read-only and takes no part in sorting or filtering', () => {
    const column = imageColumn();
    expect(column.dataType).toBe('image');
    expect(column.editable).toBe(false);
    expect(column.sortable).toBe(false);
    expect(column.filterable).toBe(false);
  });

  it('prefers the _url companion over the inline blob', () => {
    // Selecting the column itself returns the whole picture as base64, so a page
    // of rows becomes megabytes of JSON
    const column = imageColumn();
    const src = column.getImageSrc?.({
      value: 'iVBORw0KGgoAAAA',
      row: { entityimage_url: '/Image/download.aspx?entity=account&id=1' },
      rowId: 'r1',
      column,
      tableRow: undefined as never,
      readOnly: true,
    });
    expect(src).toBe('/Image/download.aspx?entity=account&id=1');
  });

  it('falls back to the inline value when there is no url', () => {
    const column = imageColumn();
    const src = column.getImageSrc?.({
      value: 'iVBORw0KGgoAAAA',
      row: {},
      rowId: 'r1',
      column,
      tableRow: undefined as never,
      readOnly: true,
    });
    expect(src).toBe('data:image/png;base64,iVBORw0KGgoAAAA');
  });
});
