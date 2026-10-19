import * as React from 'react';
import {
  Button,
  Input,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  mergeClasses,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  ArrowRightRegular,
  ArrowSortDownRegular,
  ArrowSortUpRegular,
  AutoFitWidthRegular,
  EyeOffRegular,
  FilterRegular,
  GroupListRegular,
} from '@fluentui/react-icons';
import type { Header, Table } from '@tanstack/react-table';
import type { DataGridColumn, DataGridRow } from './DataGrid.types';
import { useDataGridStyles } from './DataGrid.styles';

export interface DataGridColumnMenuProps<T extends DataGridRow> {
  table: Table<T>;
  header: Header<T, unknown>;
  column: DataGridColumn<T> | undefined;
  /** Column key currently grouped by, if any. */
  groupBy: string[];
  onGroupBy: (groupBy: string[]) => void;
  onShowFilter: (columnKey: string) => void;
  onResetWidths: () => void;
  /** Anchor position from the right-click, or null when opened from the caret. */
  position: { x: number; y: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The column header menu.
 *
 * Wording and order follow the Dynamics 365 read-only grid — "A to Z" rather
 * than "Sort ascending", "Filter by" rather than "Filter this column" — so the
 * menu is the one people already know rather than a second vocabulary for the
 * same operations. Opened by the header's chevron or by right-clicking it.
 */
export function DataGridColumnMenu<T extends DataGridRow>(props: DataGridColumnMenuProps<T>) {
  const { table, header, column, groupBy, onGroupBy, onShowFilter, onResetWidths, position, open, onOpenChange } =
    props;
  const styles = useDataGridStyles();
  const id = header.column.id;
  const label = column?.label ?? id;

  const order = table.getState().columnOrder;
  const index = order.indexOf(id);
  const canMoveLeft = index > 0;
  const canMoveRight = index >= 0 && index < order.length - 1;

  const [width, setWidth] = React.useState(() => String(header.getSize()));

  const move = (delta: number) => {
    table.setColumnOrder((current) => {
      const from = current.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const applyWidth = () => {
    const next = Number(width);
    if (!Number.isFinite(next) || next <= 0) return;
    table.setColumnSizing((current) => ({ ...current, [id]: next }));
    onOpenChange(false);
  };

  return (
    <Menu
      open={open}
      onOpenChange={(_, data) => onOpenChange(data.open)}
      positioning={
        position
          ? { position: 'below', align: 'start', target: virtualTarget(position) }
          : { position: 'below', align: 'start' }
      }
    >
      {/* An empty trigger: the menu is opened from the header's chevron and its
          contextmenu handler, not by clicking anything of its own. */}
      <MenuTrigger disableButtonEnhancement>
        <span />
      </MenuTrigger>
      <MenuPopover>
        <MenuList className={styles.menuList}>
          {header.column.getCanSort() && (
            <>
              <MenuItem
                icon={<ArrowSortUpRegular />}
                onClick={() => header.column.toggleSorting(false)}
              >
                A to Z
              </MenuItem>
              <MenuItem
                icon={<ArrowSortDownRegular />}
                onClick={() => header.column.toggleSorting(true)}
              >
                Z to A
              </MenuItem>
            </>
          )}

          {column?.groupable && (
            <>
              <MenuItem
                icon={<GroupListRegular />}
                onClick={() =>
                  onGroupBy(groupBy.includes(id) ? groupBy.filter((k) => k !== id) : [id])
                }
              >
                {groupBy.includes(id) ? 'Ungroup' : 'Group by'}
              </MenuItem>
              {/* Only offered where it would actually nest: grouping by the one
                  column already grouped on is just grouping. */}
              {groupBy.length > 0 && !groupBy.includes(id) && (
                <MenuItem
                  icon={<GroupListRegular />}
                  onClick={() => onGroupBy([...groupBy, id])}
                >
                  Add as subgroup
                </MenuItem>
              )}
            </>
          )}

          {header.column.getCanFilter() && (
            <MenuItem icon={<FilterRegular />} onClick={() => onShowFilter(id)}>
              Filter by
            </MenuItem>
          )}

          <MenuDivider />

          {header.column.getCanResize() && (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <MenuItem icon={<AutoFitWidthRegular />}>Column width</MenuItem>
              </MenuTrigger>
              <MenuPopover>
                <div className={styles.widthEditor}>
                  <Input
                    size="small"
                    type="number"
                    min={32}
                    value={width}
                    aria-label={`${label} width in pixels`}
                    contentAfter={<span className={styles.widthUnit}>px</span>}
                    onChange={(_, data) => setWidth(data.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyWidth();
                    }}
                  />
                  <Button size="small" appearance="primary" onClick={applyWidth}>
                    Apply
                  </Button>
                  <Button size="small" appearance="subtle" onClick={onResetWidths}>
                    Reset all
                  </Button>
                </div>
              </MenuPopover>
            </Menu>
          )}

          <MenuItem
            icon={<ArrowLeftRegular />}
            disabled={!canMoveLeft}
            onClick={() => move(-1)}
          >
            Move left
          </MenuItem>
          <MenuItem
            icon={<ArrowRightRegular />}
            disabled={!canMoveRight}
            onClick={() => move(1)}
          >
            Move right
          </MenuItem>

          <MenuDivider />

          <MenuItem
            icon={<EyeOffRegular />}
            disabled={!header.column.getCanHide()}
            onClick={() => header.column.toggleVisibility(false)}
          >
            Hide column
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

/**
 * A stand-in element at the pointer, so Fluent's positioning can anchor a menu
 * to a right-click that landed on no particular child.
 */
function virtualTarget(position: { x: number; y: number }): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      x: position.x,
      y: position.y,
      top: position.y,
      left: position.x,
      bottom: position.y,
      right: position.x,
      width: 0,
      height: 0,
      toJSON: () => '',
    }),
  } as HTMLElement;
}

export interface DataGridColumnPickerProps<T extends DataGridRow> {
  table: Table<T>;
  columns: DataGridColumn<T>[];
  children: React.ReactElement;
}

/**
 * A show/hide list for every non-reserved column.
 *
 * Exported on its own so a consumer can drop it into their own toolbar without
 * rebuilding the visibility plumbing — the grid does not render a toolbar of
 * its own.
 */
export function DataGridColumnPicker<T extends DataGridRow>({
  table,
  columns,
  children,
}: DataGridColumnPickerProps<T>) {
  const styles = useDataGridStyles();
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>{children}</MenuTrigger>
      <MenuPopover>
        <MenuList className={mergeClasses(styles.menuList)}>
          {columns
            .filter((c) => !c.hidden)
            .map((c) => {
              const tableColumn = table.getColumn(c.key);
              if (!tableColumn) return null;
              const visible = tableColumn.getIsVisible();
              return (
                <MenuItem
                  key={c.key}
                  persistOnClick
                  icon={visible ? <CheckGlyph /> : <span style={{ width: 16 }} />}
                  onClick={() => tableColumn.toggleVisibility(!visible)}
                >
                  {c.label ?? c.key}
                </MenuItem>
              );
            })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

/** A tick, drawn inline so the package does not pull in an icon for one glyph. */
function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M6.2 11.3 3.5 8.6a.75.75 0 0 1 1.06-1.06l2.17 2.17 4.7-4.7a.75.75 0 1 1 1.07 1.06l-5.24 5.23a.75.75 0 0 1-1.06 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
