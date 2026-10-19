import * as React from 'react';
import {
  Input,
  MenuDivider,
  MenuItemCheckbox,
  MenuItemRadio,
  MenuList,
  mergeClasses,
} from '@fluentui/react-components';
import {
  ArrowResetRegular,
  ColumnTripleRegular,
  FilterRegular,
  SearchRegular,
  TextBulletListSquareRegular,
} from '@fluentui/react-icons';
import type { Table } from '@tanstack/react-table';
import { CommandBar } from '../CommandBar';
import type { CommandBarItem } from '../CommandBar';
// Imported from the module rather than the barrel: these are the bar's own
// ordering rules, and the toolbar has to apply them to place the search box.
import { splitCommandBarItems } from '../CommandBar/CommandBar.utils';
import { useDataGridStyles } from './DataGrid.styles';
import type { DataGridColumn, DataGridDensity, DataGridRow } from './DataGrid.types';

const DENSITIES: DataGridDensity[] = ['compact', 'comfortable', 'spacious'];

/** Stands in for the search box while the commands are being ordered. */
const SEARCH_KEY = '__fue-datagrid-search__';

/** Splits a section either side of the search box, wherever it ended up. */
function sliceAtSearch(section: CommandBarItem[]): {
  before: CommandBarItem[];
  hasSearch: boolean;
  after: CommandBarItem[];
} {
  const at = section.findIndex((entry) => entry.key === SEARCH_KEY);
  if (at < 0) return { before: section, hasSearch: false, after: [] };
  return { before: section.slice(0, at), hasSearch: true, after: section.slice(at + 1) };
}

export interface DataGridToolbarProps<T extends DataGridRow> {
  table: Table<T>;
  columns: DataGridColumn<T>[];
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showFilters: boolean;
  onToggleFilters: () => void;
  density: DataGridDensity;
  onDensityChange: (density: DataGridDensity) => void;
  groupBy: string[];
  onGroupByChange: (groupBy: string[]) => void;
  onResetLayout: () => void;
  /** Commands added to the built-in set. */
  extraItems?: CommandBarItem[];
  /** Which side of the built-in commands they go. Defaults to `end`. */
  extraItemsPlacement?: 'start' | 'end';
  /** Where the search box sits in the running order. Defaults to 100. */
  searchOrder?: number;
  /** Which end of the bar the search box belongs to. Defaults to `right`. */
  searchAlign?: 'left' | 'right';
  /** Replaces the search box. Handed the same value and setter the box uses. */
  renderSearch?: (props: { value: string; onChange: (text: string) => void }) => React.ReactNode;
  /** Columns the app is hiding, shown in the picker but not toggleable. */
  forceHidden?: ReadonlySet<string>;
  className?: string;
}

/**
 * The grid's default toolbar.
 *
 * Built on this library's `CommandBar` rather than a raw Fluent `Toolbar`, so it
 * collapses into an overflow menu on its own — which is what a grid toolbar in a
 * narrow Dynamics form pane needs, and what a hand-rolled row of buttons never
 * does.
 *
 * Everything here is reachable another way (the column menu sorts, groups and
 * hides; density persists), so a consumer replacing it with their own loses no
 * capability. It exists so that the common grid does not have to build one.
 */
