import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { setWebApiFetch } from './webApi';
import { clearMetadataCache } from './metadata';
import { clearHierarchyCache, getHierarchyChildren, getHierarchyRelationship, searchHierarchy } from './hierarchy';

/**
 * A small account tree served the way the Web API serves it. The responses are
 * the shapes a real environment returned for these queries, trimmed.
 */
const GROUP = '11111111-1111-1111-1111-111111111111';
const AGENCY = '22222222-2222-2222-2222-222222222222';
const STUDIO = '33333333-3333-3333-3333-333333333333';

const ACCOUNTS = [
  { accountid: GROUP, name: 'Horizon Media Group', _parentaccountid_value: null },
  { accountid: AGENCY, name: 'Horizon Agency', _parentaccountid_value: GROUP },
  { accountid: STUDIO, name: 'Pixel Studio', _parentaccountid_value: AGENCY },
];

let requests: string[] = [];

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const serve = (url: string): Response => {
  const path = decodeURIComponent(url);
  if (path.includes('EntityDefinitions') && path.includes('OneToManyRelationships')) {
    return json({
      value: [{ SchemaName: 'account_parent_account', ReferencingAttribute: 'parentaccountid', ReferencingEntity: 'account' }],
    });
  }
  if (path.includes('EntityDefinitions')) {
    return json({ LogicalName: 'account', EntitySetName: 'accounts', PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' });
  }
  if (path.includes('fetchXml=')) {
    const counts = ACCOUNTS.filter((a) => a._parentaccountid_value && path.includes(a._parentaccountid_value));
    const byParent = new Map<string, number>();
    for (const a of counts) byParent.set(a._parentaccountid_value!, (byParent.get(a._parentaccountid_value!) ?? 0) + 1);
    return json({ value: [...byParent].map(([parent, children]) => ({ parent, children })) });
  }
  if (path.includes('contains(name,')) {
    const text = /contains\(name,'([^']*)'\)/.exec(path)![1].toLowerCase();
    return json({ value: ACCOUNTS.filter((a) => a.name.toLowerCase().includes(text)) });
  }
  if (path.includes('_parentaccountid_value eq null')) {
    return json({ value: ACCOUNTS.filter((a) => !a._parentaccountid_value) });
  }
  const childOf = /_parentaccountid_value eq ([0-9a-f-]{36})/.exec(path);
  if (childOf) return json({ value: ACCOUNTS.filter((a) => a._parentaccountid_value === childOf[1]) });
  const ids = [...path.matchAll(/accountid eq ([0-9a-f-]{36})/g)].map((m) => m[1]);
  return json({ value: ACCOUNTS.filter((a) => ids.includes(a.accountid)) });
};

beforeEach(() => {
  clearMetadataCache();
  clearHierarchyCache();
  requests = [];
  setWebApiFetch(async (input) => {
    requests.push(input);
    return serve(input);
  });
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

describe('getHierarchyRelationship', () => {
  it('reads the parent column from the table’s hierarchical relationship', async () => {
    await expect(getHierarchyRelationship('account')).resolves.toEqual({
      schemaName: 'account_parent_account',
      parentAttribute: 'parentaccountid',
    });
  });

  it('resolves null for a table with no hierarchy', async () => {
    setWebApiFetch(async () => json({ value: [] }));

    await expect(getHierarchyRelationship('lead')).resolves.toBeNull();
  });
});

describe('getHierarchyChildren', () => {
  it('starts from the top of the tree, knowing which records have children', async () => {
    const roots = await getHierarchyChildren('account', null);

    expect(roots).toEqual([expect.objectContaining({ id: GROUP, name: 'Horizon Media Group', hasChildren: true })]);
  });

  it('lists the records under a parent', async () => {
    const children = await getHierarchyChildren('account', `{${AGENCY.toUpperCase()}}`);

    expect(children).toEqual([expect.objectContaining({ id: STUDIO, parentId: AGENCY, hasChildren: false })]);
  });

  it('refuses a parent id that is not a GUID rather than put it in a query', async () => {
    await expect(getHierarchyChildren('account', "x' or 1 eq 1")).rejects.toThrow('Not a record id');
  });
});

describe('searchHierarchy', () => {
  it('brings each match back with every ancestor', async () => {
    const found = await searchHierarchy('account', 'pixel');

    expect(found.map((record) => record.name).sort()).toEqual(['Horizon Agency', 'Horizon Media Group', 'Pixel Studio']);
  });

  it('fetches ancestors a level at a time, not a request per match', async () => {
    await searchHierarchy('account', 'pixel');

    const ancestorRequests = requests.filter((url) => decodeURIComponent(url).includes('accountid eq '));
    // Two levels above the match: one request each
    expect(ancestorRequests).toHaveLength(2);
  });
});
