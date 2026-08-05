import { describe, it, expect } from 'vitest';
import {
  applyMetadataLabels,
  buildPageQuery,
  buildSelect,
  formattedValue,
  nextSort,
  FORMATTED_VALUE_SUFFIX,
} from './EntityGrid.utils';
import type { AttributeMetadata } from '../../api/metadata.types';

describe('formattedValue', () => {
  it('prefers the annotation over the raw value', () => {
    // Without this a lookup renders its GUID and an optionset its integer
    const record = {
      primarycontactid: '00000000-0000-0000-0000-000000000001',
      [`primarycontactid${FORMATTED_VALUE_SUFFIX}`]: 'Jane Smith',
    };

    expect(formattedValue(record, 'primarycontactid')).toBe('Jane Smith');
  });

  it('falls back to the raw value when no annotation is present', () => {
    expect(formattedValue({ name: 'Contoso' }, 'name')).toBe('Contoso');
  });

  it('renders empty for null, undefined and missing columns', () => {
    expect(formattedValue({ name: null }, 'name')).toBe('');
    expect(formattedValue({}, 'name')).toBe('');
  });

  it('preserves a numeric zero rather than treating it as empty', () => {
    expect(formattedValue({ revenue: 0 }, 'revenue')).toBe('0');
  });
});

describe('buildSelect', () => {
  it('always includes the primary id and name, without duplicating them', () => {
    const select = buildSelect([{ name: 'name' }, { name: 'revenue' }], 'accountid', 'name');

    expect(select).toContain('accountid');
    expect(select).toContain('revenue');
    expect(select.filter((entry) => entry === 'name')).toHaveLength(1);
  });
});

describe('buildPageQuery', () => {
  const base = {
    entitySetName: 'accounts',
    select: ['accountid', 'name'],
    pageSize: 25,
    includeCount: false,
  };

  it('builds select and orderby', () => {
    const query = buildPageQuery({ ...base, sort: { column: 'name', direction: 'asc' } });

    expect(query).toBe('accounts?$select=accountid,name&$orderby=name asc');
  });

  it('includes the filter when supplied', () => {
    const query = buildPageQuery({ ...base, filter: 'statecode eq 0' });

    expect(query).toContain('$filter=statecode eq 0');
  });

  it('requests the count only on the first page', () => {
    expect(buildPageQuery({ ...base, includeCount: true })).toContain('$count=true');
    expect(buildPageQuery({ ...base, includeCount: false })).not.toContain('$count');
  });
});

describe('applyMetadataLabels', () => {
  const attributes: AttributeMetadata[] = [
    { LogicalName: 'name', DisplayName: { UserLocalizedLabel: { Label: 'Account Name' } } },
    { LogicalName: 'revenue', DisplayName: { UserLocalizedLabel: { Label: 'Annual Revenue' } } },
  ];

  it('fills in labels from metadata', () => {
    const columns = applyMetadataLabels([{ name: 'name' }], attributes);

    expect(columns[0].label).toBe('Account Name');
  });

  it('leaves an explicit label alone', () => {
    const columns = applyMetadataLabels([{ name: 'name', label: 'Customer' }], attributes);

    expect(columns[0].label).toBe('Customer');
  });

  it('falls back to the logical name when metadata has no match', () => {
    const columns = applyMetadataLabels([{ name: 'sample_custom' }], attributes);

    expect(columns[0].label).toBe('sample_custom');
  });
});

describe('nextSort', () => {
  it('starts a new column ascending', () => {
    expect(nextSort(undefined, 'name')).toEqual({ column: 'name', direction: 'asc' });
    expect(nextSort({ column: 'revenue', direction: 'desc' }, 'name')).toEqual({
      column: 'name',
      direction: 'asc',
    });
  });

  it('toggles direction on the active column', () => {
    expect(nextSort({ column: 'name', direction: 'asc' }, 'name')).toEqual({
      column: 'name',
      direction: 'desc',
    });
    expect(nextSort({ column: 'name', direction: 'desc' }, 'name')).toEqual({
      column: 'name',
      direction: 'asc',
    });
  });
});
