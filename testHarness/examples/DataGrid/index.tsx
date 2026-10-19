import * as React from 'react';
import {
  Button,
  Input,
  Switch,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowUndoRegular,
  CalculatorRegular,
  CopyRegular,
  DeleteRegular,
  EraserRegular,
  OpenRegular,
  SearchRegular,
  TargetArrowRegular,
  TextBulletListSquareRegular,
} from '@fluentui/react-icons';
import { CommandBar } from '../../../src/components/CommandBar';
import { DataGrid } from '../../../src/components/DataGrid';
import type { SystemUserRecord } from '../../../src/api/systemUser';
import type {
  DataGridColumn,
  DataGridDensity,
  DataGridFill,
  DataGridHandle,
  DataGridRowMove,
} from '../../../src/components/DataGrid';
import { DataGridLiveExample } from './Live';

// ─── Mock data ───────────────────────────────────────────────────────────────

interface QuoteLine extends Record<string, unknown> {
  id: string;
  lineNo: number;
  productId: string;
  productCode: string;
  productName: string;
  productPhoto: string;
  productSwatch: string;
  notes: string;
  category: string;
  quantity: number;
  costEx: number;
  sellEx: number;
  margin: number;
  discount: number;
  status: number;
  inStock: boolean;
  requiredBy: string;
  createdById: string;
  modifiedById: string;
  modifiedOn: string;
}

const CATEGORIES = ['Appliances', 'Audio Visual', 'Computing', 'Furniture', 'Whitegoods'];

const SWATCHES = ['#0f6cbd', '#107c10', '#c50f1f', '#8764b8', '#ca5010'];

/**
 * A product photo as a URL, which is the common case.
 *
 * A real photo rather than a generated shape, so the hover preview shows what
 * the column is actually for — checking an image, which a 20px thumbnail can
 * never do on its own. Seeded by index so a row keeps the same picture across
 * re-renders.
 */
function productPhotoUrl(index: number): string {
  return `https://picsum.photos/seed/fue-${index % 60}/240/240`;
}

/**
 * The same product, as bare base64.
 *
 * Encoded inline with no MIME prefix and no network, which is exactly the shape
 * a Dataverse image column returns — the format has to be sniffed from the
 * leading bytes before an `<img>` will take it.
 */
function productSwatch(index: number): string {
  const fill = SWATCHES[index % SWATCHES.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">` +
    `<rect width="120" height="120" rx="12" fill="${fill}"/>` +
    `<text x="60" y="72" font-family="Segoe UI, sans-serif" font-size="40" fill="white" ` +
    `text-anchor="middle">${CATEGORIES[index % CATEGORIES.length][0]}</text></svg>`;
  return btoa(svg);
}

/** Stands in for `systemuser`, so the audit columns resolve to a name. */
interface Person {
  id: string;
  name: string;
  jobTitle: string;
  email: string;
}

const PEOPLE: Person[] = [
  { id: 'u1', name: 'Ana Bowen', jobTitle: 'Account Manager', email: 'ana.bowen@contoso.com' },
  { id: 'u2', name: 'Devi Raman', jobTitle: 'Sales Engineer', email: 'devi.raman@contoso.com' },
  { id: 'u3', name: 'Sam Okafor', jobTitle: 'Pricing Analyst', email: 'sam.okafor@contoso.com' },
  { id: 'u4', name: 'Lena Fischer', jobTitle: 'Commercial Lead', email: 'lena.fischer@contoso.com' },
];

const PEOPLE_BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));

/** Stands in for `product`, so the product cell has a catalogue to search. */
const CATALOGUE = Array.from({ length: 300 }, (_, i) => ({
  id: `p${i}`,
  code: `SKU-${String(10000 + i)}`,
  name: `${CATEGORIES[i % CATEGORIES.length]} item ${i + 1}`,
}));

