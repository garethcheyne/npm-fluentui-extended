/**
 * Capture registry for documentation screenshots.
 *
 * Each entry renders exactly one component, already populated, with no harness chrome
 * around it. `width` sizes the capture frame so a screenshot tool can shoot the frame
 * element directly and get a tight crop without manual cropping.
 *
 * Components that open a surface (dropdown, hover card) get one entry per state,
 * because the states are what the documentation actually needs to show and a pointer
 * cannot be driven reliably from a capture script.
 */

import * as React from 'react';
import { Avatar, Badge, Link } from '@fluentui/react-components';
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowDownloadRegular,
  BuildingRegular,
  DeleteRegular,
  DocumentRegular,
  EditRegular,
  FilterRegular,
  FlashRegular,
  PersonRegular,
  ShareRegular,
} from '@fluentui/react-icons';

import {
  CommandBar,
  DateTimeField,
  EntityGrid,
  Lookup,
  OptionSetField,
  QueryBuilder,
  RecordHoverCard,
  SystemUserCard,
  SystemUserPersona,
  OwnerLookup,
  type LookupOption,
} from '../../src';
import { shotAccounts, shotOwners, shotUsers } from './mockApi';

export interface ShotDefinition {
  /** URL id, e.g. ?shot=lookup-open */
  id: string;
  /** Shown in the shot index */
  label: string;
  /** Frame width in px */
  width: number;
  /**
   * Extra bottom padding so an overlay surface (dropdown, hover card) is inside the
   * frame rather than spilling past it and getting cropped.
   */
  overlayHeight?: number;
  /**
   * CSS selector the capture script hovers before shooting. Hover-only surfaces
   * (record cards, persona flyouts) cannot be rendered by a static prop, so the
   * capture drives a real pointer instead.
   */
  hoverSelector?: string;
  /** Extra settle time in ms after hovering, for a card that fetches on open */
  hoverSettleMs?: number;
  render: () => React.ReactElement;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const accountOptions: LookupOption[] = [
  {
    key: '1',
    text: 'Contoso Ltd',
    secondaryText: 'ACC-1042',
    icon: <BuildingRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Active</Badge> },
      { label: 'Phone', value: '+64 9 261 4400' },
      { label: 'Industry', value: 'Technology' },
    ],
  },
  { key: '2', text: 'Fabrikam Inc', secondaryText: 'ACC-2071', icon: <BuildingRegular /> },
  { key: '3', text: 'Adventure Works', secondaryText: 'ACC-3390', icon: <BuildingRegular /> },
  { key: '4', text: 'Northwind Traders', secondaryText: 'ACC-4118', icon: <BuildingRegular /> },
];

const statusOptions = [
  { value: 1, label: 'Active', color: '#107c10' },
  { value: 2, label: 'Inactive', color: '#a19f9d' },
  { value: 3, label: 'Pending Review', color: '#f7630c' },
  { value: 4, label: 'Escalated', color: '#d13438' },
];

const industryOptions = [
  { value: 10, label: 'Technology' },
  { value: 20, label: 'Manufacturing' },
  { value: 30, label: 'Retail' },
  { value: 40, label: 'Financial Services' },
  { value: 50, label: 'Healthcare' },
];

const commandItems = [
  { key: 'new', text: 'New', icon: <AddRegular />, appearance: 'primary' as const },
  { key: 'edit', text: 'Edit', icon: <EditRegular /> },
  { key: 'delete', text: 'Delete', icon: <DeleteRegular /> },
  { key: 'refresh', text: 'Refresh', icon: <ArrowClockwiseRegular />, dividerBefore: true },
  { key: 'assign', text: 'Assign', icon: <PersonRegular /> },
  { key: 'share', text: 'Share', icon: <ShareRegular /> },
  {
    key: 'export',
    text: 'Export',
    icon: <ArrowDownloadRegular />,
    subItems: [{ key: 'excel', text: 'Export to Excel' }],
  },
  { key: 'flow', text: 'Flow', icon: <FlashRegular /> },
  { key: 'templates', text: 'Word Templates', icon: <DocumentRegular /> },
];

/** Selected-state wrappers need state, so each is a tiny component. */
const LookupAtRest: React.FC = () => {
  const [selected, setSelected] = React.useState<LookupOption | null>(accountOptions[0]);
  return (
    <Lookup
      options={accountOptions}
      selectedOption={selected}
      onOptionSelect={setSelected}
      entityIcon={<BuildingRegular />}
      onRecordClick={() => undefined}
    />
  );
};

