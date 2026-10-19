import { describe, it, expect } from 'vitest';
import { orderCommandBarItems, splitCommandBarItems } from './CommandBar.utils';
import type { CommandBarItem } from './CommandBar.types';

/**
 * Where commands end up in the bar.
 *
 * The rule these pin is that ordering is opt-in: a bar that numbers nothing has
 * to render exactly the list it was given, or every existing consumer's toolbar
 * quietly rearranges itself. Only once a number is set does it take effect, and
 * then only against the section it is in.
 */

const item = (key: string, extra: Partial<CommandBarItem> = {}): CommandBarItem => ({
  key,
  text: key,
  ...extra,
});

const keys = (items: CommandBarItem[]) => items.map((i) => i.key);

describe('orderCommandBarItems', () => {
  it('leaves a list that orders nothing exactly as it was written', () => {
    const items = [item('save'), item('add'), item('delete')];

    expect(keys(orderCommandBarItems(items))).toEqual(['save', 'add', 'delete']);
  });

  it('places the commands that carry a number', () => {
    const items = [
      item('density', { order: 40 }),
      item('filters', { order: 10 }),
      item('columns', { order: 30 }),
      item('group', { order: 20 }),
    ];

    expect(keys(orderCommandBarItems(items))).toEqual(['filters', 'group', 'columns', 'density']);
  });

  it('lets an unnumbered command follow the one before it', () => {
    // Numbering only `reset` should not send everything written before it to
    // the end — each unnumbered command simply keeps its place in the run.
    const items = [item('filters', { order: 10 }), item('mine'), item('reset', { order: 50 })];

    expect(keys(orderCommandBarItems(items))).toEqual(['filters', 'mine', 'reset']);
  });

  it('keeps the written sequence when two commands share a number', () => {
    const items = [item('a', { order: 10 }), item('b', { order: 10 }), item('c', { order: 10 })];

    expect(keys(orderCommandBarItems(items))).toEqual(['a', 'b', 'c']);
  });

  it('takes a command to the front when its number says so', () => {
    const items = [item('filters', { order: 10 }), item('save', { order: -10 })];

    expect(keys(orderCommandBarItems(items))).toEqual(['save', 'filters']);
  });

  it('fits a command between two of the built-in numbers', () => {
    // The gaps in the defaults exist precisely so this needs no renumbering.
    const items = [
      item('filters', { order: 10 }),
      item('group', { order: 20 }),
      item('mine', { order: 15 }),
    ];

    expect(keys(orderCommandBarItems(items))).toEqual(['filters', 'mine', 'group']);
  });
});

describe('splitCommandBarItems', () => {
  it('sends the right-aligned commands to their own section', () => {
    const { left, right } = splitCommandBarItems([
      item('save'),
      item('search', { align: 'right' }),
      item('add'),
    ]);

    expect(keys(left)).toEqual(['save', 'add']);
    expect(keys(right)).toEqual(['search']);
  });

  it('orders each section against itself, not against the other', () => {
    /**
     * The case from the brief: search sits at 100 on the right, and a command
     * numbered 101 lands after it — without having to out-number anything on
     * the left.
     */
    const { left, right } = splitCommandBarItems([
      item('filters', { order: 10 }),
      item('mine', { order: 101, align: 'right' }),
      item('search', { order: 100, align: 'right' }),
      item('reset', { order: 50 }),
    ]);

    expect(keys(left)).toEqual(['filters', 'reset']);
    expect(keys(right)).toEqual(['search', 'mine']);
  });

  it('treats a command with no alignment as a left one', () => {
    const { left, right } = splitCommandBarItems([item('save'), item('add', { align: 'left' })]);

    expect(keys(left)).toEqual(['save', 'add']);
    expect(right).toEqual([]);
  });
});
