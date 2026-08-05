import * as React from 'react';
import {
  Button,
  Checkbox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  mergeClasses,
} from '@fluentui/react-components';
import {
  ArrowSortDownRegular,
  ArrowSortUpRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import { getEntityAttributes, getEntityDefinition } from '../../api/metadata';
import { webApiGet } from '../../api/webApi';
import type { WebApiCollection } from '../../api/webApi';
import { useEntityGridStyles } from './EntityGrid.styles';
import { applyMetadataLabels, buildPageQuery, buildSelect, formattedValue, nextSort } from './EntityGrid.utils';
import type { EntityGridColumn, EntityGridProps, EntityGridSort } from './EntityGrid.types';

/**
 * A Dynamics 365 subgrid.
 *
 * Fluent's `DataGrid` renders rows you already have; everything that makes a subgrid a
 * subgrid is missing from it - columns named from entity metadata, server-side paging,
 * sorting pushed to the server, and lookups rendered as names rather than GUIDs.
 *
 * Paging uses `Prefer: odata.maxpagesize` and follows `@odata.nextLink`, rather than
 * `$top` + `$skip`: Dynamics does not support `$skip` for arbitrary offsets, and `$top`
 * suppresses the paging cookie entirely. Since `nextLink` only moves forward, the URL of
 * each visited page is kept so Previous can replay it.
 */
export const EntityGrid: React.FC<EntityGridProps> = ({
  entityName,
  columns: providedColumns,
  filter,
  defaultSort,
  pageSize = 25,
  title,
  commands,
  selectable = false,
  onSelectionChange,
  onRecordOpen,
  emptyMessage = 'No records found',
  onLoadError,
  height,
  className,
}) => {
  const styles = useEntityGridStyles();

  const [columns, setColumns] = React.useState<EntityGridColumn[]>(providedColumns ?? []);
  const [primaryId, setPrimaryId] = React.useState<string>('');
  const [records, setRecords] = React.useState<Record<string, unknown>[]>([]);
  const [sort, setSort] = React.useState<EntityGridSort | undefined>(defaultSort);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState<number | undefined>();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // history[n] is the request URL for page n; index 0 is null because the first page
  // is built from the current sort/filter rather than replayed
  const [history, setHistory] = React.useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [nextLink, setNextLink] = React.useState<string | undefined>();

  const loadPage = React.useCallback(
    async (targetIndex: number, pageHistory: (string | null)[]) => {
      setLoading(true);
      setError(null);

      try {
        const definition = await getEntityDefinition(entityName);
        const effectiveColumns = providedColumns?.length
          ? providedColumns
          : [{ name: definition.PrimaryNameAttribute }];

        setPrimaryId(definition.PrimaryIdAttribute);

        // Labels come from metadata only when the caller did not name the column
        if (effectiveColumns.some((column) => !column.label)) {
          const attributes = await getEntityAttributes(entityName);
          setColumns(applyMetadataLabels(effectiveColumns, attributes));
        } else {
          setColumns(effectiveColumns);
        }

        const replayUrl = pageHistory[targetIndex];
        const url =
          replayUrl ??
          buildPageQuery({
            entitySetName: definition.EntitySetName,
            select: buildSelect(effectiveColumns, definition.PrimaryIdAttribute, definition.PrimaryNameAttribute),
            filter,
            sort: sort ?? { column: definition.PrimaryNameAttribute, direction: 'asc' },
            pageSize,
            includeCount: targetIndex === 0,
          });

        const page = await webApiGet<WebApiCollection<Record<string, unknown>>>(url, {
          headers: {
            // maxpagesize drives server paging; the annotation request is what turns
            // lookup GUIDs and optionset integers into display values
            Prefer: `odata.maxpagesize=${pageSize},odata.include-annotations="OData.Community.Display.V1.FormattedValue"`,
          },
        });

        setRecords(page.value || []);
        setNextLink(page['@odata.nextLink']);
        if (targetIndex === 0 && page['@odata.count'] !== undefined) {
          setTotalCount(page['@odata.count']);
        }
        setPageIndex(targetIndex);
      } catch (err) {
        const failure = err instanceof Error ? err : new Error('Failed to load records');
        setError(failure.message);
        setRecords([]);
        onLoadError?.(failure);
      } finally {
        setLoading(false);
      }
    },
    [entityName, providedColumns, filter, sort, pageSize, onLoadError],
  );

  // Reload from page one whenever the query itself changes
  React.useEffect(() => {
    setHistory([null]);
    setSelectedIds([]);
    setTotalCount(undefined);
    void loadPage(0, [null]);
  }, [loadPage]);

  const handleSort = React.useCallback(
    (column: EntityGridColumn) => {
      if (column.sortable === false) return;
      // Sorting reinstates page one: the paging cookie is tied to the old order
      setSort((current) => nextSort(current, column.name));
    },
    [],
  );

  const handleNext = React.useCallback(() => {
    if (!nextLink) return;
    const updated = [...history];
    updated[pageIndex + 1] = nextLink;
    setHistory(updated);
    void loadPage(pageIndex + 1, updated);
  }, [nextLink, history, pageIndex, loadPage]);

  const handlePrevious = React.useCallback(() => {
    if (pageIndex === 0) return;
    void loadPage(pageIndex - 1, history);
  }, [pageIndex, history, loadPage]);

  const toggleSelection = React.useCallback(
    (recordId: string, checked: boolean) => {
      setSelectedIds((current) => {
        const next = checked ? [...current, recordId] : current.filter((id) => id !== recordId);
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange],
  );

  const rowId = React.useCallback(
    (record: Record<string, unknown>): string => String(record[primaryId] ?? ''),
    [primaryId],
  );

  const showFooter = pageIndex > 0 || Boolean(nextLink) || totalCount !== undefined;

  return (
    <div className={mergeClasses(styles.root, className)} style={height ? { height } : undefined}>
      {(title || commands) && (
        <div className={styles.header}>
          {title && (
            <Text weight="semibold" className={styles.title}>
              {title}
            </Text>
          )}
          {commands && <div className={styles.commands}>{commands}</div>}
        </div>
      )}

      <div className={styles.body}>
        {loading && (
          <div className={styles.stateRow}>
            <Spinner size="small" label="Loading records..." />
          </div>
        )}

        {!loading && error && (
          <div className={styles.stateRow}>
            <Text className={styles.errorText}>{error}</Text>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className={styles.stateRow}>
            <Text>{emptyMessage}</Text>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <Table className={styles.table} size="small">
            <TableHeader>
              <TableRow>
                {selectable && <TableHeaderCell className={styles.headerCell} style={{ width: 40 }} />}
                {columns.map((column) => {
                  const isSorted = sort?.column === column.name;
                  return (
                    <TableHeaderCell
                      key={column.name}
                      className={mergeClasses(styles.headerCell, column.sortable !== false && styles.sortableHeader)}
                      style={column.width ? { width: column.width } : undefined}
                      onClick={() => handleSort(column)}
                      aria-sort={isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <span className={styles.headerCellContent}>
                        {column.label ?? column.name}
                        {isSorted &&
                          (sort?.direction === 'asc' ? (
                            <ArrowSortUpRegular className={styles.sortIcon} />
                          ) : (
                            <ArrowSortDownRegular className={styles.sortIcon} />
                          ))}
                      </span>
                    </TableHeaderCell>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {records.map((record) => {
                const id = rowId(record);
                return (
                  <TableRow
                    key={id}
                    className={mergeClasses(styles.row, onRecordOpen && styles.rowClickable)}
                    onClick={onRecordOpen ? () => onRecordOpen(id, record) : undefined}
                  >
                    {selectable && (
                      <TableCell
                        style={{ width: 40 }}
                        // Selecting a row must not also open it
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.includes(id)}
                          onChange={(_, data) => toggleSelection(id, Boolean(data.checked))}
                          aria-label={`Select record ${id}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const formatted = formattedValue(record, column.name);
                      return (
                        <TableCell key={column.name} className={styles.cell} title={formatted}>
                          {column.render ? column.render(formatted, record) : formatted}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {showFooter && (
        <div className={styles.footer}>
          <Text className={styles.footerText}>
            {totalCount !== undefined
              ? `Page ${pageIndex + 1} of ${Math.max(1, Math.ceil(totalCount / pageSize))} (${totalCount} records)`
              : `Page ${pageIndex + 1}`}
            {selectedIds.length > 0 && ` - ${selectedIds.length} selected`}
          </Text>

          <div className={styles.pager}>
            <Button
              size="small"
              appearance="subtle"
              icon={<ChevronLeftRegular />}
              disabled={pageIndex === 0 || loading}
              onClick={handlePrevious}
            >
              Previous
            </Button>
            <Button
              size="small"
              appearance="subtle"
              icon={<ChevronRightRegular />}
              iconPosition="after"
              disabled={!nextLink || loading}
              onClick={handleNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