/** Enough rows that virtualisation is doing real work rather than being decorative. */
function makeRows(count: number): QuoteLine[] {
  const rows: QuoteLine[] = [];
  for (let i = 0; i < count; i++) {
    const costEx = Math.round((50 + ((i * 37) % 4000)) * 100) / 100;
    const sellEx = Math.round(costEx * (1.1 + ((i % 7) * 0.05)) * 100) / 100;
    rows.push({
      id: `line-${i}`,
      lineNo: i + 1,
      productId: `p${i % CATALOGUE.length}`,
      productCode: `SKU-${String(10000 + i)}`,
      productName: `${CATEGORIES[i % CATEGORIES.length]} item ${i + 1}`,
      productPhoto: productPhotoUrl(i),
      productSwatch: productSwatch(i),
      notes: i % 5 === 0 ? `Customer asked for delivery before the ${(i % 28) + 1}th.` : '',
      category: CATEGORIES[i % CATEGORIES.length],
      quantity: 1 + (i % 12),
      costEx,
      sellEx,
      margin: Math.round(((sellEx - costEx) / sellEx) * 1000) / 10,
      discount: (i % 5) * 2.5,
      status: (i % 3) + 1,
      inStock: i % 4 !== 0,
      requiredBy: new Date(Date.now() + (i % 60) * 86_400_000).toISOString(),
      createdById: PEOPLE[i % PEOPLE.length].id,
      modifiedById: PEOPLE[(i + 2) % PEOPLE.length].id,
      modifiedOn: new Date(Date.now() - i * 86_400_000).toISOString(),
    });
  }
  return rows;
}

/** Resolves a person id to the reference a lookup cell renders. */
function personReference(value: unknown) {
  const person = PEOPLE_BY_ID.get(String(value ?? ''));
  return person
    ? { id: person.id, text: person.name, entity: 'systemuser', secondaryText: person.jobTitle }
    : null;
}

/**
 * The user record behind a persona.
 *
 * Supplied rather than fetched, which is the point of `getPersonaUser`: it is
 * what lets a grid over a non-Dataverse API show a persona and its card at all,
 * since there is no Web API behind this demo to load one from.
 */
function personRecord(value: unknown): SystemUserRecord | null {
  const person = PEOPLE_BY_ID.get(String(value ?? ''));
  return person
    ? {
        systemuserid: person.id,
        fullname: person.name,
        jobtitle: person.jobTitle,
        internalemailaddress: person.email,
      }
    : null;
}

/** Columns offered to the subtotal picker. */
const SUBTOTAL_CHOICES = [
  { key: 'quantity', label: 'Qty' },
  { key: 'costEx', label: 'Cost ex' },
  { key: 'sellEx', label: 'Sell ex' },
  { key: 'margin', label: 'GP %' },
];

/** Grouping presets, to show nesting without picking levels one at a time. */
const GROUP_PRESETS: { key: string; label: string; groupBy: string[] }[] = [
  { key: 'none', label: 'None', groupBy: [] },
  { key: 'category', label: 'Category', groupBy: ['category'] },
  { key: 'cat-status', label: 'Category \u203A Status', groupBy: ['category', 'status'] },
  {
    key: 'owner-cat-status',
    label: 'Created by \u203A Category \u203A Status',
    groupBy: ['createdById', 'category', 'status'],
  },
];

const useStyles = makeStyles({
  frame: {
    height: '560px',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalS,
  },
});

