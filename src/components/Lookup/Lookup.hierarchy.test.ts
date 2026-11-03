import { describe, it, expect } from 'vitest';
import { buildHierarchy, expandedByDefault, flattenHierarchy, pathOf } from './Lookup.hierarchy';

interface Item {
  key: string;
  parent?: string | null;
}

const build = (items: Item[]) => buildHierarchy(items, (item) => item.key, (item) => item.parent);
const keys = (rows: { key: string }[]) => rows.map((row) => row.key);
const allOpen = { isExpanded: () => true };

const TREE: Item[] = [
  { key: 'nz' },
  { key: 'akl', parent: 'nz' },
  { key: 'ponsonby', parent: 'akl' },
  { key: 'wlg', parent: 'nz' },
  { key: 'au' },
  { key: 'syd', parent: 'au' },
];

describe('buildHierarchy', () => {
  it('works out each level from the parent chain', () => {
    const tree = build(TREE);

    expect(tree.depthOf.get('nz')).toBe(0);
    expect(tree.depthOf.get('akl')).toBe(1);
    expect(tree.depthOf.get('ponsonby')).toBe(2);
  });

  it('puts an option whose parent is not in the list at the top', () => {
    // The everyday case of a page of search results, not an error
    const tree = build([{ key: 'akl', parent: 'nz' }]);

    expect(tree.parentOf.get('akl')).toBeNull();
    expect(tree.depthOf.get('akl')).toBe(0);
  });

  it('breaks a cycle rather than looping on it', () => {
    const tree = build([
      { key: 'a', parent: 'b' },
      { key: 'b', parent: 'a' },
    ]);

    expect(keys(flattenHierarchy(tree, allOpen))).toEqual(['a', 'b']);
  });

  it('treats an option naming itself as its parent as a root', () => {
    const tree = build([{ key: 'a', parent: 'a' }]);

    expect(tree.parentOf.get('a')).toBeNull();
  });
});

describe('flattenHierarchy', () => {
  it('lists depth first, keeping siblings in the order given', () => {
    expect(keys(flattenHierarchy(build(TREE), allOpen))).toEqual(['nz', 'akl', 'ponsonby', 'wlg', 'au', 'syd']);
  });

  it('hides the children of a closed node', () => {
    const rows = flattenHierarchy(build(TREE), { isExpanded: (key) => key !== 'nz' });

    expect(keys(rows)).toEqual(['nz', 'au', 'syd']);
    expect(rows[0]).toMatchObject({ hasChildren: true, expanded: false });
  });

  it('opens by level from a defaultExpanded number', () => {
    const rows = flattenHierarchy(build(TREE), { isExpanded: (_, depth) => expandedByDefault(1, depth) });

    expect(keys(rows)).toEqual(['nz', 'akl', 'wlg', 'au', 'syd']);
  });

  it('draws a node with children still to load as expandable', () => {
    const rows = flattenHierarchy(build([{ key: 'nz' }]), { ...allOpen, hasMore: () => true });

    expect(rows[0]).toMatchObject({ hasChildren: true, expanded: false });
  });

  it('narrows a search to the matches and their ancestors, whatever is closed', () => {
    const rows = flattenHierarchy(build(TREE), {
      isExpanded: () => false,
      matches: new Set(['ponsonby']),
    });

    expect(keys(rows)).toEqual(['nz', 'akl', 'ponsonby']);
    expect(rows.map((row) => row.isContext)).toEqual([true, true, false]);
  });
});

describe('pathOf', () => {
  it('returns the ancestors root first', () => {
    expect(keys(pathOf(build(TREE), 'ponsonby'))).toEqual(['nz', 'akl', 'ponsonby']);
  });
});
