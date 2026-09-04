/**
 * SystemUserPersona and UserLookup Examples
 *
 * Demonstrates the two people-oriented components:
 *
 * 1. **SystemUserPersona** - avatar + name + job title, with the contact card that
 *    a persona shows on hover in a Dynamics form. The card loads lazily, only once
 *    the pointer settles on the persona.
 * 2. **UserLookup** - a people picker built from Lookup + SystemUserPersona. Results
 *    render as personas, and the resolved user keeps its contact card.
 *
 * Both work offline against the static roster below, and switch to live
 * `systemusers` queries when connected to Dynamics 365.
 */

import { CodeExample } from '../shared/CodeExample';
import React, { useState } from 'react';
import { Link, Text } from '@fluentui/react-components';

// Import from the library source (../../../src) — in a real app you'd use:
// import { SystemUserPersona, UserLookup } from 'fluentui-extended';
import { SystemUserPersona, OwnerLookup, type SystemUserRecord, type OwnerRecord } from '../../../src';
import type { ExampleProps } from '../shared/types';

// =============================================================================
// STATIC ROSTER
// =============================================================================

/**
 * Offline roster so the tab is usable without a Dynamics connection.
 * Shapes match what the Web API returns for `systemusers`.
 */
const staticUsers: SystemUserRecord[] = [
  {
    systemuserid: 'usr0001-0000-0000-0000-000000000001',
    fullname: 'Gareth Cheyne',
    jobtitle: 'Technical Solutions Lead (AU/NZ)',
    internalemailaddress: 'gareth.cheyne@contoso.com',
    mobilephone: '+64 22 391 0000',
    address1_telephone1: '+64 9 261 4400',
    address1_composite: 'Head Office',
    businessUnit: 'Information Technology',
    isdisabled: false,
  },
  {
    systemuserid: 'usr0002-0000-0000-0000-000000000002',
    fullname: 'Jane Smith',
    jobtitle: 'Sales Manager',
    internalemailaddress: 'jane.smith@contoso.com',
    mobilephone: '+64 21 555 0102',
    address1_telephone1: '+64 9 261 4410',
    businessUnit: 'Sales',
    isdisabled: false,
  },
  {
    systemuserid: 'usr0003-0000-0000-0000-000000000003',
    fullname: 'Ravi Patel',
    jobtitle: 'Solution Architect',
    internalemailaddress: 'ravi.patel@contoso.com',
    mobilephone: '+61 400 118 220',
    address1_telephone1: '+61 2 8014 7701',
    businessUnit: 'Information Technology',
    isdisabled: false,
  },
  {
    systemuserid: 'usr0004-0000-0000-0000-000000000004',
    fullname: 'Mia Nguyen',
    jobtitle: 'Customer Success Manager',
    internalemailaddress: 'mia.nguyen@contoso.com',
    businessUnit: 'Service',
    isdisabled: true,
  },
];

/** The same people, plus a couple of owner teams, in OwnerRecord shape. */
const staticOwners: OwnerRecord[] = [
  ...staticUsers.map((user) => ({
    id: user.systemuserid,
    name: user.fullname ?? '',
    type: 'systemuser' as const,
    jobtitle: user.jobtitle,
    email: user.internalemailaddress,
    phone: user.address1_telephone1,
    mobile: user.mobilephone,
    address: user.address1_composite,
    businessUnit: user.businessUnit,
    isdisabled: user.isdisabled,
  })),
  {
    id: 'tem0001-0000-0000-0000-000000000001',
    name: 'Sales Operations',
    type: 'team',
    description: 'Owner team for shared pipeline records',
    businessUnit: 'Sales',
    administrator: 'Jane Smith',
    email: 'salesops@contoso.com',
  },
  {
    id: 'tem0002-0000-0000-0000-000000000002',
    name: 'Support Tier 2',
    type: 'team',
    description: 'Escalation queue',
    businessUnit: 'Service',
    administrator: 'Mia Nguyen',
  },
];

