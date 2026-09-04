/**
 * CommandBar Component Examples
 *
 * This file demonstrates the CommandBar component's key features:
 *
 * 1. **Responsive Overflow** - Commands collapse into "More commands" menu
 * 2. **Submenus** - Dropdown menus for grouped actions (Export → Excel/CSV)
 * 3. **Far Items** - Right-aligned utility actions
 * 4. **Pinned Commands** - Items that never collapse
 * 5. **Disabled Overflow** - Horizontal scroll instead of collapse
 *
 * The CommandBar automatically handles responsive behavior:
 * - Measures available space using ResizeObserver
 * - Calculates which items fit
 * - Moves excess items to an overflow menu
 * - Respects pinned items (never overflow)
 */

import { CodeExample } from '../shared/CodeExample';
import React, { useState } from 'react';

// Import from the library source (../../../src) — in a real app you'd use:
// import { CommandBar } from 'fluentui-extended';
import { CommandBar } from '../../../src';
import { createMainItems, createFarItems, createPinnedItems } from './items';

// =============================================================================
// COMMANDBAR EXAMPLES COMPONENT
// =============================================================================

/**
 * Main component rendering all CommandBar examples.
 *
 * @param props.onCommandLog - Optional callback to report command clicks
 *                             (used by parent to display last command)
 */
export interface CommandBarExamplesProps {
  /**
   * Callback invoked when any command is clicked.
   * Receives the command name/label as argument.
   */
  onCommandLog?: (command: string) => void;
}

export function CommandBarExamples({ onCommandLog }: CommandBarExamplesProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Track last clicked command
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Local state to display which command was last clicked.
   * Also forwards to parent via onCommandLog if provided.
   */
  const [commandLog, setCommandLog] = useState<string | null>(null);

  /**
   * Handler that updates local state and notifies parent.
   */
  const handleCommandLog = (command: string) => {
    setCommandLog(command);
    onCommandLog?.(command);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 1: Full-featured CommandBar with Overflow
          Demonstrates responsive behavior — narrow the browser to see items
          collapse into the "More commands" overflow menu.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Command Bar</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Commands that no longer fit collapse into a "More commands" menu rather than being
          clipped. <strong>Narrow the browser window</strong> to watch them move.
        </p>

        {/*
          The CommandBar is wrapped in a container with border for visibility.
          In production, you'd typically render it at the top of a view.
        */}
        <div style={{ border: '0px solid #e1dfdd', borderRadius: 8, background: '#fff' }}>
          {/*
            Key props:
            - items: Left-aligned command buttons
            - farItems: Right-aligned utility buttons

            The items and farItems are created by factory functions that
            inject the onClick handler for logging.
          */}
          <CommandBar
            items={createMainItems(handleCommandLog)}
            farItems={createFarItems(handleCommandLog)}
          />
        </div>

        {/* Display which command was last clicked */}
        <p style={{ marginTop: 12, fontSize: 14 }}>
          Last command: <strong>{commandLog ?? 'None'}</strong>
        </p>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>Tooltips — hover any command above:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li>
              <strong>Edit</strong> — <code>title</code> only, a plain single-line tooltip
            </li>
            <li>
              <strong>New</strong> — <code>title</code> + <code>description</code>, the Fluent 2
              rich tooltip
            </li>
            <li>
              <strong>Delete</strong> — <code>description</code> as markup, so it can carry its own
              emphasis
            </li>
            <li>
              <strong>Flow</strong> — <code>tooltip</code> with a fully custom element
            </li>
            <li>
              <strong>Filter</strong> (far right) — icon-only, where <code>title</code> is also the
              accessible name
            </li>
            <li>
              <strong>Export</strong> — a tooltip on a submenu command
            </li>
          </ul>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>How overflow works:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li>
              CommandBar uses <code>ResizeObserver</code> to measure container width
            </li>
            <li>
              Items are measured and those that don't fit move to overflow
            </li>
            <li>
              Submenus (like Export) work the same way in overflow
            </li>
            <li>
              Far items overflow separately from main items
            </li>
          </ul>
        </div>
        <CodeExample sampleId="commandbar-command-bar" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 2: Pinned Commands
          Demonstrates items that never collapse, plus disabled overflow mode.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h3>Pinned commands and overflow disabled</h3>
        <p style={{ color: '#666', marginBottom: 12 }}>
          A pinned command never collapses. With <code>disableOverflow</code> the bar scrolls
          horizontally instead.
        </p>

        {/*
          Constrained width to demonstrate what happens when items don't fit.
          The Save button (pinned: true) will always stay visible.
        */}
        <div
          style={{
            border: '0px solid #e1dfdd',
            borderRadius: 8,
            background: '#fff',
            maxWidth: 420, // Constrain width to force overflow scenario
          }}
        >
          {/*
            createPinnedItems() returns:
            - Save (pinned: true) - NEVER goes to overflow
            - Command A, B, C, D - Will overflow as space decreases

            Note: disableOverflow is NOT set here, so excess items still
            go to the overflow menu. To enable horizontal scroll instead,
            add: disableOverflow={true}
          */}
          <CommandBar items={createPinnedItems()} />
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>Pinned item behavior:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li>
              Set <code>pinned: true</code> on critical actions like Save
            </li>
            <li>
              Pinned items have higher priority — non-pinned overflow first
            </li>
            <li>
              Use sparingly to avoid a crowded always-visible section
            </li>
          </ul>
        </div>
        <CodeExample sampleId="commandbar-commandbar-example-2" />
      </section>
    </>
  );
}

export default CommandBarExamples;