const OwnerLookupAtRest: React.FC = () => {
  const [owner, setOwner] = React.useState(shotOwners[0]);
  return (
    <OwnerLookup
      selectedOwner={owner}
      onOwnerSelect={(next) => next && setOwner(next)}
      owners={shotOwners}
      showHoverCard={false}
      onOwnerClick={() => undefined}
    />
  );
};

const OwnerLookupMulti: React.FC = () => {
  const [owners, setOwners] = React.useState([shotOwners[0], shotOwners[5]]);
  return (
    <OwnerLookup
      multiSelect
      selectedOwners={owners}
      onOwnersSelect={setOwners}
      owners={shotOwners}
      showHoverCard={false}
    />
  );
};

const DateField: React.FC<{ behavior: 'UserLocal' | 'DateOnly' | 'TimeZoneIndependent' }> = ({ behavior }) => {
  const [value, setValue] = React.useState<string | null>('2026-08-06T09:30:00Z');
  return (
    <DateTimeField
      label={behavior}
      behavior={behavior}
      showTime={behavior !== 'DateOnly'}
      value={value}
      onChange={(stored) => setValue(stored)}
    />
  );
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const SHOTS: ShotDefinition[] = [
  {
    id: 'lookup-rest',
    label: 'Lookup — resolved (rest state)',
    width: 420,
    render: () => <LookupAtRest />,
  },
  {
    id: 'lookup-open',
    label: 'Lookup — dropdown open',
    width: 420,
    overlayHeight: 230,
    render: () => <Lookup options={accountOptions} open placeholder="Search accounts..." />,
  },
  {
    id: 'lookup-empty',
    label: 'Lookup — empty',
    width: 420,
    render: () => <Lookup options={accountOptions} placeholder="Search accounts..." />,
  },
  {
    id: 'optionset-closed',
    label: 'OptionSetField — single select',
    width: 360,
    render: () => (
      <OptionSetField label="Status Reason" options={statusOptions} showColors value={1} onChange={() => undefined} />
    ),
  },
  {
    id: 'optionset-open',
    label: 'OptionSetField — listbox open',
    width: 360,
    overlayHeight: 190,
    render: () => (
      <OptionSetField label="Status Reason" options={statusOptions} showColors value={1} open onChange={() => undefined} />
    ),
  },
  {
    id: 'optionset-multi',
    label: 'OptionSetField — multi-select',
    width: 360,
    render: () => (
      <OptionSetField
        label="Industries"
        options={industryOptions}
        multiselect
        value={[10, 30, 50]}
        onChange={() => undefined}
      />
    ),
  },
  {
    id: 'commandbar',
    label: 'CommandBar — with overflow',
    width: 720,
    render: () => <CommandBar items={commandItems} farItems={[{ key: 'filter', title: 'Filter', icon: <FilterRegular /> }]} />,
  },
  {
    id: 'entitygrid',
    label: 'EntityGrid — populated',
    width: 900,
    render: () => (
      <EntityGrid
        entityName="account"
        title="Accounts"
        height={380}
        pageSize={8}
        selectable
        columns={[
          { name: 'name', width: 240 },
          { name: 'accountnumber', width: 150 },
          { name: 'telephone1', width: 170 },
          { name: 'primarycontactid', width: 170 },
          { name: 'industrycode', width: 160 },
        ]}
      />
    ),
  },
  {
    id: 'datetimefield',
    label: 'DateTimeField — three behaviors',
    width: 760,
    render: () => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <DateField behavior="UserLocal" />
        <DateField behavior="DateOnly" />
        <DateField behavior="TimeZoneIndependent" />
      </div>
    ),
  },
  {
    id: 'querybuilder',
    label: 'QueryBuilder — populated',
    width: 960,
    render: () => (
      <div style={{ height: 520, display: 'flex', flexDirection: 'column' }}>
        <QueryBuilder
          entityName="account"
          entityDisplayName="Accounts"
          showFetchXmlPreview
          fields={[
            { id: 'name', label: 'Account Name', dataType: 'string' },
            { id: 'revenue', label: 'Annual Revenue', dataType: 'number' },
            { id: 'createdon', label: 'Created On', dataType: 'datetime' },
            {
              id: 'statuscode',
              label: 'Status Reason',
              dataType: 'optionset',
              options: statusOptions.map((o) => ({ label: o.label, value: o.value })),
            },
          ]}
          initialFetchXml={`<fetch><entity name="account"><filter type="and">
            <condition attribute="name" operator="like" value="%Contoso%" />
            <condition attribute="revenue" operator="gt" value="500000" />
          </filter></entity></fetch>`}
        />
      </div>
    ),
  },
  {
    id: 'hovercard',
    label: 'RecordHoverCard — card open',
    width: 460,
    overlayHeight: 210,
    render: () => (
      <RecordHoverCard
        open
        record={{
          title: 'Contoso Ltd',
          subtitle: 'ACC-1042',
          icon: <BuildingRegular />,
          details: [
            { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Active</Badge> },
            { label: 'Phone', value: '+64 9 261 4400' },
            { label: 'Industry', value: 'Technology' },
            { label: 'Owner', value: 'Gareth Cheyne' },
          ],
        }}
        actions={<Link>Open record</Link>}
      >
        <Link style={{ fontSize: 14 }}>Contoso Ltd</Link>
      </RecordHoverCard>
    ),
  },
  {
    id: 'persona',
    label: 'SystemUserPersona — sizes',
    width: 420,
    render: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SystemUserPersona user={shotUsers[0]} size="large" imageUrl={null} showHoverCard={false} />
        <SystemUserPersona user={shotUsers[1]} size="medium" imageUrl={null} showHoverCard={false} />
        <SystemUserPersona user={shotUsers[2]} size="small" imageUrl={null} showHoverCard={false} />
      </div>
    ),
  },
  {
    id: 'persona-card',
    label: 'SystemUserPersona — contact card',
    width: 340,
    render: () => (
      <div
        style={{
          width: 320,
          border: '1px solid #e1dfdd',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <SystemUserCard
          user={shotUsers[0]}
          loading={false}
          error={null}
          imageUrl={null}
          presence="available"
          actions={<Link style={{ fontSize: 12 }}>Open record</Link>}
        />
      </div>
    ),
  },
  {
    id: 'ownerlookup-rest',
    label: 'OwnerLookup — resolved',
    width: 420,
    render: () => <OwnerLookupAtRest />,
  },
  {
    id: 'ownerlookup-multi',
    label: 'OwnerLookup — multi-select',
    width: 520,
    render: () => <OwnerLookupMulti />,
  },
  {
    id: 'ownerlookup-open',
    label: 'OwnerLookup — users and teams',
    width: 420,
    overlayHeight: 240,
    // Trimmed to two of each type: the list scrolls at 250px, and a doc image should
    // show both owner kinds rather than a scroll boundary
    render: () => (
      <OwnerLookup
        owners={[shotOwners[0], shotOwners[1], shotOwners[5], shotOwners[6]]}
        types={['systemuser', 'team']}
        open
        placeholder="Search users and teams..."
      />
    ),
  },
  {
    id: 'lookup-hovercard',
    label: 'Lookup — hover card in the list',
    width: 800,
    overlayHeight: 210,
    // Hover the first result so the card the shot is meant to document is on screen
    hoverSelector: '[role="option"]',
    hoverSettleMs: 1400,
    // The dropdown matches the input width and the card opens beside it, so the
    // control is held narrow inside a wider frame to leave the card somewhere to go
    render: () => (
      <div style={{ width: 380 }}>
        <Lookup
          options={accountOptions.map((option, index) => ({
            ...option,
            entityName: 'account',
            recordId: shotAccounts[index]?.accountid,
          }))}
          open
          showHoverCard
          hoverCardColumns={['accountnumber', 'telephone1', 'primarycontactid']}
          placeholder="Search accounts..."
        />
      </div>
    ),
  },
  {
    id: 'avatar-row',
    label: 'SystemUserPersona — avatar only',
    width: 260,
    render: () => (
      <div style={{ display: 'flex', gap: 8 }}>
        {shotUsers.map((user) => (
          <Avatar key={user.systemuserid} size={32} name={user.fullname} />
        ))}
      </div>
    ),
  },
];

export const findShot = (id: string | null): ShotDefinition | undefined =>
  SHOTS.find((shot) => shot.id === id);
