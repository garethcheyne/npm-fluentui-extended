import * as React from 'react';
import { Popover, PopoverSurface, PopoverTrigger, Spinner, Text } from '@fluentui/react-components';
import { getEntityAttributes, getEntityDefinition } from '../../api/metadata';
import { labelOf } from '../../api/metadata.types';
import { webApiGet } from '../../api/webApi';
import { useRecordHoverCardStyles } from './RecordHoverCard.styles';
import type { RecordHoverCardProps, RecordHoverCardRecord } from './RecordHoverCard.types';

/**
 * Last-resort label when metadata has no display name for a column.
 * Produces "Account Number" rather than "Accountnumber" where it can.
 */
const humanizeColumn = (column: string): string =>
  column
    .replace(/^_/, '')
    .replace(/_value$/, '')
    .replace(/^[a-z0-9]+_/i, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

/** Render a raw Web API value without leaking objects or nulls into the UI. */
const renderValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * A hover card for a Dynamics record reference.
 *
 * Fluent gives you `Popover` and `Card`, but not the behaviour that makes a hover card
 * usable on a grid: the record is fetched lazily, only after the pointer has settled on
 * the anchor, and the result is held so re-opening the same card costs nothing. Without
 * the delay, dragging a pointer across a column fires a request per row.
 */
export const RecordHoverCard: React.FC<RecordHoverCardProps> = ({
  children,
  entityName,
  recordId,
  columns,
  record: providedRecord,
  mapRecord,
  hoverDelayMs = 400,
  actions,
  onLoadError,
  disabled,
  open: openProp,
}) => {
  const styles = useRecordHoverCardStyles();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const [record, setRecord] = React.useState<RecordHoverCardRecord | null>(providedRecord ?? null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const openTimer = React.useRef<ReturnType<typeof setTimeout>>();
  // Survives close/reopen so hovering the same anchor twice does not refetch
  const loadedRef = React.useRef(false);
  const disposedRef = React.useRef(false);

  React.useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, []);

  // A different record on the same anchor invalidates whatever was cached
  React.useEffect(() => {
    loadedRef.current = false;
    setRecord(providedRecord ?? null);
    setError(null);
  }, [entityName, recordId, providedRecord]);

  const loadRecord = React.useCallback(async () => {
    if (providedRecord || loadedRef.current || !entityName || !recordId) return;

    loadedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const definition = await getEntityDefinition(entityName);
      const select = columns?.length
        ? [definition.PrimaryNameAttribute, ...columns].join(',')
        : definition.PrimaryNameAttribute;

      const raw = await webApiGet<Record<string, unknown>>(
        `${definition.EntitySetName}(${recordId})?$select=${select}`,
      );

      if (disposedRef.current) return;

      if (mapRecord) {
        setRecord(mapRecord(raw));
        return;
      }

      // Column labels come from attribute metadata so the card reads the way the form
      // does - "Account Number", not "Accountnumber". The metadata client caches this,
      // so it costs nothing after the first card for a given entity.
      const attributes = await getEntityAttributes(entityName).catch(() => []);
      const labels = new Map<string, string>(
        attributes.map((a) => [a.LogicalName, labelOf(a.DisplayName, '')] as [string, string]),
      );
      const labelFor = (column: string) => {
        const normalized = column.replace(/^_/, '').replace(/_value$/, '');
        return labels.get(column) || labels.get(normalized) || humanizeColumn(column);
      };

      if (disposedRef.current) return;

      setRecord({
        title: String(raw[definition.PrimaryNameAttribute] ?? 'Untitled'),
        details: (columns || []).map((column) => ({
          // Prefer the formatted value Dynamics annotates onto lookups and optionsets
          label: labelFor(column),
          value: renderValue(
            raw[`${column}@OData.Community.Display.V1.FormattedValue`] ?? raw[column],
          ),
        })),
        data: raw,
      });
    } catch (err) {
      if (disposedRef.current) return;
      // Allow a retry on the next hover rather than caching the failure
      loadedRef.current = false;
      const failure = err instanceof Error ? err : new Error('Failed to load record');
      setError(failure.message);
      onLoadError?.(failure);
    } finally {
      if (!disposedRef.current) setLoading(false);
    }
  }, [providedRecord, entityName, recordId, columns, mapRecord, onLoadError]);

  const handleOpenChange = React.useCallback(
    (_: unknown, data: { open: boolean }) => {
      if (openTimer.current) clearTimeout(openTimer.current);

      // Controlled: the caller owns the state, so hover must not fight it
      if (openProp !== undefined) return;

      if (!data.open) {
        setInternalOpen(false);
        return;
      }

      // Wait for the pointer to settle before committing to a request
      openTimer.current = setTimeout(() => {
        setInternalOpen(true);
        void loadRecord();
      }, hoverDelayMs);
    },
    [hoverDelayMs, loadRecord, openProp],
  );

  // A card opened by the caller never receives the hover that would trigger a load
  React.useEffect(() => {
    if (openProp) void loadRecord();
  }, [openProp, loadRecord]);

  if (disabled) return children;

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      openOnHover
      mouseLeaveDelay={200}
      withArrow
      positioning="after"
    >
      <PopoverTrigger disableButtonEnhancement>{children}</PopoverTrigger>

      <PopoverSurface className={styles.surface}>
        {loading && (
          <div className={styles.stateRow}>
            <Spinner size="tiny" />
            <Text size={200}>Loading record...</Text>
          </div>
        )}

        {!loading && error && (
          <div className={styles.stateRow}>
            <Text className={styles.errorText}>{error}</Text>
          </div>
        )}

        {!loading && !error && record && (
          <>
            <div className={styles.header}>
              {record.icon && <span className={styles.icon}>{record.icon}</span>}
              <span className={styles.headerText}>
                <Text weight="semibold" className={styles.title}>
                  {record.title}
                </Text>
                {record.subtitle && <Text className={styles.subtitle}>{record.subtitle}</Text>}
              </span>
            </div>

            {record.details && record.details.length > 0 && (
              <div className={styles.details}>
                {record.details.map((detail, index) => (
                  <React.Fragment key={index}>
                    <Text className={styles.detailLabel}>{detail.label}</Text>
                    <Text className={styles.detailValue}>{detail.value}</Text>
                  </React.Fragment>
                ))}
              </div>
            )}

            {actions && <div className={styles.footer}>{actions}</div>}
          </>
        )}

        {!loading && !error && !record && (
          <div className={styles.stateRow}>
            <Text size={200}>No record details available.</Text>
          </div>
        )}
      </PopoverSurface>
    </Popover>
  );
};
