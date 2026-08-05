/**
 * Shared input appearance handling.
 *
 * Every field-like component in this library takes the same `appearance` prop and
 * defaults it to `filled-darker`, which is what Dynamics 365 uses natively - Fluent's
 * own default is `outline`, which reads as foreign on a model-driven form.
 */

/**
 * Controls the colors and borders of an input, matching Fluent's `InputProps['appearance']`.
 *
 * Note: `filled-darker-shadow` and `filled-lighter-shadow` are deprecated upstream and
 * will be removed in a future Fluent release. They are accepted here so existing callers
 * keep working, but prefer the non-shadow variants.
 */
export type FieldAppearance =
  | 'outline'
  | 'underline'
  | 'filled-darker'
  | 'filled-lighter'
  | 'filled-darker-shadow'
  | 'filled-lighter-shadow';

/**
 * The appearances `Combobox` and `Dropdown` accept. Narrower than `FieldAppearance`:
 * the listbox-backed controls never supported the shadow variants.
 */
export type ListboxAppearance = 'outline' | 'underline' | 'filled-darker' | 'filled-lighter';

/** Dynamics 365's native field styling, and this library's default across every component. */
export const DEFAULT_FIELD_APPEARANCE: FieldAppearance = 'filled-darker';

/**
 * The appearances `Textarea` accepts. It keeps the shadow variants but has no
 * `underline` - a single-line rule under a multi-line box was never meaningful.
 */
export type TextareaAppearance = Exclude<FieldAppearance, 'underline'>;

/** Narrow a `FieldAppearance` to something `Textarea` will accept. */
export const toTextareaAppearance = (
  appearance: FieldAppearance = DEFAULT_FIELD_APPEARANCE,
): TextareaAppearance => (appearance === 'underline' ? 'outline' : appearance);

/**
 * Narrow a `FieldAppearance` to something `Combobox`/`Dropdown` will accept.
 * The deprecated shadow variants fall back to their non-shadow equivalent rather than
 * being dropped, so a caller opting into one still gets the closest available fill.
 */
export const toListboxAppearance = (appearance: FieldAppearance = DEFAULT_FIELD_APPEARANCE): ListboxAppearance => {
  switch (appearance) {
    case 'filled-darker-shadow':
      return 'filled-darker';
    case 'filled-lighter-shadow':
      return 'filled-lighter';
    default:
      return appearance;
  }
};