export function DataGridToolbar<T extends DataGridRow>(props: DataGridToolbarProps<T>) {
  const {
    table,
    columns,
    search,
    onSearchChange,
    searchPlaceholder = 'Search\u2026',
    showFilters,
    onToggleFilters,
    density,
    onDensityChange,
    groupBy,
    onGroupByChange,
    onResetLayout,
    extraItems,
    extraItemsPlacement = 'end',
    searchOrder = 100,
    searchAlign = 'right',
    renderSearch,
    forceHidden,
    className,
  } = props;
  const styles = useDataGridStyles();

  const groupable = React.useMemo(() => columns.filter((c) => c.groupable), [columns]);
  const hideable = React.useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  /** Columns with no `columnGroup` first, then each group in first-seen order. */
  const pickerSections = React.useMemo(() => {
    const loose: DataGridColumn<T>[] = [];
    const groups = new Map<string, DataGridColumn<T>[]>();
    for (const column of hideable) {
      if (!column.columnGroup) loose.push(column);
      else groups.set(column.columnGroup, [...(groups.get(column.columnGroup) ?? []), column]);
    }
    return { loose, groups: [...groups.entries()] };
  }, [hideable]);

  const items = React.useMemo<CommandBarItem[]>(() => {
    const list: CommandBarItem[] = [
      {
        key: 'filters',
        text: 'Filters',
        icon: <FilterRegular />,
        checked: showFilters,
        title: 'Column filters',
        description: 'Show a filter box under every column header.',
        onClick: onToggleFilters,
      },
    ];

    if (groupable.length > 0) {
      list.push({
        key: 'group',
        text: 'Group',
        icon: <TextBulletListSquareRegular />,
        title: 'Group rows',
        description: 'Collapsible groups, with a subtotal row where one is configured.',
        checked: groupBy.length > 0,
        menuContent: (
          <MenuList className={styles.menuList} checkedValues={{ group: groupBy }}>
            <MenuItemRadio name="none" value="__none__" onClick={() => onGroupByChange([])}>
              None
            </MenuItemRadio>
            {groupable.map((column) => (
              <MenuItemCheckbox
                key={column.key}
                name="group"
                value={column.key}
                // Ticking appends, so the order levels are chosen in is the
                // order they nest.
                onClick={() =>
                  onGroupByChange(
                    groupBy.includes(column.key)
                      ? groupBy.filter((k) => k !== column.key)
                      : [...groupBy, column.key],
                  )
                }
              >
                {column.label ?? column.key}
              </MenuItemCheckbox>
            ))}
          </MenuList>
        ),
      });
    }

    const isVisible = (column: DataGridColumn<T>) =>
      table.getColumn(column.key)?.getIsVisible() !== false;
    const isForced = (column: DataGridColumn<T>) => forceHidden?.has(column.key) === true;

    const columnItem = (column: DataGridColumn<T>) => (
      <MenuItemRadio
        key={column.key}
        name="columns"
        value={column.key}
        persistOnClick
        // Toggling one would do nothing visible, and would quietly change what
        // comes back once the app stops hiding it.
        disabled={isForced(column)}
        onClick={() => {
          const tableColumn = table.getColumn(column.key);
          tableColumn?.toggleVisibility(!tableColumn.getIsVisible());
        }}
      >
        {column.label ?? column.key}
      </MenuItemRadio>
    );

    list.push({
      key: 'columns',
      text: 'Columns',
      icon: <ColumnTripleRegular />,
      title: 'Show or hide columns',
      menuContent: (
        <MenuList
          className={styles.menuList}
          checkedValues={{
            columns: hideable.filter(isVisible).map((c) => c.key),
            columnGroups: pickerSections.groups
              .filter(([, members]) => members.filter((c) => !isForced(c)).every(isVisible))
              .map(([name]) => name),
          }}
        >
          {pickerSections.loose.map(columnItem)}
          {pickerSections.groups.map(([name, members]) => {
            const toggleable = members.filter((c) => !isForced(c));
            const allVisible = toggleable.length > 0 && toggleable.every(isVisible);
            return (
              <React.Fragment key={`group:${name}`}>
                <MenuDivider />
                <MenuItemCheckbox
                  className={styles.menuGroupToggle}
                  name="columnGroups"
                  value={name}
                  persistOnClick
                  disabled={toggleable.length === 0}
                  onClick={() =>
                    table.setColumnVisibility((current) => {
                      const next = { ...current };
                      for (const column of toggleable) next[column.key] = !allVisible;
                      return next;
                    })
                  }
                >
                  {name}
                </MenuItemCheckbox>
                {members.map(columnItem)}
              </React.Fragment>
            );
          })}
        </MenuList>
      ),
    });

    list.push({
      key: 'density',
      text: 'Density',
      icon: <TextBulletListSquareRegular />,
      title: 'Row height',
      menuContent: (
        <MenuList checkedValues={{ density: [density] }}>
          {DENSITIES.map((option) => (
            <MenuItemRadio
              key={option}
              name="density"
              value={option}
              onClick={() => onDensityChange(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </MenuItemRadio>
          ))}
        </MenuList>
      ),
    });

    list.push({
      key: 'reset',
      text: 'Reset layout',
      icon: <ArrowResetRegular />,
      title: 'Reset layout',
      description: 'Drop stored column order, widths, visibility and density.',
      onClick: onResetLayout,
      dividerBefore: true,
    });

    /**
     * Fixed places for the grid's own commands, with gaps between them so a
     * consumer can put something in the middle without renumbering anything.
     */
    const BUILT_IN_ORDER: Record<string, number> = {
      filters: 10,
      group: 20,
      columns: 30,
      density: 40,
      reset: 50,
    };
    const numbered = list.map((builtIn) => ({
      ...builtIn,
      order: builtIn.order ?? BUILT_IN_ORDER[builtIn.key],
    }));

    if (!extraItems?.length) return numbered;

    /**
     * Consumer commands keep working without knowing ordering exists: one that
     * carries no number is given a place from `extraItemsPlacement` — far below
     * the built-ins' 10–50, or far above — so however many there are, they all
     * stay on the side that was asked for. A command that *does* carry a number
     * is left alone, and can land between two built-ins.
     */
    const base = extraItemsPlacement === 'start' ? -1000 : 1000;
    const placed = extraItems.map((extra, index) => ({
      ...extra,
      order: extra.order ?? base + index,
    }));

    if (extraItemsPlacement !== 'start') return [...numbered, ...placed];

    // The first built-in now opens the second group, so it carries the divider
    // rather than whichever consumer command happened to be written first.
    const [first, ...rest] = numbered;
    return [...placed, { ...first, dividerBefore: true }, ...rest];
  }, [
    extraItemsPlacement,
    showFilters,
    onToggleFilters,
    groupable,
    groupBy,
    onGroupByChange,
    hideable,
    pickerSections,
    forceHidden,
    table,
    density,
    onDensityChange,
    onResetLayout,
    extraItems,
    styles.menuList,
    styles.menuGroupToggle,
  ]);

  /**
   * The search box takes part in the ordering as a command would, so that a
   * consumer can place one of its own either side of it. It is not a command,
   * though, so it travels through the sort as a placeholder and is swapped for
   * the real control once its position is known.
   */
  const { left, right } = React.useMemo(
    () => splitCommandBarItems([...items, { key: SEARCH_KEY, order: searchOrder, align: searchAlign }]),
    [items, searchOrder, searchAlign],
  );

  const searchBox = renderSearch ? (
    <div className={styles.toolbarSearch}>
      {renderSearch({ value: search, onChange: onSearchChange })}
    </div>
  ) : (
    <Input
      className={styles.toolbarSearch}
      size="small"
      appearance="filled-darker"
      placeholder={searchPlaceholder}
      contentBefore={<SearchRegular />}
      value={search}
      onChange={(_, data) => onSearchChange(data.value)}
    />
  );

  const leading = sliceAtSearch(left);
  const trailing = sliceAtSearch(right);

  /**
   * A run of commands rendered beside the search rather than around it. Its
   * alignment has already been honoured by placing it here, and a bar told to
   * align them again would move them into its own far region.
   */
  const run = (section: CommandBarItem[]) =>
    section.map((entry) => ({ ...entry, align: undefined }));

  return (
    <div className={mergeClasses(styles.toolbar, className)}>
      {/* The leading run grows, so everything after it is pushed to the far end. */}
      <CommandBar className={styles.toolbarCommands} items={run(leading.before)} size="small" />
      {leading.hasSearch && searchBox}
      {leading.after.length > 0 && (
        <CommandBar className={styles.toolbarCommandsRun} items={run(leading.after)} size="small" />
      )}
      {trailing.before.length > 0 && (
        <CommandBar className={styles.toolbarCommandsRun} items={run(trailing.before)} size="small" />
      )}
      {trailing.hasSearch && searchBox}
      {trailing.after.length > 0 && (
        <CommandBar className={styles.toolbarCommandsRun} items={run(trailing.after)} size="small" />
      )}
    </div>
  );
}
