import * as React from 'react';
import {
  Button,
  Checkbox,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Textarea,
  Tooltip,
  mergeClasses,
} from '@fluentui/react-components';
import {
  ArrowExpandRegular,
  CheckmarkCircleFilled,
  CheckmarkRegular,
  DismissCircleFilled,
  DismissRegular,
  ImageOffRegular,
} from '@fluentui/react-icons';
import { Lookup } from '../Lookup';
import type { LookupOption } from '../Lookup';
import { OptionSetField } from '../OptionSetField';
import type { OptionSetOption } from '../OptionSetField';
import { SystemUserPersona } from '../SystemUserPersona';
import { DateTimeField } from '../DateTimeField';
import { useHoverDelay } from '../../hooks/useHoverDelay';
import { useDataGridStyles } from './DataGrid.styles';
import { BUILTIN_CELL_STATES } from './DataGrid.tokens';
import {
  formatCellValue,
  parseEditorValue,
  resolveCellStateStyle,
  toBoolean,
  toDate,
  toImageSrc,
  toNumber,
} from './DataGrid.utils';
import type {
  DataGridAffix,
  DataGridCellContext,
  DataGridCellState,
  DataGridCellStateStyle,
  DataGridColumn,
  DataGridLookupOption,
  DataGridRow,
} from './DataGrid.types';

/**
 * The class and inline custom properties that draw a cell state.
 *
 * Built-in names and a consumer's own both go through here; `custom` is the
 * grid's `cellStates`. Returns nothing for the default state, or for a name
 * nobody has styled.
 */
export function cellStateProps(
  styles: ReturnType<typeof useDataGridStyles>,
  state: DataGridCellState | (string & {}) | null | undefined,
  custom?: Readonly<Record<string, DataGridCellStateStyle>>,
): { className: string | undefined; style: React.CSSProperties | undefined } {
  const resolved = resolveCellStateStyle(state, BUILTIN_CELL_STATES, custom);
  if (!resolved) return { className: undefined, style: undefined };

  const style: Record<string, string> = {};
  if (resolved.background) style['--fue-cell-bg'] = resolved.background;
  if (resolved.color) style['--fue-cell-color'] = resolved.color;
  if (resolved.fontWeight != null) style['--fue-cell-font-weight'] = String(resolved.fontWeight);
  if (resolved.border) style['--fue-cell-border'] = resolved.border;

  return {
    className: mergeClasses(
      resolved.background && styles.cellStateBg,
      resolved.color && styles.cellStateColor,
      resolved.fontWeight != null && styles.cellStateWeight,
      resolved.border && styles.cellStateBorder,
    ),
    style: style as React.CSSProperties,
  };
}

/**
 * Set while a cell shows its own `getCellTooltip`, so the value tooltips inside
 * it stand down rather than stacking a second popup over the first.
 */
const ValueTooltipSuppressed = React.createContext(false);

/**
 * What a numeric cell may hold mid-entry.
 *
 * Deliberately allows the in-progress forms a finished number passes through —
 * `''`, `'-'`, `'12.'` — so the field does not fight the user part way through
 * typing one.
 */
const NUMERIC_INPUT_PATTERN = /^-?\d*(\.\d*)?$/;

export interface DataGridCellProps<T extends DataGridRow = DataGridRow> {
  ctx: DataGridCellContext<T>;
  onCommit: (value: unknown) => void;
}

/**
 * Renders one cell.
 *
 * Controls come from this library rather than from raw HTML wherever one exists:
 * a choice cell is an `OptionSetField` badge and a reference is a `Lookup`, so a
 * value reads the same in a grid row as it does on the form above it. The plain
 * `<input>` is reserved for text, numbers and dates, where Fluent's own field
 * chrome would make every row taller for no gain.
 */
export function DataGridCell<T extends DataGridRow>({ ctx, onCommit }: DataGridCellProps<T>) {
  const styles = useDataGridStyles();
  const { column } = ctx;
  const tip = column.getCellTooltip?.(ctx);

  if (tip == null || tip === '' || tip === false) {
    return <DataGridCellBody ctx={ctx} onCommit={onCommit} />;
  }

  // Only the control is wrapped. An affix beside it — a badge carrying its own
  // tooltip — keeps working, rather than having this one open over it.
  return (
    <Tooltip content={<>{tip}</>} relationship="description" withArrow positioning="above">
      <span className={styles.cellTooltipTarget}>
        <ValueTooltipSuppressed.Provider value>
          <DataGridCellBody ctx={ctx} onCommit={onCommit} />
        </ValueTooltipSuppressed.Provider>
      </span>
    </Tooltip>
  );
}

