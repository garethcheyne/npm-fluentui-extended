import { labelOf } from '../../api/metadata.types';
import type { AttributeMetadata } from '../../api/metadata.types';
import type { EntityGridColumn, EntityGridSort } from './EntityGrid.types';

/** Suffix Dynamics adds for a display-ready value (lookup names, optionset labels, money). */
export const FORMATTED_VALUE_SUFFIX = '@OData.Community.Display.V1.FormattedValue';

/**
 * Read the display value for a column, preferring the annotation Dynamics attaches.
 * Without this a lookup renders as a GUID and an optionset as a bare integer.
 */
export const formattedValue = (record: Record<string, unknown>, column: string): string => {
  const annotated = record[`${column}${FORMATTED_VALUE_SUFFIX}`];
  if (annotated !== undefined && annotated !== null && annotated !== '') return String(annotated);

  const raw = record[column];
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
};

/**
 * Build the query string for a page.
 *
 * `$count` is requested only on the first page: it is expensive, and the total does
 * not change as the caller walks forward through a stable result set.
 */
export const buildPageQuery = (options: {
  entitySetName: string;
  select: string[];
  filter?: string;
  sort?: EntityGridSort;
  pageSize: number;
  includeCount: boolean;
}): string => {
  const params: string[] = [];

  if (options.select.length > 0) {
    params.push(`$select=${options.select.join(',')}`);
  }
  if (options.filter) {
    params.push(`$filter=${options.filter}`);
  }
  if (options.sort) {
    params.push(`$orderby=${options.sort.column} ${options.sort.direction}`);
  }
  if (options.includeCount) {
    params.push('$count=true');
  }

  return `${options.entitySetName}?${params.join('&')}`;
};

/** Attribute types the Web API returns as `_<name>_value` rather than by name. */
const LOOKUP_TYPES = new Set(['Lookup', 'Customer', 'Owner']);

/**
 * The property each column's value arrives on, by column name.
 *
 * A lookup is the exception in a Web API payload: `primarycontactid` comes back as
 * `_primarycontactid_value`, and `$select=primarycontactid` is rejected outright. A
 * column may be given by either name; one already in `_x_value` form is left alone.
 */
export const columnValueKeys = (
  columns: EntityGridColumn[],
  attributes: AttributeMetadata[],
): Map<string, string> => {
  const byName = new Map(attributes.map((attribute) => [attribute.LogicalName, attribute]));
  return new Map(
    columns.map((column) => {
      const attribute = byName.get(column.name);
      const isLookup = attribute !== undefined && LOOKUP_TYPES.has(String(attribute.AttributeType));
      return [column.name, isLookup ? `_${column.name}_value` : column.name];
    }),
  );
};

/**
 * Columns to request. The primary id is always included so rows have a stable key
 * and can be opened, even when the caller did not ask for it.
 */
export const buildSelect = (
  columns: EntityGridColumn[],
  primaryIdAttribute: string,
  primaryNameAttribute: string,
  valueKeys?: Map<string, string>,
): string[] => {
  const names = new Set<string>([primaryIdAttribute, primaryNameAttribute]);
  columns.forEach((column) => names.add(valueKeys?.get(column.name) ?? column.name));
  return Array.from(names);
};

/** Fill in column labels from attribute metadata, leaving explicit labels alone. */
export const applyMetadataLabels = (
  columns: EntityGridColumn[],
  attributes: AttributeMetadata[],
): EntityGridColumn[] => {
  const byName = new Map(attributes.map((attribute) => [attribute.LogicalName, attribute]));

  return columns.map((column) => ({
    ...column,
    label: column.label ?? labelOf(byName.get(column.name)?.DisplayName, column.name),
  }));
};

/** Toggle sort direction for a column, starting ascending on a new column. */
export const nextSort = (current: EntityGridSort | undefined, column: string): EntityGridSort => {
  if (current?.column === column) {
    return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { column, direction: 'asc' };
};
