import * as React from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  ToggleButton,
  Tooltip,
  mergeClasses,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import { useCommandBarStyles } from './CommandBar.styles';
import { planTooltip, shouldTooltipInOverflow } from './CommandBar.utils';
import type { CommandBarItem, CommandBarProps } from './CommandBar.types';

/** Width reserved for the overflow trigger when at least one command is collapsed. */
const OVERFLOW_TRIGGER_WIDTH = 40;

/**
 * Wraps a trigger in a Fluent Tooltip when the command carries tooltip content, per the
 * plan from `planTooltip`. Returns the trigger untouched when there is nothing to show,
 * so commands without tooltips do not pay for a Tooltip wrapper.
 */
const useTooltipWrapper = (item: CommandBarItem, styles: ReturnType<typeof useCommandBarStyles>) => {
  const plan = planTooltip(item);

  return (trigger: React.ReactElement): React.ReactElement => {
    if (!plan) return trigger;

    const content =
      plan.mode === 'custom' ? (
        plan.element
      ) : plan.mode === 'rich' ? (
        <span className={styles.tooltipContent}>
          {item.title && <span className={styles.tooltipTitle}>{item.title}</span>}
          <span className={styles.tooltipDescription}>{item.description}</span>
        </span>
      ) : (
        plan.text
      );

    // Rich and custom bodies cannot serve as an accessible name without dragging the
    // whole description into it, so an icon-only command is named from `title` instead.
    const named =
      plan.mode !== 'plain' && plan.ariaLabel
        ? React.cloneElement(trigger as React.ReactElement<{ 'aria-label'?: string }>, {
            'aria-label': plan.ariaLabel,
          })
        : trigger;

    return (
      <Tooltip content={content} relationship={plan.relationship} withArrow>
        {named}
      </Tooltip>
    );
  };
};

/**
 * Renders one command as a button, a toggle, or a menu button when it has children.
 */