function DataGridCellBody<T extends DataGridRow>({ ctx, onCommit }: DataGridCellProps<T>) {
  const styles = useDataGridStyles();
  const { column, readOnly } = ctx;

  if (column.renderCell) return <>{column.renderCell(ctx)}</>;

  // A calculated column has nowhere to put a typed value unless it says how to
  // push one back to the fields it derives from.
  const editable =
    column.editable === true && !readOnly && (!column.computed || column.computed.onEdit != null);
  const dirty = column.isCellDirty?.(ctx) === true;

  const inner = (() => {
    switch (column.dataType) {
      case 'boolean':
        return <BooleanCell ctx={ctx} onCommit={onCommit} editable={editable} />;
      case 'choice':
        return <ChoiceCell ctx={ctx} onCommit={onCommit} editable={editable} dirty={dirty} />;
      case 'lookup':
        return <LookupCell ctx={ctx} onCommit={onCommit} editable={editable} dirty={dirty} />;
      case 'image':
        return <ImageCell ctx={ctx} />;
      case 'date':
      case 'datetime':
        if (!editable) return <ReadOnlyValue ctx={ctx} dirty={dirty} />;
        return <DateCell ctx={ctx} onCommit={onCommit} dirty={dirty} />;
      case 'multiline':
        if (!editable) return <ReadOnlyValue ctx={ctx} dirty={dirty} />;
        return <MemoCell ctx={ctx} onCommit={onCommit} dirty={dirty} />;
      default:
        if (!editable) return <ReadOnlyValue ctx={ctx} dirty={dirty} />;
        return <TextEditor ctx={ctx} onCommit={onCommit} dirty={dirty} />;
    }
  })();

  return withAffixes(styles, ctx, inner);
}

/**
 * Wraps a control in its leading and trailing units.
 *
 * The affix boxes are fixed-width and the control takes what is left, so the
 * symbol never eats into the digits however narrow the column gets.
 */
function withAffixes<T extends DataGridRow>(
  styles: ReturnType<typeof useDataGridStyles>,
  ctx: DataGridCellContext<T>,
  control: React.ReactNode,
): React.ReactElement {
  const prefix = resolveAffix(ctx.column.prefix, ctx);
  const suffix = resolveAffix(ctx.column.suffix, ctx);
  if (prefix == null && suffix == null) return <>{control}</>;

  return (
    <span className={styles.affixWrap}>
      {prefix != null && <span className={styles.affix}>{prefix}</span>}
      <span className={styles.affixControl}>{control}</span>
      {suffix != null && <span className={styles.affix}>{suffix}</span>}
    </span>
  );
}

function resolveAffix<T extends DataGridRow>(
  affix: DataGridAffix<T> | undefined,
  ctx: DataGridCellContext<T>,
): React.ReactNode {
  if (affix == null) return null;
  const resolved = typeof affix === 'function' ? affix(ctx) : affix;
  return resolved === '' ? null : resolved;
}

/**
 * A Fluent tooltip, themed and positioned like every other one in the app.
 *
 * The browser's own `title` is deliberately not used: it is unstyled, ignores
 * dark mode, waits about a second before appearing, and cannot be dismissed with
 * Escape — so a grid relying on it looks and behaves unlike the form it sits
 * beside.
 *
 * `relationship` matters here. A cell's tooltip only repeats text that is
 * already on screen, so it *describes*; labelling would replace the accessible
 * name and leave a screen reader announcing the value instead of the column.
 * Icons, which have no text of their own, pass `label`.
 *
 * Fluent mounts the tooltip body only while it is shown, which is what makes
 * this affordable across the several hundred cells a virtualised grid has on
 * screen at once.
 */
function CellTooltip({
  content,
  relationship = 'description',
  children,
}: {
  content: string;
  relationship?: 'description' | 'label';
  children: React.ReactElement;
}) {
  const suppressed = React.useContext(ValueTooltipSuppressed);
  if (content === '') return children;
  if (suppressed) {
    // A label is the only name an icon has, so it survives as an attribute even
    // when its popup gives way to the cell's own tooltip.
    return relationship === 'label'
      ? React.cloneElement(children as React.ReactElement<{ 'aria-label'?: string }>, {
          'aria-label': content,
        })
      : children;
  }
  return (
    <Tooltip content={content} relationship={relationship} withArrow positioning="above">
      {children}
    </Tooltip>
  );
}

