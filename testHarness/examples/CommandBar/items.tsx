/**
 * CommandBar Item Configurations
 *
 * This file defines the CommandBar item arrays used in the examples.
 * Each configuration demonstrates different features:
 *
 * - Basic items with icons and click handlers
 * - Submenu items (dropdown menus)
 * - Dividers between groups
 * - Pinned items that never collapse
 * - Far items (right-aligned)
 *
 * Note: The `onClick` callbacks in these factories receive a logging function
 * to report which command was clicked.
 */

import React from 'react';
import {
  AddRegular,
  EditRegular,
  DeleteRegular,
  ArrowClockwiseRegular,
  PersonRegular,
  ShareRegular,
  ArrowDownloadRegular,
  FlashRegular,
  DocumentRegular,
  FilterRegular,
} from '@fluentui/react-icons';

// The library's own item type rather than a local copy. A copy had already drifted -
// it allowed `appearance: 'secondary'`, which the CommandBar does not accept - so the
// harness was type-checking against a shape the library never had.
import type { CommandBarItem } from '../../../src';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Individual command item for the CommandBar. */
export type CommandItem = CommandBarItem;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates the main CommandBar items array.
 *
 * Demonstrates:
 * - Primary appearance button (New)
 * - Standard buttons with icons
 * - Divider before Refresh to visually group actions
 * - Submenu dropdown (Export with Excel/CSV options)
 *
 * @param onLog - Callback to log which command was clicked
 * @returns Array of command items
 *
 * @example
 * ```tsx
 * const items = createMainItems((cmd) => console.log(cmd));
 * <CommandBar items={items} />
 * ```
 */
export function createMainItems(onLog: (command: string) => void): CommandItem[] {
  return [
    // ─────────────────────────────────────────────────────────────────────────
    // Primary action: New
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'new',
      text: 'New',
      icon: <AddRegular />,
      appearance: 'primary',
      // Rich tooltip: semibold title over a body line. Shows on hover even though
      // the command already has a visible label.
      title: 'New record',
      description: 'Opens a blank form for this table.',
      onClick: () => onLog('New'),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Standard edit actions
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'edit',
      text: 'Edit',
      icon: <EditRegular />,
      // Plain tooltip: title only, no description
      title: 'Edit the selected record',
      onClick: () => onLog('Edit'),
    },
    {
      key: 'delete',
      text: 'Delete',
      icon: <DeleteRegular />,
      title: 'Delete',
      // `description` takes markup, so it can carry its own emphasis
      description: (
        <>
          Permanently removes the selected record. <strong>This cannot be undone.</strong>
        </>
      ),
      onClick: () => onLog('Delete'),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Refresh with divider (starts new visual group)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'refresh',
      text: 'Refresh',
      icon: <ArrowClockwiseRegular />,
      dividerBefore: true, // Creates visual separation
      onClick: () => onLog('Refresh'),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Assignment and sharing
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'assign',
      text: 'Assign',
      icon: <PersonRegular />,
      onClick: () => onLog('Assign'),
    },
    {
      key: 'share',
      text: 'Share',
      icon: <ShareRegular />,
      onClick: () => onLog('Share'),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Export dropdown (submenu with multiple options)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'export',
      text: 'Export',
      icon: <ArrowDownloadRegular />,
      // A tooltip on a submenu command. This is the case that used to render nothing,
      // because the Tooltip wrapped the Menu instead of the button inside it.
      title: 'Export',
      description: 'Download the current view as a file.',
      subItems: [
        { key: 'excel', text: 'Export to Excel', onClick: () => onLog('Export to Excel') },
        { key: 'csv', text: 'Export to CSV', onClick: () => onLog('Export to CSV') },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Additional actions
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'flow',
      text: 'Flow',
      icon: <FlashRegular />,
      // Fully custom tooltip content. `title` is still set so the command has a short
      // accessible name instead of announcing this whole block.
      title: 'Flow',
      tooltip: (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 600 }}>Power Automate</span>
          <span>Run or manage flows for this record.</span>
          <span style={{ opacity: 0.75, fontSize: 12 }}>Ctrl+Shift+F</span>
        </span>
      ),
      onClick: () => onLog('Flow'),
    },
    {
      key: 'wordtemplates',
      text: 'Word Templates',
      icon: <DocumentRegular />,
      onClick: () => onLog('Word Templates'),
    },
  ];
}

/**
 * Creates far-aligned items (right side of CommandBar).
 *
 * Far items are typically utility actions like filter or settings
 * that should remain accessible but not be the primary focus.
 *
 * @param onLog - Callback to log which command was clicked
 * @returns Array of far command items
 */
export function createFarItems(onLog: (command: string) => void): CommandItem[] {
  return [
    {
      key: 'filter',
      // Icon-only: `title` is both the tooltip and the button's accessible name
      title: 'Filter',
      description: 'Narrow the view to records matching your criteria.',
      icon: <FilterRegular />,
      onClick: () => onLog('Filter'),
    },
  ];
}

/**
 * Creates items demonstrating pinned commands.
 *
 * Pinned items never collapse into the overflow menu, regardless
 * of available space. Use sparingly for critical actions.
 *
 * @returns Array of command items with one pinned
 */
export function createPinnedItems(): CommandItem[] {
  return [
    {
      key: 'save',
      text: 'Save',
      icon: <AddRegular />,
      appearance: 'primary',
      pinned: true, // This item will NEVER go into overflow
    },
    { key: 'a', text: 'Command A' },
    { key: 'b', text: 'Command B' },
    { key: 'c', text: 'Command C' },
    { key: 'd', text: 'Command D' },
  ];
}
