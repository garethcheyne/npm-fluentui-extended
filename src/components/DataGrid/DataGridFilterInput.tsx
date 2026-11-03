import * as React from 'react';

/** How long typing has to pause before a column filter is applied. */
const FILTER_DEBOUNCE_MS = 200;

export interface DataGridFilterInputProps {
  /** The filter currently applied to the column. */
  value: string;
  /** Applies a new filter; empty clears it. */
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
  'data-filter-for'?: string;
}

/**
 * A column filter box that applies what is typed once typing pauses.
 *
 * Every applied filter re-runs filtering, grouping and sorting over the whole
 * row set. Applying on each keystroke made typing in a filter on a large grid
 * lag a character behind; the draft is kept here so the box itself stays
 * immediate.
 */
export function DataGridFilterInput({ value, onCommit, ...inputProps }: DataGridFilterInputProps) {
  const [draft, setDraft] = React.useState(value);
  const timer = React.useRef<number | undefined>(undefined);
  const onCommitRef = React.useRef(onCommit);
  onCommitRef.current = onCommit;

  // A filter changed from outside — cleared by a layout reset, say — wins over
  // whatever was being typed.
  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <input
      {...inputProps}
      value={draft}
      onChange={(e) => {
        const next = e.currentTarget.value;
        setDraft(next);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => onCommitRef.current(next), FILTER_DEBOUNCE_MS);
      }}
      onKeyDown={(e) => {
        // Enter applies straight away, for anyone who does not want to wait.
        if (e.key === 'Enter') {
          window.clearTimeout(timer.current);
          onCommitRef.current(e.currentTarget.value);
        }
      }}
    />
  );
}
