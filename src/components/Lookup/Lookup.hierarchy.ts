/**
 * Tree arithmetic shared by the Lookup and the OptionSetField.
 *
 * Options arrive flat, each naming its parent, and the level is worked out from
 * that chain rather than supplied. A level passed alongside a parent is a second
 * statement of the same fact, and the day the two disagree there is no saying
 * which one the list should believe.
 */

export interface Hierarchy<T> {
  byKey: Map<string, T>;
  /** Resolved parent of each item: `null` for a root, an orphan or a broken cycle. */
  parentOf: Map<string, string | null>;
  /** Children in the order the items were given. Roots are under `null`. */
  childrenOf: Map<string | null, string[]>;
  depthOf: Map<string, number>;
}

/** One visible row of a flattened tree. */
export interface HierarchyRow<T> {
  item: T;
  key: string;
  depth: number;
  /** Has children among the items, or has said it has more to load. */
  hasChildren: boolean;
  expanded: boolean;
  /**
   * Shown only to place a search match in the tree - it did not match itself.
   * A flat list of matches loses exactly what a hierarchy is for: which
   * "Auckland" it is.
   */
  isContext: boolean;
}

export interface FlattenOptions<T> {
  /** Whether a node's children are shown. Ignored while `matches` is set. */
  isExpanded: (key: string, depth: number) => boolean;
  /** A node with children still to load, so it is drawn as expandable while it has none. */
  hasMore?: (item: T) => boolean;
  /**
   * Keys matching a search. Set, the tree narrows to those and their ancestors,
   * all opened - a match hidden under a collapsed parent is a match not found.
   */
  matches?: Set<string> | null;
}

/**
 * Index a flat list by its parent links.
 *
 * Neither an unknown parent nor a cycle is an error here. A parent outside the
 * list is the everyday case of a page of search results, and a cycle is bad
 * data the list still has to draw: an orphan becomes a root, and each cycle is
 * broken at its first-listed member.
 */
export function buildHierarchy<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  parentKeyOf: (item: T) => string | null | undefined,
): Hierarchy<T> {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    if (!byKey.has(key)) byKey.set(key, item);
  }

  const parentOf = new Map<string, string | null>();
  for (const [key, item] of byKey) {
    const parent = parentKeyOf(item);
    parentOf.set(key, parent != null && parent !== key && byKey.has(parent) ? parent : null);
  }

  for (const key of byKey.keys()) {
    const seen = new Set<string>([key]);
    let current = parentOf.get(key) ?? null;
    while (current !== null) {
      if (seen.has(current)) {
        parentOf.set(key, null);
        break;
      }
      seen.add(current);
      current = parentOf.get(current) ?? null;
    }
  }

  const childrenOf = new Map<string | null, string[]>();
  for (const key of byKey.keys()) {
    const parent = parentOf.get(key) ?? null;
    const siblings = childrenOf.get(parent);
    if (siblings) siblings.push(key);
    else childrenOf.set(parent, [key]);
  }

  const depthOf = new Map<string, number>();
  const depth = (key: string): number => {
    const known = depthOf.get(key);
    if (known !== undefined) return known;
    const parent = parentOf.get(key) ?? null;
    const value = parent === null ? 0 : depth(parent) + 1;
    depthOf.set(key, value);
    return value;
  };
  for (const key of byKey.keys()) depth(key);

  return { byKey, parentOf, childrenOf, depthOf };
}

/** The rows a tree shows, depth first, siblings in the order they were given. */
export function flattenHierarchy<T>(hierarchy: Hierarchy<T>, options: FlattenOptions<T>): HierarchyRow<T>[] {
  const { byKey, parentOf, childrenOf, depthOf } = hierarchy;
  const { isExpanded, hasMore, matches } = options;

  let included: Set<string> | null = null;
  if (matches) {
    included = new Set();
    for (const key of matches) {
      let current: string | null = byKey.has(key) ? key : null;
      while (current !== null && !included.has(current)) {
        included.add(current);
        current = parentOf.get(current) ?? null;
      }
    }
  }

  const rows: HierarchyRow<T>[] = [];
  const visit = (key: string) => {
    const item = byKey.get(key) as T;
    const depth = depthOf.get(key) ?? 0;
    const children = (childrenOf.get(key) ?? []).filter((child) => !included || included.has(child));
    const hasChildren = (childrenOf.get(key)?.length ?? 0) > 0 || Boolean(hasMore?.(item));
    const expanded = children.length > 0 && (included ? true : isExpanded(key, depth));

    rows.push({ item, key, depth, hasChildren, expanded, isContext: Boolean(matches && !matches.has(key)) });
    if (expanded) children.forEach(visit);
  };

  for (const root of childrenOf.get(null) ?? []) {
    if (!included || included.has(root)) visit(root);
  }
  return rows;
}

/** The item and its ancestors, root first. */
export function pathOf<T>(hierarchy: Hierarchy<T>, key: string): T[] {
  const path: T[] = [];
  let current: string | null = hierarchy.byKey.has(key) ? key : null;
  while (current !== null) {
    path.unshift(hierarchy.byKey.get(current) as T);
    current = hierarchy.parentOf.get(current) ?? null;
  }
  return path;
}

/** Whether a node opens by default, from a `defaultExpanded` setting. */
export const expandedByDefault = (setting: 'all' | 'none' | number, depth: number): boolean =>
  setting === 'all' ? true : setting === 'none' ? false : depth < setting;