// ─── Read-only display ───────────────────────────────────────────────────────

function ReadOnlyValue<T extends DataGridRow>({
  ctx,
  dirty,
}: {
  ctx: DataGridCellContext<T>;
  dirty: boolean;
}) {
  const styles = useDataGridStyles();
  const { column, value, row } = ctx;
  const text = formatCellValue(value, column, row);

  // An em dash rather than an empty cell: a blank reads as "this column does not
  // apply here", which is a different claim from "there is no value yet".
  if (text === '') return <span className={styles.cellPlaceholder}>&mdash;</span>;

  const negative = negativeIsRed(column) && (toNumber(value) ?? 0) < 0;
  return (
    <CellTooltip content={text}>
      <span
        className={mergeClasses(
          styles.cellContent,
          negative && styles.cellNegative,
          dirty && styles.editorDirty,
        )}
      >
        {text}
      </span>
    </CellTooltip>
  );
}

function negativeIsRed<T extends DataGridRow>(column: DataGridColumn<T>): boolean {
  return column.negativeIsRed ?? column.dataType === 'money';
}

// ─── Booleans ────────────────────────────────────────────────────────────────

/**
 * A two-option value.
 *
 * Read-only flags show as a tick or a cross by default rather than as a disabled
 * checkbox, which invites a click that cannot do anything.
 */
function BooleanCell<T extends DataGridRow>({
  ctx,
  onCommit,
  editable,
}: {
  ctx: DataGridCellContext<T>;
  onCommit: (value: unknown) => void;
  editable: boolean;
}) {
  const styles = useDataGridStyles();
  const { column, value } = ctx;
  const on = toBoolean(value);
  const display = column.booleanDisplay ?? (editable ? 'checkbox' : 'icon');
  const title = on ? column.booleanLabels?.on : column.booleanLabels?.off;

  if (display === 'icon') {
    return (
      <CellTooltip content={title ?? (on ? 'Yes' : 'No')} relationship="label">
        <span className={styles.editorCheckboxWrap}>
          {on ? (
            <CheckmarkCircleFilled className={styles.stateIconOn} />
          ) : (
            <DismissCircleFilled className={styles.stateIconOff} />
          )}
        </span>
      </CellTooltip>
    );
  }

  const checkbox = (
    <span className={styles.editorCheckboxWrap}>
      <Checkbox
        checked={on}
        disabled={!editable}
        aria-label={column.label ?? column.key}
        onChange={(_e, data) => onCommit(data.checked === true)}
      />
    </span>
  );

  return title ? <CellTooltip content={title}>{checkbox}</CellTooltip> : checkbox;
}

// ─── Choices ─────────────────────────────────────────────────────────────────

/**
 * A choice, editable or not, rendered by `OptionSetField`.
 *
 * The read-only case is the same control disabled rather than a second
 * implementation, so a locked choice and an open one cannot drift apart in
 * appearance — and a coloured option keeps its colour either way.
 */
function ChoiceCell<T extends DataGridRow>({
  ctx,
  onCommit,
  editable,
  dirty,
}: {
  ctx: DataGridCellContext<T>;
  onCommit: (value: unknown) => void;
  editable: boolean;
  dirty: boolean;
}) {
  const styles = useDataGridStyles();
  const { column, value } = ctx;

  const options = React.useMemo<OptionSetOption[]>(
    () =>
      (column.choices ?? []).map((choice) => ({
        value: Number(choice.value),
        label: choice.label,
        color: choice.color ?? null,
      })),
    [column.choices],
  );

  // Without options there is nothing to resolve a value against, so fall back to
  // plain text rather than rendering an empty control.
  if (options.length === 0) return <ReadOnlyValue ctx={ctx} dirty={dirty} />;

  return (
    <OptionSetField
      className={mergeClasses(
        styles.editorControl,
        styles.choiceAtRest,
        dirty && styles.editorDirty,
      )}
      options={options}
      value={value == null || String(value) === '' ? null : String(value)}
      onChange={(next) => onCommit(next)}
      asBadge={column.choiceAsBadge !== false}
      disabled={!editable}
      // A default-height control inside a virtualised row makes every row
      // taller, which is the opposite of what density is for.
      size="small"
      placeholder=""
    />
  );
}

