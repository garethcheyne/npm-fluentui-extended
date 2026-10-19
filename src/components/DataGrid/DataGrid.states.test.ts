import { describe, it, expect } from 'vitest';
import { resolveCellStateStyle, resolveRowStateStyle, toStateList } from './DataGrid.utils';
import { groupPaths, type GroupPathRow } from './DataGrid.compute';
import { BUILTIN_CELL_STATES, BUILTIN_ROW_STATES } from './DataGrid.tokens';

describe('toStateList', () => {
  it('accepts a single name, a list, or nothing', () => {
    expect(toStateList('dirty')).toEqual(['dirty']);
    expect(toStateList(['muted', 'dirty'])).toEqual(['muted', 'dirty']);
    expect(toStateList(null)).toEqual([]);
    expect(toStateList(undefined)).toEqual([]);
  });

  it('drops default and blanks, which draw nothing', () => {
    expect(toStateList(['default', '', 'error'])).toEqual(['error']);
  });
});

describe('resolveRowStateStyle', () => {
  it('layers states, keeping what an earlier one set and a later one did not', () => {
    // Excluded and dirty: the muted look and the dirty accent together
    const style = resolveRowStateStyle(['muted', 'dirty'], BUILTIN_ROW_STATES);
    expect(style?.opacity).toBe(0.7);
    expect(style?.accent).toBe(BUILTIN_ROW_STATES.dirty.accent);
    expect(style?.background).toBe(BUILTIN_ROW_STATES.dirty.background);
  });

  it('draws later states on top', () => {
    const style = resolveRowStateStyle(['dirty', 'error'], BUILTIN_ROW_STATES);
    expect(style?.background).toBe(BUILTIN_ROW_STATES.error.background);
  });

  it('restyles one built-in state without touching the others', () => {
    const custom = { error: { background: 'pink' } };
    expect(resolveRowStateStyle(['error'], BUILTIN_ROW_STATES, custom)?.background).toBe('pink');
    // The accent the override did not mention survives
    expect(resolveRowStateStyle(['error'], BUILTIN_ROW_STATES, custom)?.accent).toBe(
      BUILTIN_ROW_STATES.error.accent,
    );
    expect(resolveRowStateStyle(['dirty'], BUILTIN_ROW_STATES, custom)?.background).toBe(
      BUILTIN_ROW_STATES.dirty.background,
    );
  });

  it('adds a state that exists only in the consumer', () => {
    const style = resolveRowStateStyle(['flagged'], BUILTIN_ROW_STATES, {
      flagged: { accent: 'orange' },
    });
    expect(style).toEqual({ accent: 'orange' });
  });

  it('skips a name nobody has styled, rather than wiping what came before', () => {
    const style = resolveRowStateStyle(['dirty', 'unknown'], BUILTIN_ROW_STATES);
    expect(style?.background).toBe(BUILTIN_ROW_STATES.dirty.background);
  });

  it('returns null when nothing applies, so the stripe shows', () => {
    expect(resolveRowStateStyle([], BUILTIN_ROW_STATES)).toBeNull();
    expect(resolveRowStateStyle(['unknown'], BUILTIN_ROW_STATES)).toBeNull();
  });

  it('strikes a deleted row through', () => {
    expect(resolveRowStateStyle(['deleted'], BUILTIN_ROW_STATES)?.textDecoration).toBe(
      'line-through',
    );
  });

  it('ignores an override field left undefined', () => {
    const style = resolveRowStateStyle(['dirty'], BUILTIN_ROW_STATES, {
      dirty: { background: undefined, accent: 'teal' },
    });
    expect(style?.background).toBe(BUILTIN_ROW_STATES.dirty.background);
    expect(style?.accent).toBe('teal');
  });
});

describe('resolveCellStateStyle', () => {
  it('resolves a built-in state', () => {
    expect(resolveCellStateStyle('error', BUILTIN_CELL_STATES)).toEqual(BUILTIN_CELL_STATES.error);
  });

  it('adds a consumer state', () => {
    expect(
      resolveCellStateStyle('attention', BUILTIN_CELL_STATES, { attention: { color: 'gold' } }),
    ).toEqual({ color: 'gold' });
  });

  it('can give a state text colour and no fill', () => {
    const style = resolveCellStateStyle('goodText', BUILTIN_CELL_STATES, {
      goodText: { color: 'green' },
    });
    expect(style?.background).toBeUndefined();
  });

  it('merges an override over the built-in fields', () => {
    const style = resolveCellStateStyle('good', BUILTIN_CELL_STATES, {
      good: { background: 'lime' },
    });
    expect(style?.background).toBe('lime');
    expect(style?.fontWeight).toBe(BUILTIN_CELL_STATES.good.fontWeight);
  });

  it('draws nothing for the default state or an unknown name', () => {
    expect(resolveCellStateStyle('default', BUILTIN_CELL_STATES)).toBeNull();
    expect(resolveCellStateStyle(null, BUILTIN_CELL_STATES)).toBeNull();
    expect(resolveCellStateStyle('nope', BUILTIN_CELL_STATES)).toBeNull();
  });
});

describe('groupPaths', () => {
  const leaf = (id: string, depth: number): GroupPathRow => ({
    id,
    depth,
    getIsGrouped: () => false,
  });
  const band = (id: string, depth: number, columnKey: string, value: unknown): GroupPathRow => ({
    id,
    depth,
    getIsGrouped: () => true,
    groupingColumnId: columnKey,
    groupingValue: value,
  });

  it('gives an ungrouped row an empty path', () => {
    expect(groupPaths([leaf('a', 0)]).get('a')).toEqual([]);
  });

  it('records the full path for nested bands and their rows', () => {
    const paths = groupPaths([
      band('t1', 0, 'task', 'Install'),
      band('g1', 1, 'group', 'Hardware'),
      leaf('r1', 2),
      band('g2', 1, 'group', 'Labour'),
      leaf('r2', 2),
      band('t2', 0, 'task', 'Commission'),
      leaf('r3', 1),
    ]);

    expect(paths.get('g1')).toEqual([
      { columnKey: 'task', value: 'Install' },
      { columnKey: 'group', value: 'Hardware' },
    ]);
    expect(paths.get('r2')).toEqual([
      { columnKey: 'task', value: 'Install' },
      { columnKey: 'group', value: 'Labour' },
    ]);
    // A new outermost band ends every inner one still open
    expect(paths.get('r3')).toEqual([{ columnKey: 'task', value: 'Commission' }]);
  });

  it('gives a collapsed band a path even though it has no rows on screen', () => {
    expect(groupPaths([band('t1', 0, 'task', 'Empty')]).get('t1')).toEqual([
      { columnKey: 'task', value: 'Empty' },
    ]);
  });
});
