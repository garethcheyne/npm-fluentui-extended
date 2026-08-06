/**
 * Mock data for Lookup component examples.
 *
 * This file provides static lookup options for testing the Lookup component
 * without a live Dynamics 365 connection. The data demonstrates various
 * configurations:
 *
 * - `staticOptions`: Basic options with secondary text and expandable details
 * - `detailsOnlyOptions`: Options without secondary text (icon centers vertically)
 * - `multiEntityAccounts`: Accounts with React elements in secondaryText
 * - `multiEntityContacts`: Contacts with Badges in details
 * - `multiEntityRecent`: Recent records with "viewed X ago" timestamps
 * - `mockDatabase`: Larger dataset for simulated API search
 */

import React from 'react';
import { Badge } from '@fluentui/react-components';
import {
  BuildingRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  PersonRegular,
} from '@fluentui/react-icons';
import type { LookupOption } from '../../../src';

// =============================================================================
// STATIC OPTIONS - Basic lookup with expandable details
// =============================================================================

/**
 * Basic static options demonstrating the Lookup's expandable details feature.
 *
 * Each option can include:
 * - `key`: Unique identifier (required)
 * - `text`: Primary display text (required)
 * - `secondaryText`: Subtext shown below the primary text
 * - `icon`: React element displayed to the left
 * - `details`: Array of label/value pairs shown when option is expanded
 *
 * Details can contain plain strings or React elements (Badges, Links, etc.)
 */
export const staticOptions: LookupOption[] = [
  {
    key: '1',
    text: '007 PROJECTS PTY LTD',
    secondaryText: 'COD007PR777',
    icon: <BuildingRegular />,
    details: [
      // Badges render as colored pills
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Active</Badge> },
      { label: 'Type', value: <Badge appearance="tint" color="brand" size="small">Enterprise</Badge> },
      { label: 'Phone', value: '32682915877' },
      { label: 'Mobile', value: '0409072075' },
      { label: 'Server', value: <Badge appearance="outline" size="small">srv_DYN365_NSW</Badge> },
    ],
  },
  {
    key: '2',
    text: '1 DECKS PTY LTD',
    secondaryText: '1DECKSPT777',
    icon: <BuildingRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="tint" color="warning" size="small">Pending Review</Badge> },
      { label: 'Phone', value: '0412345678' },
      // A detail without a label renders full-width
      { value: <span style={{ color: '#666', fontSize: 11 }}>Last updated: 15/01/2026 10:30 AM</span> },
    ],
  },
  {
    key: '3',
    text: '1:TYM CONSTRUCTIONS PTY LTD',
    secondaryText: 'CODTYM46777',
    icon: <BuildingRegular />,
    // No details = no expand chevron shown
  },
  {
    key: '4',
    text: 'ABC HOLDINGS',
    secondaryText: 'ABCHOLD001',
    icon: <BuildingRegular />,
    details: [
      // Labels can also be React elements
      { label: <Badge appearance="outline" size="small">Contact</Badge>, value: 'John Smith' },
      { label: <Badge appearance="outline" size="small">Email</Badge>, value: <a href="mailto:john@abcholdings.com" style={{ color: '#0078d4' }}>john@abcholdings.com</a> },
      { value: <Badge appearance="filled" color="danger" size="small">VIP Customer</Badge> },
    ],
  },
];

// =============================================================================
// DETAILS-ONLY OPTIONS - No secondary text, icon centers on single line
// =============================================================================

/**
 * Options that have details but NO secondary text.
 *
 * When `secondaryText` is omitted, the icon centers vertically on the single
 * text line instead of aligning to the top of two lines.
 *
 * This demonstrates a mixed account/contact lookup where each entity type
 * uses a different icon (BuildingRegular vs PersonRegular).
 */