const card = {
  border: '1px solid #e1dfdd',
  borderRadius: 8,
  padding: 16,
  background: '#fff',
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export const PeopleExamples: React.FC<ExampleProps> = ({ dynamicsConnected, onCommandLog }) => {
  const [selectedOwner, setSelectedOwner] = useState<OwnerRecord | null>(staticOwners[0]);
  const [multiOwners, setMultiOwners] = useState<OwnerRecord[]>([staticOwners[0], staticOwners[4]]);
  const [liveOwner, setLiveOwner] = useState<OwnerRecord | null>(null);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SystemUserPersona
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>SystemUserPersona</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Hover a persona to reveal its contact card. The record is fetched only once the
          pointer settles, so a column of these costs one request per card actually looked at.
        </p>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SystemUserPersona
            user={staticUsers[0]}
            size="large"
            imageUrl={null}
            presence="available"
            cardActions={<Link onClick={() => onCommandLog?.('Open user record')}>Open record</Link>}
          />
          <SystemUserPersona user={staticUsers[1]} size="medium" imageUrl={null} presence="busy" />
          <SystemUserPersona user={staticUsers[2]} size="small" imageUrl={null} presence="away" />
          <SystemUserPersona user={staticUsers[3]} size="medium" imageUrl={null} />
        </div>

        <h3 style={{ marginTop: 24 }}>Avatar only</h3>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Names collapse into a tooltip, for dense surfaces like a grid cell or an owner column.
        </p>
        <div style={{ ...card, display: 'flex', gap: 12 }}>
          {staticUsers.map((user) => (
            <SystemUserPersona key={user.systemuserid} user={user} avatarOnly imageUrl={null} />
          ))}
        </div>
        <CodeExample sampleId="people-systemuserpersona" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          UserLookup
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>OwnerLookup</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          A preconfigured <code>Lookup</code> for <code>ownerid</code>, which is polymorphic — an
          owner is a user <em>or</em> a team. Hover a badge or a result to see its card.
        </p>

        <div style={{ ...card, maxWidth: 420 }}>
          <OwnerLookup
            label="Owner"
            types={['systemuser', 'team']}
            owners={staticOwners}
            selectedOwner={selectedOwner}
            onOwnerSelect={setSelectedOwner}
            onOwnerClick={(owner) => onCommandLog?.(`Open ${owner.type} ${owner.name}`)}
            cardActions={<Link onClick={() => onCommandLog?.('Open record')}>Open record</Link>}
          />
        </div>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected: <strong>{selectedOwner?.name ?? 'None'}</strong>
          {selectedOwner && <> ({selectedOwner.type})</>}
        </p>

        <h3 style={{ marginTop: 24 }}>Multi-select</h3>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Selections render as badges, the same as any multi-select Lookup.
        </p>
        <div style={{ ...card, maxWidth: 520 }}>
          <OwnerLookup
            label="Notify"
            multiSelect
            types={['systemuser', 'team']}
            owners={staticOwners}
            selectedOwners={multiOwners}
            onOwnersSelect={setMultiOwners}
            cardActions={<Link onClick={() => onCommandLog?.('Open record')}>Open record</Link>}
          />
        </div>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected: <strong>{multiOwners.map((o) => o.name).join(', ') || 'None'}</strong>
        </p>
        <CodeExample sampleId="people-ownerlookup" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          Live systemusers
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Live owners</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          {dynamicsConnected
            ? 'Queries systemusers and owner teams in parallel, filtered to enabled interactive users. Record photos load from each user’s entityimage.'
            : 'Connect to Dynamics 365 to search real users and teams.'}
        </p>

        {dynamicsConnected ? (
          <>
            <div style={{ ...card, maxWidth: 420 }}>
              <OwnerLookup
                label="Assign to"
                types={['systemuser', 'team']}
                selectedOwner={liveOwner}
                onOwnerSelect={setLiveOwner}
                onOwnerClick={(owner) => onCommandLog?.(`Open ${owner.type} ${owner.name}`)}
                onSearchError={(err) => console.error('[OwnerLookup]', err)}
                cardActions={<Link onClick={() => onCommandLog?.('Open record')}>Open record</Link>}
              />
            </div>
            {liveOwner?.type === 'systemuser' && (
              <div style={{ ...card, marginTop: 16, maxWidth: 420 }}>
                <SystemUserPersona userId={liveOwner.id} size="large" />
              </div>
            )}
          </>
        ) : (
          <div style={{ ...card, borderStyle: 'dashed', textAlign: 'center', color: '#888' }}>
            <Text size={200}>Not connected.</Text>
          </div>
        )}
        <CodeExample sampleId="people-live-owners" />
      </section>
    </>
  );
};