// ─── Lookups ─────────────────────────────────────────────────────────────────

/**
 * A reference.
 *
 * Resolved values render as a `Lookup` at rest so a reference reads as a
 * reference — clickable through to the record, and with a hover card where the
 * column asks for one. An empty editable cell becomes a picker that queries as
 * the user types, which is what makes the whole table reachable from the cell
 * rather than only a preloaded page.
 */
function LookupCell<T extends DataGridRow>({
  ctx,
  onCommit,
  editable,
  dirty,
}: {
  ctx: DataGridCellContext<T>;
  onCommit: (value: unknown) => void;
  editable: boolean;
  dirty: boolean;
}) {
  const styles = useDataGridStyles();
  const { column } = ctx;
  const resolved = column.getLookupValue?.(ctx) ?? null;

  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<DataGridLookupOption[]>([]);
  const [searching, setSearching] = React.useState(false);

  const searchLookup = column.searchLookup;
  React.useEffect(() => {
    if (!searchLookup || search.trim().length < 2) {
      setResults([]);
      return;
    }
    // Guards against an earlier, slower query landing after a later one and
    // replacing good results with stale ones.
    let live = true;
    setSearching(true);
    void searchLookup(search)
      .then((found) => {
        if (live) setResults(found);
      })
      .catch(() => {
        if (live) setResults([]);
      })
      .finally(() => {
        if (live) setSearching(false);
      });
    return () => {
      live = false;
    };
  }, [searchLookup, search]);

  const className = mergeClasses(styles.editorControl, dirty && styles.editorDirty);
  const canPick = editable && Boolean(searchLookup);

  if (resolved) {
    /**
     * A person reads as a persona, which is how Dynamics draws every
     * created-by, modified-by and owner column.
     *
     * Guarded on the target entity rather than on the column: `ownerid` holds
     * either a user or a team, and a team with a person's coin beside it is
     * simply wrong. The persona defers its own loading until hovered, so a
     * column of them costs one request per card actually looked at.
     */
    const entity = resolved.entity ?? column.lookupEntity;
    if (column.persona && entity === 'systemuser') {
      const supplied = column.getPersonaUser?.(ctx) ?? null;
      return (
        <span className={styles.personaWrap}>
          <SystemUserPersona
            className={styles.persona}
            userId={supplied ? undefined : resolved.id}
            user={supplied ?? undefined}
            name={resolved.text}
            // A supplied record means there is no Web API behind this grid to
            // load one from, so there is none to serve a photo either — asking
            // for one just fills the console with failed requests. Initials it
            // is, until the consumer says otherwise.
            imageUrl={supplied ? null : undefined}
            size="small"
            // The job-title line would make a user without one render a row
            // shorter than the rest.
            showSecondaryText={false}
            showHoverCard={column.hoverCard !== false}
            hoverCardDelayMs={column.hoverCardDelayMs}
            onClick={column.onRecordClick ? () => column.onRecordClick?.(resolved, ctx) : undefined}
          />
        </span>
      );
    }

    const option: LookupOption = {
      key: resolved.id,
      text: resolved.text,
      secondaryText: resolved.secondaryText,
      entityName: resolved.entity ?? column.lookupEntity,
      recordId: resolved.id,
    };
    return (
      <Lookup
        className={className}
        options={canPick ? toLookupOptions(results, column) : [option]}
        selectedOption={option}
        onSearchChange={canPick ? setSearch : undefined}
        onOptionSelect={
          canPick ? (picked) => commitLookup(picked, ctx, onCommit) : () => undefined
        }
        onRecordClick={
          column.onRecordClick ? () => column.onRecordClick?.(resolved, ctx) : undefined
        }
        loading={searching}
        size="small"
        appearance="filled-darker"
        // A read-only reference keeps its link and its card but loses the search
        // icon and the caret, neither of which is true of a value the user
        // cannot change.
        readOnly={!canPick}
        clearable={canPick}
        disableClientFilter
        showHoverCard={column.hoverCard === true || column.renderHoverCard != null}
        hoverCardColumns={column.hoverCardColumns}
        hoverCardDelayMs={column.hoverCardDelayMs ?? 500}
        renderHoverCard={
          column.renderHoverCard ? () => column.renderHoverCard?.(resolved, ctx) : undefined
        }
        hoverCardTarget="rest"
        minSearchLength={2}
        searchDebounceMs={300}
      />
    );
  }

  if (!canPick) return <ReadOnlyValue ctx={ctx} dirty={dirty} />;

  return (
    <Lookup
      className={className}
      options={toLookupOptions(results, column)}
      selectedOption={null}
      onSearchChange={setSearch}
      onOptionSelect={(picked) => commitLookup(picked, ctx, onCommit)}
      loading={searching}
      placeholder="Search&hellip;"
      size="small"
      appearance="filled-darker"
      clearable={false}
      disableClientFilter
      minSearchLength={2}
      searchDebounceMs={300}
      noResultsMessage="No matches"
    />
  );
}