const CommandButton: React.FC<{
  item: CommandBarItem;
  size: 'small' | 'medium' | 'large';
  className: string;
}> = ({ item, size, className }) => {
  const styles = useCommandBarStyles();
  const appearance = item.appearance ?? 'subtle';
  const withTooltip = useTooltipWrapper(item, styles);

  // The tooltip wraps the trigger button, not the Menu. Menu is not a DOM element, so
  // the ref and hover handlers a Tooltip injects would land on a component that cannot
  // use them and the tooltip would never open.
  if (item.subItems?.length) {
    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          {withTooltip(
            <MenuButton
              size={size}
              appearance={appearance}
              icon={item.icon}
              disabled={item.disabled}
              className={className}
            >
              {item.text}
            </MenuButton>,
          )}
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {item.subItems.map((subItem) => (
              <MenuItem key={subItem.key} icon={subItem.icon} disabled={subItem.disabled} onClick={subItem.onClick}>
                {subItem.text}
              </MenuItem>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  }

  if (item.checked !== undefined) {
    return withTooltip(
      <ToggleButton
        size={size}
        appearance={appearance}
        icon={item.icon}
        checked={item.checked}
        disabled={item.disabled}
        onClick={item.onClick}
        className={className}
      >
        {item.text}
      </ToggleButton>,
    );
  }

  return withTooltip(
    <Button
      size={size}
      appearance={appearance}
      icon={item.icon}
      disabled={item.disabled}
      onClick={item.onClick}
      className={className}
    >
      {item.text}
    </Button>,
  );
};

/** Renders an overflowed command inside the overflow menu, preserving any submenu. */
const OverflowMenuItem: React.FC<{ item: CommandBarItem }> = ({ item }) => {
  const styles = useCommandBarStyles();
  const withTooltip = useTooltipWrapper(item, styles);

  if (item.subItems?.length) {
    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <MenuItem icon={item.icon} disabled={item.disabled}>
            {item.text || item.title}
          </MenuItem>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {item.subItems.map((subItem) => (
              <MenuItem key={subItem.key} icon={subItem.icon} disabled={subItem.disabled} onClick={subItem.onClick}>
                {subItem.text}
              </MenuItem>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  }

  const row = (
    <MenuItem icon={item.icon} disabled={item.disabled} onClick={item.onClick}>
      {item.text || item.title}
    </MenuItem>
  );

  return shouldTooltipInOverflow(item) ? withTooltip(row) : row;
};

/**
 * A Dynamics 365 style command bar.
 *
 * Fluent ships `Toolbar` and `Overflow` as separate primitives; this composes them into
 * the behaviour a command bar actually needs - commands that no longer fit collapse into
 * a "More commands" menu instead of being clipped or pushed onto a second row.
 */
export const CommandBar: React.FC<CommandBarProps> = ({
  items,
  farItems,
  size = 'small',
  overflowAriaLabel = 'More commands',
  disableOverflow = false,
  className,
}) => {
  const styles = useCommandBarStyles();
  const regionRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef(new Map<string, HTMLDivElement>());
  const [visibleCount, setVisibleCount] = React.useState(items.length);

  const setItemRef = React.useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(key, element);
    } else {
      itemRefs.current.delete(key);
    }
  }, []);

  /**
   * Decide how many commands fit. Widths are read from the live DOM rather than
   * estimated, because label length and icon presence vary too much to guess.
   *
   * The row's flex `gap` has to be part of the budget: n commands occupy
   * sum(widths) + (n - 1) * gap, and ignoring that term is enough to overrun the
   * container and let `overflow: hidden` clip the last command.
   */
  const measure = React.useCallback(() => {
    const region = regionRef.current;
    if (!region) return;

    const available = region.clientWidth;
    if (available === 0) return;

    // Read the gap rather than hardcoding it, so it tracks the spacing token
    const gap = Number.parseFloat(getComputedStyle(region).columnGap) || 0;
    const widths = items.map((item) => itemRefs.current.get(item.key)?.offsetWidth ?? 0);

    const rowWidth = (count: number, sum: number) => sum + Math.max(0, count - 1) * gap;
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);

    if (rowWidth(items.length, totalWidth) <= available) {
      setVisibleCount(items.length);
      return;
    }

    // Reserve room for the overflow trigger only while it is absent. Once it renders it
    // is a flex sibling of this region, so `clientWidth` already excludes it - reserving
    // again would double-count and drop one more command than necessary on every pass.
    const reserved = triggerRef.current ? 0 : OVERFLOW_TRIGGER_WIDTH + gap;
    const budget = available - reserved;

    // Pinned commands never collapse, so their width comes off the budget first
    let used = items.reduce(
      (sum, item, index) => (item.pinned ? sum + widths[index] + gap : sum),
      0,
    );

    let count = 0;
    for (let index = 0; index < items.length; index += 1) {
      if (items[index].pinned) {
        count += 1;
        continue;
      }
      const next = used + widths[index] + gap;
      if (next > budget) break;
      used = next;
      count += 1;
    }

    setVisibleCount(count);
  }, [items]);

  React.useLayoutEffect(() => {
    if (disableOverflow) {
      setVisibleCount(items.length);
      return;
    }

    measure();

    // ResizeObserver is absent in older browsers and in jsdom; the bar still renders,
    // it just stops reacting to container resizes
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => measure());
    if (regionRef.current) observer.observe(regionRef.current);
    return () => observer.disconnect();
  }, [disableOverflow, measure, items.length]);

  const overflowItems = disableOverflow
    ? []
    : items.filter((item, index) => index >= visibleCount && !item.pinned);

  const isHidden = (item: CommandBarItem, index: number) =>
    !disableOverflow && index >= visibleCount && !item.pinned;

  return (
    <div className={mergeClasses(styles.root, className)} role="toolbar" aria-label="Commands">
      <div
        ref={regionRef}
        className={mergeClasses(styles.itemsRegion, disableOverflow && styles.itemsRegionScrolling)}
      >
        {items.map((item, index) => (
          <div
            key={item.key}
            ref={(element) => setItemRef(item.key, element)}
            className={mergeClasses(styles.command, isHidden(item, index) && styles.commandHidden)}
            aria-hidden={isHidden(item, index) || undefined}
          >
            {/* Inside the measured wrapper so the divider's width is budgeted for */}
            {item.dividerBefore && index > 0 && <span className={styles.divider} aria-hidden />}
            <CommandButton item={item} size={size} className={styles.commandButton} />
          </div>
        ))}
      </div>

      {overflowItems.length > 0 && (
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              ref={triggerRef}
              size={size}
              appearance="subtle"
              icon={<MoreHorizontalRegular />}
              aria-label={overflowAriaLabel}
              title={overflowAriaLabel}
              className={styles.overflowTrigger}
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {overflowItems.map((item) => (
                <OverflowMenuItem key={item.key} item={item} />
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      )}

      {farItems && farItems.length > 0 && (
        <div className={styles.farRegion}>
          {farItems.map((item) => (
            <CommandButton key={item.key} item={item} size={size} className={styles.command} />
          ))}
        </div>
      )}
    </div>
  );
};