export const detailsOnlyOptions: LookupOption[] = [
  {
    key: 'do-acc-1',
    text: 'Contoso Ltd',
    icon: <BuildingRegular />,
    details: [
      { label: 'Industry', value: 'Technology' },
      { label: 'Revenue', value: '$50M' },
      { label: 'Employees', value: '250' },
    ],
  },
  {
    key: 'do-con-1',
    text: 'John Smith',
    icon: <PersonRegular />,
    details: [
      { label: 'Title', value: 'CEO' },
      { label: 'Company', value: 'Contoso Ltd' },
      { label: 'Phone', value: '+1 (555) 123-4567' },
    ],
  },
  {
    key: 'do-acc-2',
    text: 'Fabrikam Inc',
    icon: <BuildingRegular />,
    details: [
      { label: 'Industry', value: 'Manufacturing' },
      { label: 'Revenue', value: '$120M' },
      { label: 'Location', value: 'Seattle, WA' },
    ],
  },
  {
    key: 'do-con-2',
    text: 'Sarah Johnson',
    icon: <PersonRegular />,
    details: [
      { label: 'Title', value: 'VP Sales' },
      { label: 'Company', value: 'Fabrikam Inc' },
      { label: 'Email', value: 'sarah.j@fabrikam.com' },
    ],
  },
  {
    key: 'do-acc-3',
    text: 'Adventure Works',
    icon: <BuildingRegular />,
    details: [
      { label: 'Industry', value: 'Retail' },
      // Status badges work great in details
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Active</Badge> },
    ],
  },
  {
    key: 'do-con-3',
    text: 'Michael Chen',
    icon: <PersonRegular />,
    details: [
      { label: 'Title', value: 'CTO' },
      { label: 'Status', value: <Badge appearance="tint" color="warning" size="small">On Leave</Badge> },
    ],
  },
];

// =============================================================================
// MULTI-ENTITY OPTIONS - React elements in secondaryText and details
// =============================================================================

/**
 * Account options demonstrating React elements in `secondaryText`.
 *
 * The `secondaryText` prop accepts both strings and React elements,
 * allowing for rich formatting like inline Badges, colored spans,
 * or flex layouts within the secondary line.
 */
export const multiEntityAccounts: LookupOption[] = [
  {
    key: 'me-acc-1',
    text: 'NEIL WILSON ELECTRICAL CONTRACTOR',
    // React element with inline styling in secondaryText
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>IELCO555
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-2',
    text: 'NEW AIM',
    secondaryText: 'ADMIN@NEWAIM.COM.AU', // Plain string still works
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-3',
    text: 'NEW APOSTOLIC CHURCH',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>APOST555
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-4',
    text: 'NEW BLACK DESIGNS',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>BLACK555
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-5',
    text: 'NEW CASTLE CITY COUNCIL',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>CCITY888
      </span>
    ),
    icon: <BuildingRegular />,
  },
];

/**
 * Contact options with Badges in both `secondaryText` and `details`.
 *
 * Demonstrates how to create rich contact cards with:
 * - Status indicators (Active/Pending/etc.)
 * - Role badges (Decision Maker)
 * - Clickable links in details
 */
export const multiEntityContacts: LookupOption[] = [
  {
    key: 'me-con-1',
    text: 'John Smith',
    // Badges with icons in secondaryText
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="tint" color="success" size="small" icon={<CheckmarkCircleRegular />}>Active</Badge>
        <span>john.smith@contoso.com</span>
      </span>
    ),
    icon: <PersonRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Verified</Badge> },
      { label: 'Role', value: <Badge appearance="tint" color="brand" size="small">Decision Maker</Badge> },
      { label: 'Phone', value: '+1 (555) 123-4567' },
      // A clickable action link
      { value: <span style={{ color: '#0078d4' }}>View full profile →</span> },
    ],
  },
  {
    key: 'me-con-2',
    text: 'Sarah Johnson',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="tint" color="informative" size="small" icon={<ClockRegular />}>Pending</Badge>
        <span>sarah.j@adventure-works.com</span>
      </span>
    ),
    icon: <PersonRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="tint" color="warning" size="small">Pending Verification</Badge> },
      { label: 'Company', value: 'Adventure Works' },
    ],
  },
  {
    key: 'me-con-3',
    text: 'Michael Chen',
    secondaryText: 'CEO at Fabrikam Inc', // Plain string is also valid
    icon: <PersonRegular />,
    details: [
      // Badge as the label itself
      { label: <Badge appearance="outline" size="small">Title</Badge>, value: 'Chief Executive Officer' },
      { label: <Badge appearance="outline" size="small">Dept</Badge>, value: 'Executive' },
    ],
  },
];

/**
 * Recent records showing "viewed X ago" style timestamps.
 *
 * Demonstrates a "recently viewed" list where:
 * - Each record shows its entity type as a Badge
 * - Timestamp is shown in muted text
 */
