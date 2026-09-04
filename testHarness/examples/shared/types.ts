/**
 * Shared types used across test harness examples.
 *
 * These types provide a common interface for state management
 * and communication between the main App and individual component examples.
 */

import type { LookupOption } from '../../../src';

/**
 * Tab identifiers for the test harness navigation.
 * Each tab corresponds to a component example section.
 */
export type HarnessTab =
  | 'lookup'
  | 'querybuilder'
  | 'commandbar'
  | 'entitygrid'
  | 'datetimefield'
  | 'optionsetfield'
  | 'hovercard'
  | 'people'
  | 'fluentshell'
  | 'fluentcontainer'
  | 'parentportal'
  | 'harness'
  | 'docs';

/**
 * Props passed to each example component.
 * Provides access to shared Dynamics 365 connection state
 * and callbacks for cross-component communication.
 */
export interface ExampleProps {
  /** Whether the user is currently connected to Dynamics 365 */
  dynamicsConnected: boolean;

  /** Whether the Dynamics connection is being established */
  dynamicsLoading: boolean;

  /** Whether the Dynamics environment has been configured (env vars set) */
  dynamicsConfigured: boolean;

  /** Callback to trigger a Dynamics login */
  onLogin: () => Promise<void>;

  /** Log a command or action for display in the harness */
  onCommandLog?: (message: string) => void;
}

/**
 * Extended props for Lookup examples that need to share
 * live account data with other tabs (e.g., HoverCard).
 */
export interface LookupExampleProps extends ExampleProps {
  /** Live account options fetched from Dynamics 365 */
  liveAccountOptions: LookupOption[];

  /** Callback to update live account options (used by HoverCard tab) */
  onLiveAccountOptionsChange: (options: LookupOption[]) => void;
}

/**
 * Account option for HoverCard live demos.
 * Simplified interface with just key (GUID) and text (name).
 */
export interface AccountOption {
  /** Record GUID */
  key: string;
  /** Display name */
  text: string;
}
