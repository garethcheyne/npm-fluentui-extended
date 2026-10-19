import * as React from 'react';

export interface UseHoverDelayResult {
  open: boolean;
  /** Spread onto the trigger element. */
  triggerProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  /** Pass to the popover's `onOpenChange`, so Escape and outside clicks close it. */
  setOpen: (open: boolean) => void;
}

/**
 * Opens on hover, but only once the pointer has settled.
 *
 * The delay is not decoration. In a scrolling list the pointer routinely ends up
 * over a row it was never moved to — the wheel brings the row to the cursor —
 * and an undelayed card then flashes open over whatever the user was reading.
 * Waiting for the pointer to rest distinguishes "looking at this" from "this
 * happened to pass underneath".
 *
 * The close delay is short and separate: it exists so the pointer can travel
 * from the trigger onto the card itself without it vanishing on the way.
 */
export function useHoverDelay(openDelayMs = 500, closeDelayMs = 200): UseHoverDelayResult {
  const [open, setOpenState] = React.useState(false);
  const timerRef = React.useRef<number | undefined>(undefined);

  const clear = React.useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // A card left open by an unmounting row would otherwise outlive its trigger.
  React.useEffect(() => clear, [clear]);

  const onMouseEnter = React.useCallback(() => {
    clear();
    timerRef.current = window.setTimeout(() => setOpenState(true), openDelayMs);
  }, [clear, openDelayMs]);

  const onMouseLeave = React.useCallback(() => {
    clear();
    timerRef.current = window.setTimeout(() => setOpenState(false), closeDelayMs);
  }, [clear, closeDelayMs]);

  const setOpen = React.useCallback(
    (next: boolean) => {
      clear();
      setOpenState(next);
    },
    [clear],
  );

  return { open, triggerProps: { onMouseEnter, onMouseLeave }, setOpen };
}