function toLookupOptions<T extends DataGridRow>(
  results: DataGridLookupOption[],
  column: DataGridColumn<T>,
): LookupOption[] {
  return results.map((result) => ({
    key: result.key,
    text: result.text,
    secondaryText: result.secondaryText,
    icon: result.icon,
    data: result.data,
    entityName: column.lookupEntity,
    recordId: result.key,
  }));
}

function commitLookup<T extends DataGridRow>(
  picked: LookupOption | null,
  ctx: DataGridCellContext<T>,
  onCommit: (value: unknown) => void,
): void {
  const option: DataGridLookupOption | null = picked
    ? { key: picked.key, text: picked.text, data: picked.data }
    : null;
  // A column that needs to write more than the id — a denormalised name column
  // beside it, say — takes over through `onLookupSelect`.
  if (ctx.column.onLookupSelect) ctx.column.onLookupSelect(option, ctx);
  else onCommit(option?.key ?? null);
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/**
 * A date cell, rendered by this library's own `DateTimeField`.
 *
 * A native `<input type="date">` is deliberately not used. Its calendar is the
 * browser's, so the grid looks different in Edge and Chrome and different again
 * from every other date field on the form; it cannot be themed, ignores dark
 * mode, and forces a locale-independent `dd/mm/yyyy` mask on the user whatever
 * their region is set to.
 */
function DateCell<T extends DataGridRow>({
  ctx,
  onCommit,
  dirty,
}: {
  ctx: DataGridCellContext<T>;
  onCommit: (value: unknown) => void;
  dirty: boolean;
}) {
  const styles = useDataGridStyles();
  const { column, value } = ctx;
  const withTime = column.dataType === 'datetime';

  return (
    <DateTimeField
      className={mergeClasses(styles.editorControl, dirty && styles.editorDirty)}
      value={toDate(value)}
      behavior={withTime ? 'UserLocal' : 'DateOnly'}
      showTime={withTime}
      onChange={(stored) => onCommit(stored)}
      appearance="filled-darker"
      size="small"
      clearable
      allowFreeType
    />
  );
}

// ─── Long text ───────────────────────────────────────────────────────────────

/**
 * A multiline value.
 *
 * At rest it is one truncated line, because a grid row that grows to fit its
 * longest note stops being a grid. The editor is a popover with a real textarea
 * and a character count, which is the only way to work on a 2,000-character memo
 * in a cell 200px wide.
 *
 * Opening is deliberately explicit — the expand button, a double-click, or F2 or
 * Enter from the keyboard. Hanging it off a plain click would mean the editor
 * appeared every time someone selected the cell, which makes the cell
 * impossible to activate, to fill from, or to click past on the way somewhere
 * else.
 */
function MemoCell<T extends DataGridRow>({
  ctx,
  onCommit,
  dirty,
}: {
  ctx: DataGridCellContext<T>;
  onCommit: (value: unknown) => void;
  dirty: boolean;
}) {
  const styles = useDataGridStyles();
  const { column, value } = ctx;
  const [open, setOpen] = React.useState(false);
  const stored = value == null ? '' : String(value);
  const [draft, setDraft] = React.useState(stored);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  // The popover is anchored to this rather than wrapped in a `PopoverTrigger`,
  // because the trigger's own click-to-open is exactly what has to not happen.
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const label = column.label ?? column.key;

  React.useEffect(() => {
    if (!open) return;
    setDraft(stored);
    // After the popover has actually rendered; focusing in the same tick lands
    // on an element that is not in the document yet.
    const id = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
    // Re-reading `stored` on every keystroke would fight the textarea, so the
    // draft is seeded once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = () => {
    setOpen(false);
    const next = draft === '' ? null : draft;
    if (next === (stored === '' ? null : stored)) return;
    onCommit(next);
  };

  const maxLength = column.maxLength;
  const overLimit = maxLength != null && draft.length >= maxLength;
  const nearLimit = maxLength != null && !overLimit && draft.length >= maxLength * 0.9;

  return (
    <>
      <CellTooltip content={stored}>
        <span
          ref={anchorRef}
          className={mergeClasses(styles.memoTrigger, dirty && styles.editorDirty)}
          tabIndex={0}
          role="textbox"
          aria-label={label}
          aria-readonly
          onDoubleClick={() => setOpen(true)}
          onKeyDown={(e) => {
            // F2 is the spreadsheet convention; Enter is what people try first.
            if (e.key === 'F2' || e.key === 'Enter') {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span className={styles.memoText}>
            {stored === '' ? <span className={styles.cellPlaceholder}>&mdash;</span> : stored}
          </span>
          <button
            type="button"
            className={styles.memoExpand}
            aria-label={`Edit ${label}`}
            // Keeps the mousedown off the cell, which would otherwise
            // re-activate it and steal focus back from the popover as it opens.
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <ArrowExpandRegular />
          </button>
        </span>
      </CellTooltip>

      <Popover
        open={open}
        onOpenChange={(_, data) => setOpen(data.open)}
        positioning={{ target: anchorRef.current, position: 'below', align: 'start' }}
        trapFocus
        withArrow
      >
        <PopoverSurface className={styles.memoSurface}>
          <div className={styles.memoHeader}>
            <span className={styles.memoTitle}>{label}</span>
            <span
              className={mergeClasses(
                styles.memoCount,
                nearLimit && styles.memoCountNear,
                overLimit && styles.memoCountOver,
              )}
            >
              {maxLength != null ? `${draft.length} / ${maxLength}` : `${draft.length} chars`}
            </span>
          </div>
          <Textarea
            ref={textareaRef}
            className={styles.memoTextarea}
            textarea={{ maxLength }}
            value={draft}
            aria-label={label}
            appearance="outline"
            resize="vertical"
            onChange={(_, data) => setDraft(data.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
              } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commit();
              } else if ((e.ctrlKey || e.metaKey) && e.key.startsWith('Arrow')) {
                // Saves and leaves the cell. Not prevented, so the key carries on
                // up to the grid, which moves the active cell.
                commit();
              }
            }}
          />
          <div className={styles.memoFooter}>
            <span className={styles.memoHint}>Ctrl + Enter to save</span>
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissRegular />}
              // Keeps focus in the textarea so its blur does not fire first and
              // commit the very edit this button is cancelling.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              appearance="primary"
              icon={<CheckmarkRegular />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={commit}
            >
              Save
            </Button>
          </div>
        </PopoverSurface>
      </Popover>
    </>
  );
}

// ─── Images ──────────────────────────────────────────────────────────────────

/**
 * A picture in a row.
 *
 * Shown as a thumbnail scaled to the row, with the full image on hover. The
 * hover preview is the point of the column: a 20px thumbnail is enough to tell
 * you an image exists and nothing else, so without it the column only confirms
 * that a record has a photo rather than letting anyone look at it.
 *
 * The preview is mounted only while open, so a grid of a thousand rows holds one
 * full-size image in memory rather than a thousand.
 */
function ImageCell<T extends DataGridRow>({ ctx }: { ctx: DataGridCellContext<T> }) {
  const styles = useDataGridStyles();
  const { column, value } = ctx;
  const [failed, setFailed] = React.useState(false);
  const hover = useHoverDelay(column.hoverCardDelayMs ?? 500);

  const src = column.getImageSrc ? column.getImageSrc(ctx) : toImageSrc(value);
  const alt = column.label ?? column.key;

  if (!src || failed) {
    return (
      <span className={styles.imageWrap}>
        <span className={mergeClasses(styles.imagePlaceholder, styles.cellPlaceholder)}>
          <ImageOffRegular />
        </span>
      </span>
    );
  }

  const size = column.imageSize;
  const thumbnail = (
    <img
      src={src}
      alt={alt}
      className={styles.imageThumb}
      style={{
        width: size,
        height: size,
        objectFit: column.imageFit ?? 'contain',
      }}
      // Deliberately not `loading="lazy"`. Virtualisation already means only the
      // visible window is in the DOM, so there is nothing left to defer — and
      // inside a scrolling container the browser cannot work out that these are
      // on screen, so it defers them for ever and the column stays blank below
      // the first row.
      decoding="async"
      // A broken URL otherwise renders the browser's torn-page glyph, which is
      // larger than the row and drags its height with it.
      onError={() => setFailed(true)}
    />
  );

  if (column.imageHoverCard === false) {
    return <span className={styles.imageWrap}>{thumbnail}</span>;
  }

  const preview = column.imagePreviewSize ?? 320;

  return (
    <Popover
      open={hover.open}
      onOpenChange={(_, data) => hover.setOpen(data.open)}
      withArrow
      positioning="after"
    >
      <PopoverTrigger disableButtonEnhancement>
        <span className={styles.imageWrap} {...hover.triggerProps}>
          {thumbnail}
        </span>
      </PopoverTrigger>
      <PopoverSurface className={styles.imagePreviewSurface}>
        <img
          src={src}
          alt={alt}
          className={styles.imagePreview}
          style={{ maxWidth: preview, maxHeight: preview }}
        />
      </PopoverSurface>
    </Popover>
  );
}

// ─── Text and number editors ─────────────────────────────────────────────────

/**
 * The editor for text and numbers.
 *
 * Numbers read to their configured decimals at rest and switch to the stored
 * value while focused. Formatting cannot be staged instead: the parser turns
 * `"12.50"` back into `12.5` on the way in, so a trailing zero would never
 * survive a round trip — and formatting on every keystroke fights the caret and
 * makes `12.` impossible to type through. Display-time is the only place it
 * holds.
 *
 * Numbers use `type="text"` so the pattern guard can reject a bad character
 * outright; a native number input reports an empty string for `"12x"`, leaving
 * nothing to put back and the rejected character on screen.
 */
function TextEditor<T extends DataGridRow>({
  ctx,
  onCommit,
  dirty,
}: {
  ctx: DataGridCellContext<T>;
  onCommit: (value: unknown) => void;
  dirty: boolean;
}) {
  const styles = useDataGridStyles();
  const { column, value, row } = ctx;
  const numeric =
    column.dataType === 'money' ||
    column.dataType === 'decimal' ||
    column.dataType === 'percent' ||
    column.dataType === 'integer';

  const [focused, setFocused] = React.useState(false);
  const raw = value == null ? '' : String(value);
  const [draft, setDraft] = React.useState(raw);

  /**
   * Set by Escape so the blur it causes does not commit.
   *
   * `setDraft` has not flushed by the time the blur handler runs, so the input
   * still reports the typed text — without this flag, cancelling an edit saves
   * it, which is the exact opposite of what Escape means.
   */
  const cancelledRef = React.useRef(false);

  // Re-sync from props whenever the cell is not being typed into, so an edit
  // made elsewhere — an import, a fill, a bulk update — shows up here.
  if (!focused && draft !== raw) setDraft(raw);

  const display = numeric && !focused && raw !== '' ? formatCellValue(value, column, row) : draft;

  const commit = (text: string) => {
    if (text === raw) return;
    onCommit(parseEditorValue(text, column));
  };

  return (
    <input
      type="text"
      className={mergeClasses(styles.editorInput, dirty && styles.editorDirty)}
      value={display}
      inputMode={numeric ? 'decimal' : undefined}
      maxLength={column.maxLength}
      aria-label={column.label ?? column.key}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const next = e.currentTarget.value;
        if (numeric && !NUMERIC_INPUT_PATTERN.test(next)) {
          // Rejecting by not staging leaves no state change for React to
          // re-render from, so put the accepted value back on the element or the
          // typed character sticks in the DOM.
          e.currentTarget.value = draft;
          return;
        }
        setDraft(next);
      }}
      onBlur={(e) => {
        setFocused(false);
        if (cancelledRef.current) {
          cancelledRef.current = false;
          setDraft(raw);
          return;
        }
        commit(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit(e.currentTarget.value);
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          cancelledRef.current = true;
          setDraft(raw);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
