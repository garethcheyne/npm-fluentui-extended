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
import type { ReactNode } from 'react';
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

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Individual command item for the CommandBar.
 */
export interface CommandItem {
  key: string;
  text?: string;
  title?: string;
  icon?: ReactNode;
  appearance?: 'primary' | 'secondary';
  dividerBefore?: boolean;
  pinned?: boolean;
  onClick?: () => void;
  subItems?: Array<{ key: string; text: string; onClick?: () => void }>;
}

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
      onClick: () => onLog('New'),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Standard edit actions
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'edit',
      text: 'Edit',
      icon: <EditRegular />,
      onClick: () => onLog('Edit'),
    },
    {
      key: 'delete',
      text: 'Delete',
      icon: <DeleteRegular />,
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
      title: 'Filter', // Uses title instead of text for icon-only button
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
