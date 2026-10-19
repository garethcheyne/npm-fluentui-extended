import * as React from 'react';
import {
  Dropdown,
  Option,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  ArrowSortRegular,
  ColumnTripleRegular,
  FilterRegular,
  TextBulletListSquareRegular,
} from '@fluentui/react-icons';
import { CommandBar } from '../../../src/components/CommandBar';
import { DataGrid, useEntityColumns } from '../../../src/components/DataGrid';
import type { DataGridDensity, DataGridHandle } from '../../../src/components/DataGrid';
import type { CommandBarItem } from '../../../src/components/CommandBar';
import {
  childTableFor,
  fetchChildRows,
  fetchParentName,
  readTargets,
  type DataverseTarget,
} from './dataverse';

const useStyles = makeStyles({
  frame: {
    height: '520px',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  picker: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalS,
    flexWrap: 'wrap',
  },
  note: {
    color: tokens.colorNeutralForeground3,
  },
});

/**
 * The grid against a real org.
 *
 * Nothing here declares a column type, a label, or an option set: the entity
 * name is the whole configuration, and `useEntityColumns` reads the rest out of
 * Dataverse. That is the point of the component — a developer building a web
 * resource writes the query and gets a grid that already matches the form it
 * sits beside.
 */
export function DataGridLiveExample({ connected }: { connected: boolean }) {
  const styles = useStyles();
  const gridRef = React.useRef<DataGridHandle | null>(null);

  const targets = React.useMemo(readTargets, []);
  const [target, setTarget] = React.useState<DataverseTarget | null>(targets[0] ?? null);
  const child = target ? childTableFor(target.entity) : null;

  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [parentName, setParentName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [density, setDensity] = React.useState<DataGridDensity>('compact');
  const [showFilters, setShowFilters] = React.useState(false);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  /**
   * Edits, staged locally.
   *
   * Nothing is written back — this example reads a real record and stops there.
   * The handler still has to exist, though: a grid with no `onCellChange` is
   * read-only whatever the metadata says a column allows.
   */
  const [pending, setPending] = React.useState<Record<string, Record<string, unknown>>>({});

  const getCellValue = React.useCallback(
    (_row: Record<string, unknown>, key: string, rowId: string, base: unknown) =>
      pending[rowId]?.[key] !== undefined ? pending[rowId][key] : base,
    [pending],
  );

  const handleCellChange = React.useCallback(
    (row: Record<string, unknown>, key: string, value: unknown, rowId: string) => {
      setPending((prev) => {
        const next = { ...prev };
        const rowChanges = { ...(next[rowId] ?? {}) };
        if (Object.is(value, row[key])) delete rowChanges[key];
        else rowChanges[key] = value;
        if (Object.keys(rowChanges).length === 0) delete next[rowId];
        else next[rowId] = rowChanges;
        return next;
      });
    },
    [],
  );

  const pendingCount = Object.values(pending).reduce((n, v) => n + Object.keys(v).length, 0);

  /**
   * The columns to show, by logical name only.
   *
   * `createdby` and `modifiedby` need no configuration at all — the grid
   * recognises them as system columns, locks them, and gives each a hover card,
   * because "who did this" is the question they are on a grid to answer.
   *
   * A name the table does not have is dropped with a console warning rather than
   * reaching `$select`, where Dataverse would reject the whole query over it.
   */
  /**
   * Columns per child table.
   *
   * Only keys and layout hints — label, type, precision, choices, editability
   * and lookup targets all come from the entity's own metadata. The price list
   * set mirrors what the PriceList app grids, so the two can be compared
   * against the same record.
   */
  const requestedColumns = React.useMemo(() => {
    if (child?.entity === 'hnc_productpricelevel') {
      return [
        { key: '_hnc_productid_value', width: 260, flex: 1 },
        { key: 'hnc_alternatecode', width: 120 },
        { key: 'hnc_grouping', width: 120, groupable: true },
        { key: 'hnc_manualcostex' },
        { key: 'hnc_productlowestcostex' },
        { key: 'hnc_pricelevelrulemethod', groupable: true },
        { key: 'hnc_pricelevelrulevalue' },
        { key: 'hnc_overridemethod', groupable: true },
        { key: 'hnc_overridevalue' },
        { key: 'hnc_productdynamicsellex' },
        { key: 'hnc_productfixedsellex' },
        { key: 'hnc_productsellex', summary: 'sum' as const },
        { key: 'hnc_usedynamicpricing', groupable: true },
        { key: 'hnc_usercommercialpricing', groupable: true },
        { key: 'hnc_exclude', groupable: true },
        { key: '_modifiedby_value' },
        { key: 'modifiedon' },
      ];
    }

    return [
      // The line's product. A catalogue line carries the reference and takes its
      // name from it; a write-in line has only `productdescription`, so both are
      // shown.
      //
      // `flex` hands this column whatever width is left once every other column
      // has taken its own, so the grid fills its container rather than leaving a
      // band of dead space down the right. `width` stays as the floor it starts
      // from and drops back to once the columns no longer fit.
      { key: '_productid_value', width: 240, flex: 1 },
      { key: 'quantity', summary: 'sum' as const },
      { key: 'priceperunit' },
      { key: 'manualdiscountamount' },
      { key: 'tax' },
      { key: 'extendedamount', summary: 'sum' as const },
      { key: 'ispriceoverridden', groupable: true },
      { key: '_createdby_value' },
      { key: 'createdon' },
      { key: '_modifiedby_value' },
      { key: 'modifiedon' },
    ];
  }, [child?.entity]);

  const {
    columns,
    select,
    expand,
    loading: metadataLoading,
    error: metadataError,
  } = useEntityColumns({
    entityName: child?.entity ?? '',
    columns: requestedColumns,
    enabled: connected && child != null,
  });

  const load = React.useCallback(async () => {
    if (!target || !connected || select.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const [fetched, name] = await Promise.all([
        fetchChildRows(target, select, expand),
        fetchParentName(target),
      ]);
      setRows(fetched);
      setParentName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [target, connected, select, expand]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const commands = React.useMemo<CommandBarItem[]>(
    () => [
      {
        key: 'refresh',
        text: 'Refresh',
        icon: <ArrowClockwiseRegular />,
        title: 'Refresh',
        description: 'Re-read the child rows from Dataverse.',
        onClick: () => void load(),
        disabled: loading || !connected,
      },
      {
        key: 'discard',
        text: pendingCount > 0 ? `Discard ${pendingCount}` : 'Discard',
        icon: <ArrowClockwiseRegular />,
        title: 'Discard staged edits',
        description: 'Edits here are staged in the browser only — nothing is written to Dataverse.',
        disabled: pendingCount === 0,
        onClick: () => setPending({}),
      },
      {
        key: 'filters',
        text: 'Filters',
        icon: <FilterRegular />,
        checked: showFilters,
        title: 'Column filters',
        description: 'Show a filter box under every column header.',
        onClick: () => setShowFilters((v) => !v),
        dividerBefore: true,
      },
      {
        key: 'group',
        text: groupBy.length > 0 ? 'Ungroup' : 'Group',
        icon: <TextBulletListSquareRegular />,
        title: 'Group rows',
        description: 'Group by a column on the table, with a subtotal per group.',
        // The price list item has no createdby column in the requested set, so
        // each table groups by something it actually carries.
        onClick: () =>
          setGroupBy((current) =>
            current.length > 0
              ? []
              : [child?.entity === 'hnc_productpricelevel' ? 'hnc_grouping' : '_createdby_value'],
          ),
      },
      {
        key: 'density',
        text: 'Density',
        icon: <ArrowSortRegular />,
        title: 'Row height',
        subItems: (['compact', 'comfortable', 'spacious'] as const).map((option) => ({
          key: option,
          text: option,
          checked: density === option,
          onClick: () => setDensity(option),
        })),
        dividerBefore: true,
      },
      {
        key: 'reset',
        text: 'Reset layout',
        icon: <ColumnTripleRegular />,
        title: 'Reset layout',
        description: 'Drop stored column order, widths, visibility and density.',
        onClick: () => gridRef.current?.resetLayout(),
      },
    ],
    [load, loading, connected, showFilters, groupBy, density, child?.entity, pendingCount],
  );

  if (targets.length === 0) {
    return (
      <Text block className={styles.note}>
        Set <code>VITE_DYNAMICS_DATAGRID_01</code> in <code>testHarness/.env</code> to a D365 query
        string — <code>etn=opportunity&amp;id=&lt;guid&gt;</code> — to grid a real record here.
      </Text>
    );
  }

  return (
    <>
      <div className={styles.picker}>
        <Dropdown
          size="small"
          value={target ? `${target.entity} · ${target.name}` : ''}
          selectedOptions={target ? [target.name] : []}
          onOptionSelect={(_, data) =>
            setTarget(targets.find((t) => t.name === data.optionValue) ?? null)
          }
          style={{ minWidth: 320 }}
        >
          {targets.map((option) => (
            <Option key={option.name} value={option.name}>
              {`${option.entity} · ${option.name}`}
            </Option>
          ))}
        </Dropdown>
        {parentName && (
          <Text className={styles.note}>
            {`${parentName} — ${child?.entity ?? ''} lines`}
          </Text>
        )}
        {metadataLoading && <Spinner size="tiny" label="Reading schema…" />}
      </div>

      {!connected ? (
        <Text block className={styles.note}>
          Connect to Dynamics using the button in the header to load this grid.
        </Text>
      ) : !child ? (
        <Text block className={styles.note}>
          {`No child table is mapped for "${target?.entity}".`}
        </Text>
      ) : (
        <div className={styles.frame}>
          <DataGrid
            ref={gridRef}
            data={rows}
            columns={columns}
            getRowId={(row, index) =>
              String(row[`${child.entity}id`] ?? row.activityid ?? `row-${index}`)
            }
            selectable
            selectedRowIds={selected}
            onSelectionChange={setSelected}
            getCellValue={getCellValue}
            onCellChange={handleCellChange}
            getRowState={(_row, rowId) => (pending[rowId] ? 'dirty' : null)}
            density={density}
            onDensityChange={setDensity}
            showFilters={showFilters}
            onShowFiltersChange={setShowFilters}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupSubtotals
            loading={loading || metadataLoading}
            loadingMessage="Loading rows…"
            error={error ?? metadataError?.message}
            emptyMessage="This record has no lines."
            persist={{ scope: `harness-live-${child.entity}` }}
            toolbar={<CommandBar items={commands} />}
          />
        </div>
      )}
    </>
  );
}
