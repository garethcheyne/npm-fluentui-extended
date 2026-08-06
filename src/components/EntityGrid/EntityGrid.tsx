import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  PinRegular,
  PinOffRegular,
} from '@fluentui/react-icons';
import { getEntityAttributes, getEntityDefinition } from '../../api/metadata';
import { webApiGet } from '../../api/webApi';
import type { WebApiCollection } from '../../api/webApi';
import { useEntityGridStyles } from './EntityGrid.styles';
import { applyMetadataLabels, buildPageQuery, buildSelect, formattedValue, nextSort } from './EntityGrid.utils';
import type {
  ColumnState,
  EntityGridColumn,
  EntityGridProps,
  EntityGridSort,
} from './EntityGrid.types';

/**
 * A Dynamics 365 subgrid with optional virtualization and infinite scroll.
 *
 * Modes:
 * - `paged` (default): Traditional prev/next pagination - no virtualization
 * - `infinite`: Virtualized rows with automatic loading as user scrolls
 * - `manual`: Virtualized rows with a "Load More" button
 *
 * Paging uses `Prefer: odata.maxpagesize` and follows `@odata.nextLink`, rather than
 * `$top` + `$skip`: Dynamics does not support `$skip` for arbitrary offsets.
 */
export const EntityGrid: React.FC<EntityGridProps> = ({
  entityName,
  columns: providedColumns,
  filter,
  defaultSort,
  pageSize: providedPageSize,
  title,
  commands,
  selectable = false,
  onSelectionChange,
  onRecordOpen,
  emptyMessage = 'No records found',
  onLoadError,
  height,
  className,
  // Virtualization props
  loadMode = 'paged',
  estimatedRowHeight = 36,
  overscan = 5,
  loadThreshold = 0.8,
  // Column feature props
  enableColumnResize = false,
  enableColumnPinning = false,
  enableColumnVisibility: _enableColumnVisibility = false,
  onColumnsChange,
  defaultColumnState,
}) => {
  const styles = useEntityGridStyles();

  // Default page size: 50 for virtualized modes, 25 for paged
  const pageSize = providedPageSize ?? (loadMode === 'paged' ? 25 : 50);
  const isVirtualized = loadMode !== 'paged';

  const [columns, setColumns] = React.useState<EntityGridColumn[]>(providedColumns ?? []);
  const [columnState, setColumnState] = React.useState<ColumnState[]>(
    defaultColumnState ?? [],
  );
  const [primaryId, setPrimaryId] = React.useState<string>('');
  const [records, setRecords] = React.useState<Record<string, unknown>[]>([]);
  const [sort, setSort] = React.useState<EntityGridSort | undefined>(defaultSort);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState<number | undefined>();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Paged mode state
  const [history, setHistory] = React.useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [nextLink, setNextLink] = React.useState<string | undefined>();

  // Virtualization
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
    enabled: isVirtualized,
  });

  // Column resize state
  const [resizingColumn, setResizingColumn] = React.useState<string | null>(null);
  const resizeStartX = React.useRef<number>(0);
  const resizeStartWidth = React.useRef<number>(0);

  // Initialize column state from columns
  React.useEffect(() => {
    if (columns.length > 0 && columnState.length === 0) {
      setColumnState(
        columns.map((col) => ({
          name: col.name,
          visible: true,
          pinned: false,
          width: col.width,
        })),
      );
    }
  }, [columns, columnState.length]);

  // Get effective column width
  const getColumnWidth = React.useCallback(
    (column: EntityGridColumn) => {
      const state = columnState.find((s) => s.name === column.name);
      return state?.width ?? column.width;
    },
    [columnState],
  );

  // Check if column is pinned
  const isColumnPinned = React.useCallback(
    (columnName: string) => {
      return columnState.find((s) => s.name === columnName)?.pinned ?? false;
    },
    [columnState],
  );

  // Toggle column pin
  const toggleColumnPin = React.useCallback(
    (columnName: string) => {
      setColumnState((current) => {
        const updated = current.map((s) =>
          s.name === columnName ? { ...s, pinned: !s.pinned } : s,
        );
        onColumnsChange?.(updated);
        return updated;
      });
    },
    [onColumnsChange],
  );

  // Handle column resize
  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent, column: EntityGridColumn) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(column.name);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = getColumnWidth(column) ?? 100;
    },
    [getColumnWidth],
  );

  React.useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + delta);
      setColumnState((current) => {
        const updated = current.map((s) =>
          s.name === resizingColumn ? { ...s, width: newWidth } : s,
        );
        return updated;
      });
    };

    const handleMouseUp = () => {
      if (resizingColumn) {
        onColumnsChange?.(columnState);
      }
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, columnState, onColumnsChange]);

  // Sorted columns: pinned first, then unpinned
  const sortedColumns = React.useMemo(() => {
    if (!enableColumnPinning) return columns;
    const pinned = columns.filter((c) => isColumnPinned(c.name));
    const unpinned = columns.filter((c) => !isColumnPinned(c.name));
    return [...pinned, ...unpinned];
  }, [columns, enableColumnPinning, isColumnPinned]);

  /**
   * Callers almost always pass `columns` and `onLoadError` inline, so both change
   * identity on every parent render. Depending on them directly would make any parent
   * state change refetch the grid and throw away the current page and selection, so
   * the columns are compared by content and the callback is held in a ref.
   */
  const columnsKey = JSON.stringify(
    (providedColumns ?? []).map((column) => [column.name, column.label, column.width, column.sortable]),
  );
  const columnsRef = React.useRef(providedColumns);
  columnsRef.current = providedColumns;

  const onLoadErrorRef = React.useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;

  const loadPage = React.useCallback(
    async (targetIndex: number, pageHistory: (string | null)[], append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const definition = await getEntityDefinition(entityName);
        const provided = columnsRef.current;
        const effectiveColumns = provided?.length
          ? provided
          : [{ name: definition.PrimaryNameAttribute }];

        setPrimaryId(definition.PrimaryIdAttribute);

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
            Prefer: `odata.maxpagesize=${pageSize},odata.include-annotations="OData.Community.Display.V1.FormattedValue"`,
          },
        });

        if (append) {
          setRecords((prev) => [...prev, ...(page.value || [])]);
        } else {
          setRecords(page.value || []);
        }
        setNextLink(page['@odata.nextLink']);
        if (targetIndex === 0 && page['@odata.count'] !== undefined) {
          setTotalCount(page['@odata.count']);
        }
        setPageIndex(targetIndex);
      } catch (err) {
        const failure = err instanceof Error ? err : new Error('Failed to load records');
        setError(failure.message);
        if (!append) {
          setRecords([]);
        }
        onLoadErrorRef.current?.(failure);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [entityName, columnsKey, filter, sort, pageSize],
  );

  // Reload from page one whenever the query changes
  React.useEffect(() => {
    setHistory([null]);
    setSelectedIds([]);
    setTotalCount(undefined);
    void loadPage(0, [null]);
  }, [loadPage]);

  // Infinite scroll: load more when approaching the end
  React.useEffect(() => {
    if (loadMode !== 'infinite' || !scrollContainerRef.current || loadingMore || !nextLink) {
      return;
    }

    const container = scrollContainerRef.current;
    const handleScroll = () => {
      const scrollProgress =
        (container.scrollTop + container.clientHeight) / container.scrollHeight;
      if (scrollProgress >= loadThreshold && nextLink && !loadingMore) {
        const updated = [...history];
        updated[pageIndex + 1] = nextLink;
        setHistory(updated);
        void loadPage(pageIndex + 1, updated, true);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMode, loadThreshold, nextLink, loadingMore, history, pageIndex, loadPage]);

  const handleSort = React.useCallback((column: EntityGridColumn) => {
    if (column.sortable === false) return;
    setSort((current) => nextSort(current, column.name));
  }, []);

  const handleNext = React.useCallback(() => {
    if (!nextLink) return;
    const updated = [...history];
    updated[pageIndex + 1] = nextLink;
    setHistory(updated);
    if (isVirtualized) {
      void loadPage(pageIndex + 1, updated, true);
    } else {
      void loadPage(pageIndex + 1, updated);
    }
  }, [nextLink, history, pageIndex, loadPage, isVirtualized]);

  const handlePrevious = React.useCallback(() => {
    if (pageIndex === 0) return;
    void loadPage(pageIndex - 1, history);
  }, [pageIndex, history, loadPage]);

  const handleLoadMore = React.useCallback(() => {
    if (!nextLink || loadingMore) return;
    const updated = [...history];
    updated[pageIndex + 1] = nextLink;
    setHistory(updated);
    void loadPage(pageIndex + 1, updated, true);
  }, [nextLink, loadingMore, history, pageIndex, loadPage]);

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

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, recordId: string, record: Record<string, unknown>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (e.key === 'Enter' && onRecordOpen) {
          onRecordOpen(recordId, record);
        } else if (e.key === ' ' && selectable) {
          toggleSelection(recordId, !selectedIds.includes(recordId));
        }
      }
    },
    [onRecordOpen, selectable, selectedIds, toggleSelection],
  );

  const showFooter =
    loadMode === 'paged'
      ? pageIndex > 0 || Boolean(nextLink) || totalCount !== undefined
      : totalCount !== undefined || records.length > 0;

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Render row content
  const renderRow = React.useCallback(
    (record: Record<string, unknown>, index: number, virtualRow?: { start: number; size: number }) => {
      const id = rowId(record);
      const isSelected = selectedIds.includes(id);

      const rowStyle: React.CSSProperties = virtualRow
        ? {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }
        : {};

      return (
        <TableRow
          key={id}
          className={mergeClasses(
            styles.row,
            onRecordOpen && styles.rowClickable,
            isSelected && styles.rowSelected,
          )}
          style={rowStyle}
          onClick={onRecordOpen ? () => onRecordOpen(id, record) : undefined}
          onKeyDown={(e) => handleKeyDown(e, id, record)}
          tabIndex={0}
          aria-selected={isSelected}
          data-index={index}
        >
          {selectable && (
            <TableCell
              style={{ width: 40 }}
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onChange={(_, data) => toggleSelection(id, Boolean(data.checked))}
                aria-label={`Select record ${id}`}
              />
            </TableCell>
          )}
          {sortedColumns.map((column) => {
            const formatted = formattedValue(record, column.name);
            const isPinned = enableColumnPinning && isColumnPinned(column.name);
            const colWidth = getColumnWidth(column);
            return (
              <TableCell
                key={column.name}
                className={mergeClasses(styles.cell, isPinned && styles.pinnedColumn)}
                style={colWidth ? { width: colWidth } : undefined}
                title={formatted}
              >
                {column.render ? column.render(formatted, record) : formatted}
              </TableCell>
            );
          })}
        </TableRow>
      );
    },
    [
      rowId,
      selectedIds,
      sortedColumns,
      styles,
      onRecordOpen,
      handleKeyDown,
      selectable,
      toggleSelection,
      enableColumnPinning,
      isColumnPinned,
      getColumnWidth,
    ],
  );

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

      <div
        ref={scrollContainerRef}
        className={styles.body}
        role="grid"
        aria-rowcount={totalCount ?? records.length}
        aria-busy={loading || loadingMore}
      >
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
            <TableHeader className={isVirtualized ? styles.stickyHeader : undefined}>
              <TableRow>
                {selectable && <TableHeaderCell className={styles.headerCell} style={{ width: 40 }} />}
                {sortedColumns.map((column) => {
                  const isSorted = sort?.column === column.name;
                  const isPinned = enableColumnPinning && isColumnPinned(column.name);
                  const colWidth = getColumnWidth(column);
                  return (
                    <TableHeaderCell
                      key={column.name}
                      className={mergeClasses(
                        styles.headerCell,
                        column.sortable !== false && styles.sortableHeader,
                        isPinned && styles.pinnedColumn,
                      )}
                      style={colWidth ? { width: colWidth } : undefined}
                      aria-sort={isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <span className={styles.headerCellContent}>
                        <span
                          className={styles.headerLabel}
                          onClick={() => handleSort(column)}
                        >
                          {column.label ?? column.name}
                          {isSorted &&
                            (sort?.direction === 'asc' ? (
                              <ArrowSortUpRegular className={styles.sortIcon} />
                            ) : (
                              <ArrowSortDownRegular className={styles.sortIcon} />
                            ))}
                        </span>
                        {enableColumnPinning && (
                          <span className={mergeClasses(
                            styles.columnActions,
                            isPinned && styles.columnActionActive,
                          )}>
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={isPinned ? <PinOffRegular /> : <PinRegular />}
                              onClick={() => toggleColumnPin(column.name)}
                              className={styles.columnAction}
                              title={isPinned ? 'Unpin column' : 'Pin column'}
                            />
                          </span>
                        )}
                        {enableColumnResize && (
                          <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleResizeStart(e, column)}
                          />
                        )}
                      </span>
                    </TableHeaderCell>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody
              style={
                isVirtualized
                  ? {
                      height: `${totalSize}px`,
                      position: 'relative',
                    }
                  : undefined
              }
            >
              {isVirtualized
                ? virtualRows.map((virtualRow) => {
                    const record = records[virtualRow.index];
                    return renderRow(record, virtualRow.index, virtualRow);
                  })
                : records.map((record, index) => renderRow(record, index))}
            </TableBody>
          </Table>
        )}

        {loadingMore && (
          <div className={styles.loadingMore}>
            <Spinner size="tiny" label="Loading more..." />
          </div>
        )}
      </div>

      {showFooter && (
        <div className={styles.footer}>
          <Text className={styles.footerText}>
            {loadMode === 'paged' ? (
              <>
                {totalCount !== undefined
                  ? `Page ${pageIndex + 1} of ${Math.max(1, Math.ceil(totalCount / pageSize))} (${totalCount} records)`
                  : `Page ${pageIndex + 1}`}
              </>
            ) : (
              <>
                {records.length} records loaded
                {totalCount !== undefined && ` of ${totalCount}`}
                {loadingMore && (
                  <span className={styles.progressContainer}>
                    <span
                      className={styles.progressBar}
                      style={{ width: totalCount ? `${(records.length / totalCount) * 100}%` : '0%' }}
                    />
                  </span>
                )}
              </>
            )}
            {selectedIds.length > 0 && ` - ${selectedIds.length} selected`}
          </Text>

          <div className={styles.pager}>
            {loadMode === 'paged' && (
              <>
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
              </>
            )}
            {loadMode === 'manual' && nextLink && (
              <Button
                size="small"
                appearance="primary"
                disabled={loadingMore}
                onClick={handleLoadMore}
              >
                Load More
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
