import * as React from 'react';
import {
  Button,
  Dropdown,
  Input,
  Option,
  Popover,
  PopoverSurface,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import {
  FILTER_OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  defaultFilterOperator,
  filterKindOf,
  filterOperatorsFor,
  isActiveFilter,
  toFilterValue,
  type DataGridFilterOperator,
  type DataGridFilterValue,
} from './DataGrid.filter';
import type { DataGridColumn, DataGridRow } from './DataGrid.types';

const useStyles = makeStyles({
  surface: {
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  control: {
    width: '100%',
    minWidth: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
  },
});

export interface DataGridFilterPopoverProps<T extends DataGridRow> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The header cell the panel hangs from. */
  target: HTMLElement | null;
  column: DataGridColumn<T>;
  /** The column's current filter — a structured one, or the filter row's text. */
  value: unknown;
  /** Applies a filter; `undefined` clears it. */
  onApply: (value: DataGridFilterValue | undefined) => void;
}

/**
 * The "Filter by" panel Dynamics opens from a column header: an operator that
 * suits the column's type, a value, and Apply / Clear.
 *
 * Nothing is filtered until Apply, so an operator can be changed and a value
 * typed without the grid re-filtering underneath on every step.
 */
export function DataGridFilterPopover<T extends DataGridRow>({
  open,
  onOpenChange,
  target,
  column,
  value,
  onApply,
}: DataGridFilterPopoverProps<T>) {
  const styles = useStyles();
  const kind = filterKindOf(column.dataType);
  const operators = filterOperatorsFor(column.dataType);
  const current = toFilterValue(value);
  const label = column.label ?? column.key;

  const [operator, setOperator] = React.useState<DataGridFilterOperator>(
    current?.operator ?? defaultFilterOperator(column.dataType),
  );
  const [text, setText] = React.useState(current?.value ?? '');

  // Each opening starts from what is applied, not from an abandoned edit.
  React.useEffect(() => {
    if (!open) return;
    const applied = toFilterValue(value);
    setOperator(
      applied && operators.includes(applied.operator)
        ? applied.operator
        : defaultFilterOperator(column.dataType),
    );
    setText(applied?.value ?? '');
    // Only on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needsValue = !VALUELESS_OPERATORS.has(operator);
  const draft: DataGridFilterValue = needsValue ? { operator, value: text.trim() } : { operator };
  const canApply = isActiveFilter(draft);
  const hasFilter = isActiveFilter(current);

  const apply = () => {
    if (!canApply) return;
    onApply(draft);
    onOpenChange(false);
  };

  const valueControl = (() => {
    if (!needsValue) return null;
    if (kind === 'boolean' || kind === 'choice') {
      const choices =
        kind === 'boolean'
          ? [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ]
          : (column.choices ?? []).map((c) => ({ value: String(c.value), label: c.label }));
      const selected = choices.find((c) => c.value === text);
      return (
        <Dropdown
          className={styles.control}
          aria-label={`${label} value`}
          placeholder="Select a value"
          value={selected?.label ?? ''}
          selectedOptions={selected ? [selected.value] : []}
          onOptionSelect={(_e, data) => setText(String(data.optionValue ?? ''))}
        >
          {choices.map((c) => (
            <Option key={c.value} value={c.value}>
              {c.label}
            </Option>
          ))}
        </Dropdown>
      );
    }
    return (
      <Input
        className={styles.control}
        aria-label={`${label} value`}
        type={kind === 'date' ? 'date' : 'text'}
        inputMode={kind === 'number' ? 'decimal' : undefined}
        value={text}
        onChange={(_e, data) => setText(data.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply();
        }}
      />
    );
  })();

  return (
    <Popover
      open={open}
      onOpenChange={(_e, data) => onOpenChange(data.open)}
      positioning={{ target, position: 'below', align: 'start', offset: 4 }}
      trapFocus
      withArrow={false}
    >
      <PopoverSurface className={styles.surface} aria-label={`Filter ${label}`}>
        <div className={styles.header}>
          <Text weight="semibold" size={400}>
            Filter by
          </Text>
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          />
        </div>

        <Dropdown
          className={styles.control}
          aria-label={`${label} filter operator`}
          value={FILTER_OPERATOR_LABELS[operator]}
          selectedOptions={[operator]}
          onOptionSelect={(_e, data) => {
            const next = data.optionValue as DataGridFilterOperator | undefined;
            if (next) setOperator(next);
          }}
        >
          {operators.map((op) => (
            <Option key={op} value={op}>
              {FILTER_OPERATOR_LABELS[op]}
            </Option>
          ))}
        </Dropdown>

        {valueControl}

        <div className={styles.actions}>
          <Button appearance="primary" disabled={!canApply} onClick={apply}>
            Apply
          </Button>
          <Button
            disabled={!hasFilter}
            onClick={() => {
              onApply(undefined);
              onOpenChange(false);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
}
