import * as React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGrid } from './DataGrid';
import { DataGridFilterPopover } from './DataGridFilterPopover';
import { defaultFilterOperator, filterOperatorsFor, matchesFilter } from './DataGrid.filter';
import type { DataGridColumn } from './DataGrid.types';

beforeAll(() => {
  // As in the render tests: jsdom measures everything as zero, which leaves the
  // virtualiser rendering no rows at all.
  for (const prop of ['clientHeight', 'offsetHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => 600 });
  }
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 600, width: 1000, height: 600, toJSON: () => '' };
  } as never;
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

type Row = Record<string, unknown>;
const text = (s: string) => () => s;
const col = (dataType?: DataGridColumn<Row>['dataType'], extra: Partial<DataGridColumn<Row>> = {}) =>
  ({ key: 'x', dataType, ...extra }) as DataGridColumn<Row>;

describe('column filter operators', () => {
  it('offers operators that suit the column type', () => {
    expect(filterOperatorsFor('money')).toContain('gt');
    expect(filterOperatorsFor('string')).toContain('beginsWith');
    expect(filterOperatorsFor('string')).not.toContain('gt');
    expect(filterOperatorsFor('date')).toEqual(['on', 'onOrAfter', 'onOrBefore', 'notNull', 'null']);
    expect(defaultFilterOperator('string')).toBe('contains');
    expect(defaultFilterOperator('money')).toBe('eq');
  });

  it('compares numbers as numbers, reading "1,000" as 1000', () => {
    const money = col('money');
    expect(matchesFilter(1500, money, text('1,500.00'), { operator: 'gt', value: '1,000' })).toBe(true);
    expect(matchesFilter(500, money, text('500.00'), { operator: 'gt', value: '1,000' })).toBe(false);
    expect(matchesFilter(1000, money, text('1,000.00'), { operator: 'le', value: '1000' })).toBe(true);
  });

  it('matches text on what the cell shows', () => {
    const str = col('string');
    expect(matchesFilter('x', str, text('Laundry'), { operator: 'beginsWith', value: 'LAUN' })).toBe(true);
    expect(matchesFilter('x', str, text('Laundry'), { operator: 'endsWith', value: 'laun' })).toBe(false);
    // A plain string is the filter row's "contains".
    expect(matchesFilter('x', str, text('Laundry'), 'dry')).toBe(true);
  });

  it('tests for data present or absent without a value', () => {
    const str = col('string');
    expect(matchesFilter('', str, text(''), { operator: 'null' })).toBe(true);
    expect(matchesFilter('a', str, text('a'), { operator: 'null' })).toBe(false);
    expect(matchesFilter('a', str, text('a'), { operator: 'notNull' })).toBe(true);
  });

  it('matches a date on its day, a boolean on yes/no and a choice on its value', () => {
    expect(matchesFilter('2026-03-04T15:30:00', col('datetime'), text(''), { operator: 'on', value: '2026-03-04' })).toBe(true);
    expect(matchesFilter('2026-03-04', col('date'), text(''), { operator: 'onOrAfter', value: '2026-03-05' })).toBe(false);
    expect(matchesFilter(true, col('boolean'), text('Yes'), { operator: 'eq', value: 'true' })).toBe(true);
    expect(matchesFilter(2, col('choice'), text('Closed'), { operator: 'ne', value: '1' })).toBe(true);
  });

  it('lets everything through when a filter has no value to test', () => {
    expect(matchesFilter(5, col('money'), text('5'), { operator: 'gt', value: '' })).toBe(true);
  });
});

describe('lookup columns filter and search on the name they show', () => {
  interface Line extends Record<string, unknown> {
    id: string;
    ruleId: string;
  }
  const RULES: Record<string, string> = { g1: 'LAUNDRY', g2: 'COOKING' };
  const rows: Line[] = [
    { id: 'a', ruleId: 'g1' },
    { id: 'b', ruleId: 'g2' },
    { id: 'c', ruleId: 'g2' },
  ];
  const columns: DataGridColumn<Line>[] = [
    {
      key: 'ruleId',
      label: 'Rule',
      dataType: 'lookup',
      // The stored value is an id; the name only exists through the resolver.
      getLookupValue: (ctx) => ({ id: String(ctx.value), text: RULES[String(ctx.value)] ?? '' }),
    },
  ];
  const dataRows = () => document.querySelectorAll('tbody tr[data-row-id]');

  it('finds a row by part of the lookup name in the toolbar search', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> data={rows} columns={columns} getRowId={(r) => r.id} globalFilter="laun" />
      </FluentProvider>,
    );
    expect(dataRows()).toHaveLength(1);
  });

  it('finds a row by part of the lookup name in the column filter', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> data={rows} columns={columns} getRowId={(r) => r.id} showFilters />
      </FluentProvider>,
    );
    const filter = screen.getByLabelText('Filter Rule');
    fireEvent.change(filter, { target: { value: 'cook' } });
    fireEvent.keyDown(filter, { key: 'Enter' });
    expect(dataRows()).toHaveLength(2);
  });

  it('offers Clear filter in the column menu only while the column is filtered', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> data={rows} columns={columns} getRowId={(r) => r.id} showFilters />
      </FluentProvider>,
    );
    const openMenu = () => fireEvent.click(screen.getByLabelText('Rule column options'));

    openMenu();
    expect(screen.queryByText('Clear filter')).toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    const filter = screen.getByLabelText('Filter Rule');
    fireEvent.change(filter, { target: { value: 'cook' } });
    fireEvent.keyDown(filter, { key: 'Enter' });
    expect(dataRows()).toHaveLength(2);

    openMenu();
    fireEvent.click(screen.getByText('Clear filter'));
    expect(dataRows()).toHaveLength(3);
  });
});

describe('the Filter by panel', () => {
  const price = { key: 'price', label: 'Price', dataType: 'money' } as DataGridColumn<Row>;

  function renderPanel(value: unknown, onApply = vi.fn(), onOpenChange = vi.fn()) {
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGridFilterPopover
          open
          onOpenChange={onOpenChange}
          target={document.body}
          column={price}
          value={value}
          onApply={onApply}
        />
      </FluentProvider>,
    );
    return { onApply, onOpenChange };
  }

  it('applies the operator and value, then closes', () => {
    const { onApply, onOpenChange } = renderPanel(undefined);
    expect(screen.getByText('Filter by')).toBeInTheDocument();
    // Apply waits for a value.
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Price value'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ operator: 'eq', value: '200' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears an applied filter, and offers Clear only when there is one', () => {
    const { onApply } = renderPanel({ operator: 'gt', value: '100' });
    // Opens on what is applied.
    expect((screen.getByLabelText('Price value') as HTMLInputElement).value).toBe('100');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onApply).toHaveBeenCalledWith(undefined);
  });
});
