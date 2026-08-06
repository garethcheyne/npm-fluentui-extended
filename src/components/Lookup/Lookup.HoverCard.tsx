import * as React from 'react';
import { Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { RecordHoverCard } from '../RecordHoverCard';
import type { LookupOption } from './Lookup.types';

export interface LookupHoverCardProps {
  option: LookupOption;
  /** Custom card body. Takes precedence over the column-driven card. */
  renderHoverCard?: (option: LookupOption) => React.ReactNode;
  /** Columns fetched and listed by the built-in record card */
  columns?: string[];
  delayMs: number;
  actions?: React.ReactNode;
  /** The row or badge the card is anchored to */
  children: React.ReactElement;
}

/**
 * Wraps a Lookup row or badge in a hover card.
 *
 * Two modes, both lazy - nothing is fetched or built until the pointer settles on the
 * anchor, so a list of fifty results costs no extra requests until one is hovered:
 *
 * - `renderHoverCard` supplies the body, and the caller owns any loading it needs.
 * - Otherwise the option's `entityName`/`recordId` drive `RecordHoverCard`, which
 *   fetches `columns` from the Web API on demand and caches the result.
 */
export const LookupHoverCard: React.FC<LookupHoverCardProps> = ({
  option,
  renderHoverCard,
  columns,
  delayMs,
  actions,
  children,
}) => {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Custom body: own the popover so the caller's content can be anything
  if (renderHoverCard) {
    const content = renderHoverCard(option);
    // A null body is how a caller says "no card for this option"
    if (!content) return children;

    return (
      <Popover
        open={open}
        onOpenChange={(_, data) => {
          if (timer.current) clearTimeout(timer.current);
          if (!data.open) {
            setOpen(false);
            return;
          }
          timer.current = setTimeout(() => setOpen(true), delayMs);
        }}
        openOnHover
        mouseLeaveDelay={200}
        withArrow
        positioning="after"
      >
        <PopoverTrigger disableButtonEnhancement>{children}</PopoverTrigger>
        <PopoverSurface>{content}</PopoverSurface>
      </Popover>
    );
  }

  // Column-driven: RecordHoverCard already handles the fetch, cache and delay
  const recordId = option.recordId ?? option.key;
  if (!option.entityName || !recordId) return children;

  return (
    <RecordHoverCard
      entityName={option.entityName}
      recordId={recordId}
      columns={columns}
      hoverDelayMs={delayMs}
      actions={actions}
    >
      {children}
    </RecordHoverCard>
  );
};
