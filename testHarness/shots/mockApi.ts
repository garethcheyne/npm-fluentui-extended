/**
 * Canned Web API responses for documentation captures.
 *
 * Screenshots have to show *populated* components, but the data-backed ones
 * (EntityGrid, SystemUserPersona, UserLookup, OptionSetField) are empty without an
 * org. Rather than requiring a live connection - which makes captures depend on
 * whatever happens to be in someone's environment, and leaks real customer names into
 * the docs - shot mode swaps the library's transport for this fixture router.
 */

import { setWebApiFetch } from '../../src';

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const notFound = (): Response => new Response('Not found', { status: 404 });

const FORMATTED = '@OData.Community.Display.V1.FormattedValue';

const ACCOUNTS = [
  { name: 'Contoso Ltd', accountnumber: 'ACC-1042', telephone1: '+64 9 261 4400', contact: 'Jane Smith', industry: 'Technology' },
  { name: 'Fabrikam Inc', accountnumber: 'ACC-2071', telephone1: '+64 9 555 0134', contact: 'Ravi Patel', industry: 'Manufacturing' },
  { name: 'Adventure Works', accountnumber: 'ACC-3390', telephone1: '+61 2 8014 7722', contact: 'Mia Nguyen', industry: 'Retail' },
  { name: 'Northwind Traders', accountnumber: 'ACC-4118', telephone1: '+61 3 9021 5510', contact: 'Tom Baker', industry: 'Retail' },
  { name: 'Litware Holdings', accountnumber: 'ACC-5263', telephone1: '+64 4 830 2200', contact: 'Sara Kelly', industry: 'Financial Services' },
  { name: 'Proseware Group', accountnumber: 'ACC-6087', telephone1: '+64 3 366 9910', contact: 'Alex Moore', industry: 'Healthcare' },
  { name: 'Tailwind Logistics', accountnumber: 'ACC-7345', telephone1: '+61 7 3210 8890', contact: 'Priya Shah', industry: 'Manufacturing' },
  { name: 'Wingtip Toys', accountnumber: 'ACC-8452', telephone1: '+64 9 300 1180', contact: 'Dan Wells', industry: 'Retail' },
];

const USERS = [
  { first: 'Gareth', last: 'Cheyne', jobtitle: 'Technical Solutions Lead (AU/NZ)', unit: 'Information Technology', phone: '+64 9 261 4400', mobile: '+64 22 391 0000' },
  { first: 'Jane', last: 'Smith', jobtitle: 'Sales Manager', unit: 'Sales', phone: '+64 9 261 4410', mobile: '+64 21 555 0102' },
  { first: 'Ravi', last: 'Patel', jobtitle: 'Solution Architect', unit: 'Information Technology', phone: '+61 2 8014 7701', mobile: '+61 400 118 220' },
  { first: 'Mia', last: 'Nguyen', jobtitle: 'Customer Success Manager', unit: 'Service', phone: '+61 3 9021 5533', mobile: '+61 400 771 903' },
  { first: 'Tom', last: 'Baker', jobtitle: 'Field Engineer', unit: 'Service', phone: '+64 4 830 2244', mobile: '+64 27 660 1120' },
];

const guid = (seed: number, prefix: string) =>
  `${prefix}${String(seed).padStart(4, '0')}-0000-0000-0000-${String(seed).padStart(12, '0')}`;

const accountRecords = ACCOUNTS.map((account, index) => ({
  accountid: guid(index + 1, 'acc'),
  name: account.name,
  accountnumber: account.accountnumber,
  telephone1: account.telephone1,
  _primarycontactid_value: guid(index + 1, 'con'),
  [`_primarycontactid_value${FORMATTED}`]: account.contact,
  primarycontactid: guid(index + 1, 'con'),
  [`primarycontactid${FORMATTED}`]: account.contact,
  industrycode: 10 + index,
  [`industrycode${FORMATTED}`]: account.industry,
}));

const userRecords = USERS.map((user, index) => ({
  systemuserid: guid(index + 1, 'usr'),
  fullname: `${user.first} ${user.last}`,
  jobtitle: user.jobtitle,
  internalemailaddress: `${user.first.toLowerCase()}.${user.last.toLowerCase()}@contoso.com`,
  mobilephone: user.mobile,
  address1_telephone1: user.phone,
  address1_composite: 'Head Office',
  title: user.jobtitle,
  isdisabled: false,
  '_businessunitid_value': guid(1, 'bu0'),
  [`_businessunitid_value${FORMATTED}`]: user.unit,
  // Mapped form too: these fixtures are handed straight to components as props in
  // some shots, bypassing the transport that would normally resolve the annotation
  businessUnit: user.unit,
}));

