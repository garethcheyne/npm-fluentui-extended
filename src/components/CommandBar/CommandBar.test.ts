import { describe, it, expect } from 'vitest';
import { planTooltip, shouldTooltipInOverflow } from './CommandBar.utils';
import type { CommandBarItem } from './CommandBar.types';

const item = (overrides: Partial<CommandBarItem> = {}): CommandBarItem => ({
  key: 'cmd',
  ...overrides,
});

describe('planTooltip', () => {
  it('returns nothing when the command carries no tooltip content', () => {
    expect(planTooltip(item({ text: 'Save' }))).toBeUndefined();
    expect(planTooltip(item())).toBeUndefined();
  });

  it('shows a tooltip on a command that already has a visible label', () => {
    // The bar used to suppress this case, so a labelled command could never be
    // explained on hover no matter what `title` was set to
    const plan = planTooltip(item({ text: 'Save', title: 'Save record' }));
    expect(plan).toEqual({ mode: 'plain', text: 'Save record', relationship: 'description' });
  });

  it('labels an icon-only command from its title', () => {
    // 'label' is what gives the button its accessible name - nothing else supplies one
    const plan = planTooltip(item({ title: 'Filter' }));
    expect(plan).toEqual({ mode: 'plain', text: 'Filter', relationship: 'label' });
  });

  it('never names a labelled command from its tooltip', () => {
    // Announcing the description in place of "Delete" would be worse than no tooltip
    const plan = planTooltip(item({ text: 'Delete', title: 'Delete', description: 'Removes it' }));
    expect(plan?.relationship).toBe('description');
    expect(plan).toMatchObject({ mode: 'rich', ariaLabel: undefined });
  });

  it('promotes to a rich tooltip once a description is present', () => {
    const plan = planTooltip(item({ title: 'Export', description: 'Download as Excel' }));
    expect(plan).toEqual({ mode: 'rich', relationship: 'description', ariaLabel: 'Export' });
  });

  it('names an icon-only rich tooltip from the title rather than the body', () => {
    const plan = planTooltip(item({ title: 'Export', description: 'Download as Excel' }));
    // Without this the button announces title *and* description as its name
    expect(plan).toMatchObject({ ariaLabel: 'Export' });
  });

  it('lets a custom element outrank title and description', () => {
    const plan = planTooltip(
      item({ title: 'Flow', description: 'ignored', tooltip: { type: 'div', props: {}, key: null } as never }),
    );
    expect(plan).toMatchObject({ mode: 'custom', relationship: 'description', ariaLabel: 'Flow' });
  });

  it('treats a description React would not render as absent', () => {
    // `description={showHint && <Hint />}` must not leave an empty styled body behind
    expect(planTooltip(item({ title: 'Save', description: false }))).toMatchObject({ mode: 'plain' });
    expect(planTooltip(item({ title: 'Save', description: null }))).toMatchObject({ mode: 'plain' });
    expect(planTooltip(item({ title: 'Save', description: '' }))).toMatchObject({ mode: 'plain' });
    expect(planTooltip(item({ title: 'Save', description: undefined }))).toMatchObject({ mode: 'plain' });
  });

  it('still builds a rich tooltip when only a description is given', () => {
    const plan = planTooltip(item({ text: 'Save', description: 'Writes to the server' }));
    expect(plan).toMatchObject({ mode: 'rich' });
  });

  it('leaves an icon-only command unnamed when there is no title to name it from', () => {
    // Nothing sensible to fall back to; better than announcing the description
    const plan = planTooltip(item({ description: 'Writes to the server' }));
    expect(plan).toMatchObject({ mode: 'rich', ariaLabel: undefined });
  });
});

describe('shouldTooltipInOverflow', () => {
  it('suppresses a title-only tooltip inside the overflow menu', () => {
    // The menu row already renders that exact text
    expect(shouldTooltipInOverflow(item({ text: 'Save', title: 'Save' }))).toBe(false);
    expect(shouldTooltipInOverflow(item({ title: 'Filter' }))).toBe(false);
  });

  it('keeps tooltips that add something the row does not show', () => {
    expect(shouldTooltipInOverflow(item({ text: 'Save', description: 'Writes to the server' }))).toBe(true);
    expect(shouldTooltipInOverflow(item({ text: 'Flow', tooltip: { type: 'div', props: {}, key: null } as never }))).toBe(
      true,
    );
  });

  it('ignores a description React would not render', () => {
    expect(shouldTooltipInOverflow(item({ text: 'Save', description: false }))).toBe(false);
  });
});