export function DataGridExamples({ connected = false }: { connected?: boolean }) {
  const styles = useStyles();
  const gridRef = React.useRef<DataGridHandle<QuoteLine> | null>(null);

  const [rows, setRows] = React.useState(() => makeRows(2000));
  const [pending, setPending] = React.useState<Record<string, Record<string, unknown>>>({});
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [density, setDensity] = React.useState<DataGridDensity>('comfortable');
  const [showFilters, setShowFilters] = React.useState(false);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [subtotalKeys, setSubtotalKeys] = React.useState<string[]>(['quantity', 'sellEx']);
  const [search, setSearch] = React.useState('');
  const [reorderable, setReorderable] = React.useState(true);
  const [multiSelect, setMultiSelect] = React.useState(true);

  const columns = React.useMemo<DataGridColumn<QuoteLine>[]>(
    () => [
      { key: 'lineNo', label: '#', dataType: 'integer', width: 52 },
      // A URL, which is the common case. Hover a thumbnail for the full photo.
      {
        key: 'productPhoto',
        label: 'Image',
        dataType: 'image',
        width: 52,
        sortable: false,
        filterable: false,
        imagePreviewSize: 240,
      },
      // The same picture as bare base64, the way a Dataverse image column
      // returns one. Off by default; turn it on from the Columns menu.
      {
        key: 'productSwatch',
        label: 'Swatch',
        dataType: 'image',
        width: 52,
        sortable: false,
        filterable: false,
        defaultVisible: false,
        imagePreviewSize: 180,
      },
      { key: 'productCode', label: 'Code', width: 110, editable: true, pin: 'left' },
      // An editable reference. The picker queries as you type rather than
      // filtering a preloaded page, so the whole catalogue is reachable from the
      // cell — the same shape as a Dataverse lookup, against a local array.
      {
        key: 'productId',
        label: 'Product',
        dataType: 'lookup',
        width: 240,
        editable: true,
        lookupEntity: 'product',
        // Takes whatever width is left once every other column has its own, so
        // the grid fills its container instead of leaving a band of dead space.
        flex: 1,
        getLookupValue: (ctx) => {
          const product = CATALOGUE.find((p) => p.id === ctx.value);
          return product ? { id: product.id, text: product.name, secondaryText: product.code } : null;
        },
        searchLookup: async (text) => {
          const needle = text.trim().toLowerCase();
          return CATALOGUE.filter(
            (p) => p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle),
          )
            .slice(0, 25)
            .map((p) => ({ key: p.id, text: p.name, secondaryText: p.code, data: p }));
        },
        // Picking a product writes the denormalised columns beside it too, which
        // is why the column takes the select rather than letting the id land on
        // its own.
        onLookupSelect: (option, ctx) => {
          const product = option?.data as (typeof CATALOGUE)[number] | undefined;
          onCellChangeRef.current(ctx.row, 'productId', product?.id ?? null, ctx.rowId);
          onCellChangeRef.current(ctx.row, 'productCode', product?.code ?? '', ctx.rowId);
          onCellChangeRef.current(ctx.row, 'productName', product?.name ?? '', ctx.rowId);
        },
        onRecordClick: (value) => window.alert(`Would open product ${value.text}`),
      },
      { key: 'category', label: 'Category', width: 130, groupable: true },
      { key: 'quantity', label: 'Qty', dataType: 'integer', width: 64, editable: true, summary: 'sum' },
      // The unit sits in its own box hard against the cell edge, so it never
      // eats into the digits however narrow the column is dragged.
      {
        key: 'costEx',
        label: 'Cost ex',
        dataType: 'money',
        width: 110,
        editable: true,
        summary: 'sum',
        prefix: '$',
      },
      {
        key: 'sellEx',
        label: 'Sell ex',
        dataType: 'money',
        width: 110,
        editable: true,
        summary: 'sum',
        prefix: '$',
      },
      {
        key: 'margin',
        label: 'GP %',
        dataType: 'decimal',
        precision: 1,
        width: 92,
        summary: 'avg',
        suffix: '%',
        editable: true,
        // Calculated rather than stored: it follows the cost and sell cells as
        // they are typed, and typing a GP% back sets the sell price to match.
        computed: {
          value: (ctx) => {
            const sell = ctx.num('sellEx');
            return sell === 0 ? 0 : ((sell - ctx.num('costEx')) / sell) * 100;
          },
          onEdit: (value, ctx) => {
            const pct = Number(value);
            if (!Number.isFinite(pct) || pct >= 100) return;
            return { sellEx: ctx.num('costEx') / (1 - pct / 100) };
          },
        },
        // Business rules colour the cell rather than the row, so a single bad
        // number is visible without shouting about the whole line.
        getCellState: (ctx) => {
          const value = Number(ctx.value ?? 0);
          if (value < 10) return 'error';
          if (value > 30) return 'good';
          return null;
        },
      },
      {
        key: 'lineTotal',
        label: 'Total',
        dataType: 'money',
        width: 100,
        summary: 'sum',
        prefix: '$',
        // Persisted: the figure is a real field the record carries, so an edit
        // to quantity or price stages a write to it as well.
        computed: { value: (ctx) => ctx.num('sellEx') * ctx.num('quantity'), persist: true },
      },
      {
        key: 'status',
        label: 'Status',
        dataType: 'choice',
        width: 110,
        editable: true,
        groupable: true,
        choices: [
          { value: 1, label: 'Draft', color: '#8a8886' },
          { value: 2, label: 'Quoted', color: '#0078d4' },
          { value: 3, label: 'Won', color: '#107c10' },
        ],
      },
      { key: 'inStock', label: 'In stock', dataType: 'boolean', width: 76, editable: true },
      {
        key: 'discount',
        label: 'Disc',
        dataType: 'percent',
        width: 84,
        editable: true,
        suffix: '%',
      },
      {
        key: 'requiredBy',
        label: 'Required by',
        dataType: 'date',
        // Wide enough for the date plus the picker's calendar button; narrower
        // and the value is clipped rather than the column just looking tight.
        width: 160,
        minWidth: 140,
        editable: true,
      },
      // Free text long enough to need truncating, so the ellipsis and the title
      // tooltip are both exercised.
      {
        key: 'notes',
        label: 'Notes',
        dataType: 'multiline',
        width: 200,
        editable: true,
        maxLength: 400,
        // Filling a note down a hundred rows is almost always a mistake.
        fillable: false,
      },
      // A computed, read-only flag. It reads as a tick or a cross rather than a
      // disabled checkbox, which would invite a click that cannot do anything.
      {
        key: 'marginOk',
        label: 'GP ok',
        width: 66,
        dataType: 'boolean',
        accessor: (row) => row.margin >= 10,
        booleanDisplay: 'icon',
        booleanLabels: { on: 'Margin is above 10%', off: 'Margin is below 10%' },
        filterable: false,
      },
      // The audit columns. Read-only references, each with a card behind them —
      // "who touched this" is the question they are on the grid to answer, and a
      // name in a narrow column answers it badly.
      {
        key: 'createdById',
        label: 'Created by',
        dataType: 'lookup',
        width: 170,
        groupable: true,
        lookupEntity: 'systemuser',
        persona: true,
        getLookupValue: (ctx) => personReference(ctx.value),
        // Supplied rather than fetched, because this demo has no Web API behind
        // it. A real grid omits this and the persona loads on hover.
        getPersonaUser: (ctx) => personRecord(ctx.value),
      },
      {
        key: 'modifiedById',
        label: 'Modified by',
        dataType: 'lookup',
        width: 170,
        groupable: true,
        lookupEntity: 'systemuser',
        persona: true,
        getLookupValue: (ctx) => personReference(ctx.value),
        getPersonaUser: (ctx) => personRecord(ctx.value),
      },
      // `requiredBy` above is a date; this one carries a time as well, so both
      // editors are exercised.
      {
        key: 'modifiedOn',
        label: 'Modified',
        dataType: 'datetime',
        width: 156,
        defaultVisible: false,
      },
    ],
    [],
  );

  /**
   * Layers unsaved edits over the stored record, which is the pattern both
   * production grids use. Sorting, filtering and grouping all read through this,
   * so the grid orders by what is on screen rather than by what was last saved.
   */
  const getCellValue = React.useCallback(
    (_row: QuoteLine, key: string, rowId: string, baseValue: unknown) =>
      pending[rowId]?.[key] !== undefined ? pending[rowId][key] : baseValue,
    [pending],
  );

  const onCellChange = React.useCallback(
    (row: QuoteLine, key: string, value: unknown, rowId: string) => {
      setPending((prev) => {
        const next = { ...prev };
        const rowChanges = { ...(next[rowId] ?? {}) };
        // Editing a value back to what is stored is not a change, so drop it
        // rather than leaving a phantom entry in the dirty count.
        if (Object.is(value, row[key])) delete rowChanges[key];
        else rowChanges[key] = value;
        if (Object.keys(rowChanges).length === 0) delete next[rowId];
        else next[rowId] = rowChanges;
        return next;
      });
    },
    [],
  );

  // Read through a ref by the product lookup, which writes three columns per
  // pick. Naming the handler in the column memo instead would rebuild every
  // column on each keystroke, since the handler closes over pending changes.
  const onCellChangeRef = React.useRef(onCellChange);
  onCellChangeRef.current = onCellChange;

  /**
   * A completed fill, staged in one update.
   *
   * Taking `onFill` rather than letting the grid call `onCellChange` per row is
   * the difference between one render and one per filled row — a drag over a
   * few hundred rows is very noticeable without it.
   */
  const handleFill = React.useCallback((fill: DataGridFill<QuoteLine>) => {
    setPending((prev) => {
      const next = { ...prev };
      fill.targetRowIds.forEach((rowId, index) => {
        const row = fill.targetRows[index];
        const rowChanges = { ...(next[rowId] ?? {}) };
        if (Object.is(fill.value, row[fill.columnKey])) delete rowChanges[fill.columnKey];
        else rowChanges[fill.columnKey] = fill.value;
        if (Object.keys(rowChanges).length === 0) delete next[rowId];
        else next[rowId] = rowChanges;
      });
      return next;
    });
  }, []);

  const handleRowReorder = React.useCallback((move: DataGridRowMove<QuoteLine>) => {
    setRows((current) => {
      const moving = new Set(move.rowIds);
      const rest = current.filter((r) => !moving.has(r.id));
      const target = current[move.toIndex];
      const at = rest.findIndex((r) => r.id === target?.id);
      const insertAt = at < 0 ? rest.length : at;
      const block = current.filter((r) => moving.has(r.id));
      return [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
    });
  }, []);

  const pendingCount = Object.values(pending).reduce((n, v) => n + Object.keys(v).length, 0);

  // Only the commands this demo adds. Search, filters, grouping, the column
  // picker, density and the layout reset all come from the grid's own toolbar.
  const commands = React.useMemo(
    () => [
      {
        key: 'discard',
        text: pendingCount > 0 ? `Discard ${pendingCount}` : 'Discard',
        icon: <ArrowUndoRegular />,
        title: 'Discard changes',
        description: 'Drop every unsaved edit and go back to the stored values.',
        disabled: pendingCount === 0,
        onClick: () => setPending({}),
        dividerBefore: true,
      },
      {
        key: 'nesting',
        text: 'Nesting',
        icon: <TextBulletListSquareRegular />,
        title: 'Nested grouping',
        description: 'Group by several columns at once. Subtotals close innermost first.',
        subItems: GROUP_PRESETS.map((preset) => ({
          key: preset.key,
          text: preset.label,
          checked:
            preset.groupBy.length === groupBy.length &&
            preset.groupBy.every((k, i) => k === groupBy[i]),
          onClick: () => setGroupBy(preset.groupBy),
        })),
      },
      {
        key: 'subtotals',
        text: 'Subtotals',
        icon: <CalculatorRegular />,
        title: 'Subtotal columns',
        description: 'Choose which columns are totalled under each group.',
        subItems: SUBTOTAL_CHOICES.map((choice) => ({
          key: choice.key,
          text: choice.label,
          checked: subtotalKeys.includes(choice.key),
          onClick: () =>
            setSubtotalKeys((current) =>
              current.includes(choice.key)
                ? current.filter((k) => k !== choice.key)
                : [...current, choice.key],
            ),
        })),
      },
      {
        key: 'jump',
        text: 'Jump to 1500',
        icon: <TargetArrowRegular />,
        title: 'Scroll to a row',
        description: 'Scrolls a row into view by id, through the grid ref.',
        onClick: () => gridRef.current?.scrollToRow('line-1500', 'center'),
      },
    ],
    [pendingCount, groupBy, subtotalKeys],
  );

  return (
    <>
      <h2>DataGrid</h2>
      <Text block>
        A virtualised, editable grid on TanStack Table and TanStack Virtual. 2,000 rows are mounted
        below; only the visible window is in the DOM. Drag headers to reorder, drag their right edge
        to resize, right-click one for the column menu, and edit any cell in place. Group by several
        columns at once from <strong>Nesting</strong>, or tick levels in the grid&rsquo;s own
        <strong> Group</strong> menu — the order you tick them is the order they nest.
      </Text>

      <div className={styles.controls} style={{ marginTop: 16 }}>
        <Input
          size="small"
          placeholder="Search all columns…"
          contentBefore={<SearchRegular />}
          value={search}
          onChange={(_, data) => setSearch(data.value)}
          style={{ minWidth: 240 }}
        />
        {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
          <Button
            key={d}
            size="small"
            appearance={density === d ? 'primary' : 'secondary'}
            onClick={() => setDensity(d)}
          >
            {d}
          </Button>
        ))}
        <Switch
          label="Row reorder"
          checked={reorderable}
          onChange={(_, data) => setReorderable(data.checked)}
        />
        <Switch
          label="Multi-select"
          checked={multiSelect}
          onChange={(_, data) => setMultiSelect(data.checked)}
        />
      </div>

      <div className={styles.frame}>
        <DataGrid<QuoteLine>
          ref={gridRef}
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          getCellValue={getCellValue}
          onCellChange={onCellChange}
          getRowState={(_, rowId) => (pending[rowId] ? 'dirty' : null)}
          selectable
          selectedRowIds={selected}
          onSelectionChange={setSelected}
          multiSelect={multiSelect}
          onFill={handleFill}
          density={density}
          onDensityChange={setDensity}
          showFilters={showFilters}
          onShowFiltersChange={setShowFilters}
          globalFilter={search}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupSubtotals={subtotalKeys}
          onRowReorder={reorderable ? handleRowReorder : undefined}
          persist={{ scope: 'harness-quote-lines' }}
          // Naming the columns keeps the search useful: "10" across thirty
          // columns matches a quantity, a price and half the product codes.
          searchColumns={['productCode', 'productId', 'category', 'notes']}
          searchPlaceholder="Search code, product, category or notes…"
          toolbarItems={commands}
          // Right-click a row for these; right-click a cell and the cell's own
          // commands appear above them.
          rowContextMenu={(row, rowId, selected) => [
            {
              key: 'open',
              text: `Open ${row.productCode}`,
              icon: <OpenRegular />,
              onClick: () => window.alert(`Would open ${row.productName}`),
            },
            {
              key: 'delete',
              text: selected.size > 1 ? `Delete ${selected.size} lines` : 'Delete line',
              icon: <DeleteRegular />,
              dividerBefore: true,
              onClick: () =>
                setRows((current) =>
                  current.filter((r) => (selected.size > 1 ? !selected.has(r.id) : r.id !== rowId)),
                ),
            },
          ]}
          cellContextMenu={(ctx) => [
            {
              key: 'copy',
              text: 'Copy value',
              icon: <CopyRegular />,
              onClick: () => void navigator.clipboard?.writeText(String(ctx.value ?? '')),
            },
            {
              key: 'clear',
              text: 'Clear value',
              icon: <EraserRegular />,
              disabled: ctx.readOnly,
              onClick: () => onCellChangeRef.current(ctx.row, ctx.column.key, null, ctx.rowId),
            },
          ]}
          statusBarExtra={
            pendingCount > 0 ? <span>{`${pendingCount} unsaved`}</span> : undefined
          }
        />
      </div>

      <h3>Dynamics 365 metadata</h3>
      <Text block>
        The same grid against a real org, configured with nothing but an entity name and a list of
        logical names. Labels, data types, option sets and their colours, decimal places and write
        permission all come from attribute metadata, and the system columns — created by, modified
        by, owner — lock themselves and offer a hover card.
      </Text>
      <div style={{ marginTop: 12 }}>
        <DataGridLiveExample connected={connected} />
      </div>
    </>
  );
}