export const multiEntityRecent: LookupOption[] = [
  {
    key: 'me-rec-1',
    text: 'Contoso Ltd',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="outline" size="small">Account</Badge>
        <span style={{ color: '#666' }}>Viewed 5 min ago</span>
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-rec-2',
    text: 'John Smith',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="outline" size="small">Contact</Badge>
        <span style={{ color: '#666' }}>Viewed 1 hour ago</span>
      </span>
    ),
    icon: <PersonRegular />,
  },
  {
    key: 'me-rec-3',
    text: 'Adventure Works',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="outline" size="small">Account</Badge>
        <span style={{ color: '#666' }}>Viewed yesterday</span>
      </span>
    ),
    icon: <BuildingRegular />,
  },
];

// =============================================================================
// MOCK DATABASE - Larger dataset for simulated API search
// =============================================================================

/**
 * A larger dataset simulating a backend database.
 *
 * Used by `searchAccountsApi()` to simulate async search with network delay.
 * This allows testing the Lookup's loading states and debounce behavior
 * without a live Dynamics connection.
 */
export const mockDatabase: LookupOption[] = [
  { key: 'acc-001', text: 'Acme Corporation', secondaryText: 'ACME001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Manufacturing' }, { label: 'Revenue', value: '$5.2M' }] },
  { key: 'acc-002', text: 'Acme Industries', secondaryText: 'ACME002', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Industrial' }] },
  { key: 'acc-003', text: 'Adventure Works', secondaryText: 'ADV001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Retail' }, { label: 'Employees', value: '250' }] },
  { key: 'acc-004', text: 'Alpine Ski House', secondaryText: 'ALP001', icon: <BuildingRegular /> },
  { key: 'acc-005', text: 'Blue Yonder Airlines', secondaryText: 'BYA001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Aviation' }] },
  { key: 'acc-006', text: 'Contoso Ltd', secondaryText: 'CON001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Technology' }, { label: 'Revenue', value: '$12.8M' }] },
  { key: 'acc-007', text: 'Contoso Pharmaceuticals', secondaryText: 'CON002', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Healthcare' }] },
  { key: 'acc-008', text: 'Fabrikam Inc', secondaryText: 'FAB001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Manufacturing' }, { label: 'Employees', value: '1200' }] },
  { key: 'acc-009', text: 'Fourth Coffee', secondaryText: 'FC001', icon: <BuildingRegular /> },
  { key: 'acc-010', text: 'Litware Inc', secondaryText: 'LIT001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Software' }] },
  { key: 'acc-011', text: 'Northwind Traders', secondaryText: 'NWT001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Import/Export' }, { label: 'Revenue', value: '$3.1M' }] },
  { key: 'acc-012', text: 'Proseware Inc', secondaryText: 'PRO001', icon: <BuildingRegular /> },
  { key: 'acc-013', text: 'Tailspin Toys', secondaryText: 'TST001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Retail' }] },
  { key: 'acc-014', text: 'Trey Research', secondaryText: 'TRY001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Research' }, { label: 'Employees', value: '85' }] },
  { key: 'acc-015', text: 'Wide World Importers', secondaryText: 'WWI001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Import/Export' }] },
];

// =============================================================================
// SIMULATED API
// =============================================================================

/**
 * Simulates an async API call with network delay.
 *
 * When no search text is provided, returns the first 5 records as "recent".
 * Otherwise, filters by name or account number.
 *
 * @param searchText - The search query to filter by
 * @returns Promise resolving to filtered options after 800ms delay
 *
 * @example
 * ```tsx
 * const handleSearch = async (text: string) => {
 *   setLoading(true);
 *   const results = await searchAccountsApi(text);
 *   setOptions(results);
 *   setLoading(false);
 * };
 * ```
 */
export const searchAccountsApi = (searchText: string): Promise<LookupOption[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!searchText) {
        // Return first 5 as "recent" when no search text
        resolve(mockDatabase.slice(0, 5));
      } else {
        // Filter by name or secondary text (account number)
        const filtered = mockDatabase.filter(
          (opt) =>
            opt.text.toLowerCase().includes(searchText.toLowerCase()) ||
            (typeof opt.secondaryText === 'string' &&
              opt.secondaryText.toLowerCase().includes(searchText.toLowerCase()))
        );
        resolve(filtered);
      }
    }, 800); // Simulate 800ms network latency
  });
};
