import * as React from 'react';
import { getHierarchyChildren, searchHierarchy } from '../api/hierarchy';
import type { HierarchyQueryOptions, HierarchyRecord } from '../api/hierarchy';
import type { LookupOption, LookupProps } from '../components/Lookup/Lookup.types';

export interface UseHierarchyLookupOptions extends Omit<HierarchyQueryOptions, 'signal' | 'headers'> {
  /** Shape each record into an option - to add secondary text, an icon. */
  toOption?: (record: HierarchyRecord, option: LookupOption) => LookupOption;
  /** Called when a request fails. The list keeps what it had. */
  onError?: (error: Error) => void;
}

/** The Lookup props the hook supplies. Spread them onto a `<Lookup>`. */
export type HierarchyLookupProps = Required<
  Pick<LookupProps, 'hierarchical' | 'options' | 'loading' | 'onSearchChange' | 'onLoadChildren' | 'disableClientFilter'>
>;

/**
 * A Lookup over a Dataverse table's own hierarchy: the top of the tree to
 * start with, children fetched as nodes are opened, and a search that brings
 * back each match with its ancestors.
 *
 * ```tsx
 * const hierarchy = useHierarchyLookup('account', { filter: 'statecode eq 0' });
 * <Lookup {...hierarchy} selectedOption={value} onOptionSelect={setValue} showPath />
 * ```
 *
 * The table's parent column is read from its hierarchical relationship, so
 * nothing about the table has to be passed beyond its name.
 */
export function useHierarchyLookup(
  entityLogicalName: string,
  options: UseHierarchyLookupOptions = {},
): HierarchyLookupProps {
  const [records, setRecords] = React.useState<LookupOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Read at call time: callers pass these inline, and a new object each render must not refetch
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  // Only the latest search may land; an earlier, slower one would overwrite it
  const requestRef = React.useRef(0);

  const toOptions = React.useCallback(
    (found: HierarchyRecord[]): LookupOption[] =>
      found.map((record) => {
        const option: LookupOption = {
          key: record.id,
          text: record.name,
          parentKey: record.parentId,
          hasChildren: record.hasChildren,
          entityName: entityLogicalName,
          recordId: record.id,
          data: record.raw,
        };
        return optionsRef.current.toOption ? optionsRef.current.toOption(record, option) : option;
      }),
    [entityLogicalName],
  );

  const run = React.useCallback(
    (load: (query: HierarchyQueryOptions) => Promise<HierarchyRecord[]>) => {
      const request = ++requestRef.current;
      setLoading(true);
      const { toOption: _toOption, onError: _onError, ...query } = optionsRef.current;
      load(query)
        .then((found) => {
          if (request === requestRef.current) setRecords(toOptions(found));
        })
        .catch((err: Error) => {
          if (request === requestRef.current) optionsRef.current.onError?.(err);
        })
        .finally(() => {
          if (request === requestRef.current) setLoading(false);
        });
    },
    [toOptions],
  );

  const loadRoots = React.useCallback(
    () => run((query) => getHierarchyChildren(entityLogicalName, null, query)),
    [run, entityLogicalName],
  );

  React.useEffect(() => {
    loadRoots();
    return () => {
      // An unmounted list ignores whatever is still in flight
      requestRef.current++;
    };
  }, [loadRoots]);

  const onSearchChange = React.useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        loadRoots();
        return;
      }
      run((query) => searchHierarchy(entityLogicalName, trimmed, query));
    },
    [run, loadRoots, entityLogicalName],
  );

  const onLoadChildren = React.useCallback(
    async (option: LookupOption): Promise<LookupOption[]> => {
      const { toOption: _toOption, onError, ...query } = optionsRef.current;
      try {
        return toOptions(await getHierarchyChildren(entityLogicalName, option.key, query));
      } catch (err) {
        onError?.(err as Error);
        throw err;
      }
    },
    [toOptions, entityLogicalName],
  );

  return {
    hierarchical: true,
    options: records,
    loading,
    onSearchChange,
    onLoadChildren,
    disableClientFilter: true,
  };
}