const OPTION_SETS: Record<string, Array<{ Value: number; Label: string; Color?: string }>> = {
  statuscode: [
    { Value: 1, Label: 'Active', Color: '#107c10' },
    { Value: 2, Label: 'Inactive', Color: '#a19f9d' },
    { Value: 3, Label: 'Pending Review', Color: '#f7630c' },
    { Value: 4, Label: 'Escalated', Color: '#d13438' },
  ],
  industrycode: [
    { Value: 10, Label: 'Technology' },
    { Value: 20, Label: 'Manufacturing' },
    { Value: 30, Label: 'Retail' },
    { Value: 40, Label: 'Financial Services' },
    { Value: 50, Label: 'Healthcare' },
  ],
};

const toOptions = (name: string) =>
  (OPTION_SETS[name] ?? []).map((option) => ({
    Value: option.Value,
    Label: { UserLocalizedLabel: { Label: option.Label } },
    Color: option.Color ?? null,
  }));

/** Route a Web API request to a fixture. Unmatched paths 404 so gaps are visible. */
const respond = (url: string): Response => {
  // Entity definition
  if (/EntityDefinitions\(LogicalName='account'\)\?/.test(url)) {
    return json({
      LogicalName: 'account',
      EntitySetName: 'accounts',
      PrimaryNameAttribute: 'name',
      PrimaryIdAttribute: 'accountid',
      DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
    });
  }

  // Picklist / optionset casts
  if (/PicklistAttributeMetadata/.test(url)) {
    return json({
      value: Object.keys(OPTION_SETS).map((name) => ({
        LogicalName: name,
        OptionSet: { Options: toOptions(name) },
      })),
    });
  }
  if (/AttributeMetadata/.test(url) && /Attributes\//.test(url)) {
    // Other casts (multiselect, state, status, lookup, datetime) contribute nothing here
    return json({ value: [] });
  }

  // Base attribute metadata - drives EntityGrid column labels
  if (/\/Attributes\?/.test(url)) {
    const labels: Record<string, string> = {
      name: 'Account Name',
      accountnumber: 'Account Number',
      telephone1: 'Main Phone',
      primarycontactid: 'Primary Contact',
      industrycode: 'Industry',
    };
    return json({
      value: Object.entries(labels).map(([logicalName, label]) => ({
        LogicalName: logicalName,
        DisplayName: { UserLocalizedLabel: { Label: label } },
      })),
    });
  }

  // Single user
  const userMatch = /systemusers\(([^)]+)\)/.exec(url);
  if (userMatch && !/\$value/.test(url)) {
    const found = userRecords.find((user) => user.systemuserid === userMatch[1]) ?? userRecords[0];
    return json(found);
  }

  // User search
  if (/^.*systemusers\?/.test(url)) {
    const search = /contains\(fullname,'([^']*)'\)/.exec(url)?.[1]?.toLowerCase();
    const filtered = search
      ? userRecords.filter((user) => user.fullname.toLowerCase().includes(search))
      : userRecords;
    return json({ value: filtered });
  }

  // Single account - what a hover card fetches
  const accountMatch = /accounts\(([^)]+)\)/.exec(url);
  if (accountMatch && !/\$value/.test(url)) {
    const found = accountRecords.find((a) => a.accountid === accountMatch[1]) ?? accountRecords[0];
    return json(found);
  }

  // Account collection - EntityGrid
  if (/accounts\?/.test(url)) {
    return json({ value: accountRecords, '@odata.count': accountRecords.length });
  }

  // Record photos: 404 so avatars fall back to initials rather than a broken image
  if (/\$value/.test(url)) return notFound();

  return notFound();
};

let installed = false;

/** Swap the library transport for the fixture router. Safe to call more than once. */
export const installShotApi = (): void => {
  if (installed) return;
  installed = true;

  setWebApiFetch(async (url) => {
    // A tiny delay lets loading states settle before a capture is taken
    await new Promise((resolve) => setTimeout(resolve, 10));
    return respond(url);
  });
};

export const shotAccounts = accountRecords;
export const shotUsers = userRecords;

/** Users and owner teams flattened into the OwnerRecord shape OwnerLookup takes. */
export const shotOwners = [
  ...userRecords.map((user) => ({
    id: user.systemuserid,
    name: user.fullname,
    type: 'systemuser' as const,
    jobtitle: user.jobtitle,
    email: user.internalemailaddress,
    phone: user.address1_telephone1,
    mobile: user.mobilephone,
    address: user.address1_composite,
    businessUnit: user.businessUnit,
    isdisabled: false,
  })),
  {
    id: guid(1, 'tem'),
    name: 'Sales Operations',
    type: 'team' as const,
    description: 'Owner team for shared pipeline records',
    businessUnit: 'Sales',
    administrator: 'Jane Smith',
    email: 'salesops@contoso.com',
  },
  {
    id: guid(2, 'tem'),
    name: 'Support Tier 2',
    type: 'team' as const,
    description: 'Escalation queue',
    businessUnit: 'Service',
    administrator: 'Mia Nguyen',
  },
];
