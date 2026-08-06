/**
 * Owner lookups.
 *
 * `ownerid` in Dynamics is polymorphic: an owner is a systemuser *or* a team, and a
 * picker for it has to search both and keep track of which it found. This normalizes
 * the two record shapes into one `OwnerRecord` so callers do not branch on entity type
 * for every field.
 */

import { escapeODataString, webApiGet } from './webApi';
import type { WebApiCollection, WebApiRequestOptions } from './webApi';
import { SYSTEM_USER_COLUMNS, searchSystemUsers } from './systemUser';
import type { SystemUserRecord } from './systemUser';

export type OwnerType = 'systemuser' | 'team';

/** A systemuser or team, flattened to the fields an owner picker renders. */
export interface OwnerRecord {
  /** systemuserid or teamid */
  id: string;
  /** fullname for a user, name for a team */
  name: string;
  type: OwnerType;
  /** Job title. Users only. */
  jobtitle?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  /** Postal address. Users only. */
  address?: string | null;
  businessUnit?: string | null;
  /** Whether the user account is disabled. Users only. */
  isdisabled?: boolean;
  /** Team description. Teams only. */
  description?: string | null;
  /** Team administrator's name. Teams only. */
  administrator?: string | null;
}

const FORMATTED = '@OData.Community.Display.V1.FormattedValue';

const TEAM_COLUMNS = ['teamid', 'name', 'description', 'emailaddress', '_businessunitid_value', '_administratorid_value'];

/** Map a systemuser onto the shared owner shape. */
export const ownerFromUser = (user: SystemUserRecord): OwnerRecord => ({
  id: user.systemuserid,
  name: user.fullname || 'Unnamed user',
  type: 'systemuser',
  jobtitle: user.jobtitle,
  email: user.internalemailaddress,
  phone: user.address1_telephone1,
  mobile: user.mobilephone,
  address: user.address1_composite,
  businessUnit: user.businessUnit,
  isdisabled: user.isdisabled,
});

const ownerFromTeam = (raw: Record<string, unknown>): OwnerRecord => ({
  id: String(raw.teamid ?? ''),
  name: (raw.name as string) || 'Unnamed team',
  type: 'team',
  email: (raw.emailaddress as string) ?? null,
  description: (raw.description as string) ?? null,
  businessUnit: (raw[`_businessunitid_value${FORMATTED}`] as string) ?? null,
  administrator: (raw[`_administratorid_value${FORMATTED}`] as string) ?? null,
});

export interface SearchOwnersOptions extends WebApiRequestOptions {
  /** Which owner types to search. Defaults to both. */
  types?: OwnerType[];
  /** Maximum records **per type**. Defaults to 15. */
  top?: number;
  /** Include disabled user accounts. Defaults to false. */
  includeDisabled?: boolean;
}

/** Search teams by name. */
export const searchTeams = async (
  searchText: string,
  options: { top?: number } & WebApiRequestOptions = {},
): Promise<OwnerRecord[]> => {
  const { top = 15, ...request } = options;

  const params = [`$select=${TEAM_COLUMNS.join(',')}`, `$top=${top}`, '$orderby=name asc'];
  const filters: string[] = [];
  if (searchText.trim()) {
    filters.push(`contains(name,'${escapeODataString(searchText.trim())}')`);
  }
  // teamtype 0 = Owner team. Access teams and AAD-managed teams cannot own records,
  // so offering them in an owner picker would produce an unassignable selection.
  filters.push('teamtype eq 0');
  params.push(`$filter=${filters.join(' and ')}`);

  const response = await webApiGet<WebApiCollection<Record<string, unknown>>>(`teams?${params.join('&')}`, {
    ...request,
    headers: {
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      ...request.headers,
    },
  });

  return (response.value || []).map(ownerFromTeam);
};

/**
 * Search users and teams together.
 *
 * The two queries run in parallel and are merged with users first, matching how the
 * Dynamics owner lookup groups its results. One type failing does not lose the other -
 * a caller with no read access to teams still gets users back.
 */
export const searchOwners = async (
  searchText: string,
  options: SearchOwnersOptions = {},
): Promise<OwnerRecord[]> => {
  const { types = ['systemuser', 'team'], top = 15, includeDisabled = false, ...request } = options;

  const [users, teams] = await Promise.all([
    types.includes('systemuser')
      ? searchSystemUsers(searchText, { top, includeDisabled, ...request })
          .then((found) => found.map(ownerFromUser))
          .catch(() => [] as OwnerRecord[])
      : Promise.resolve([] as OwnerRecord[]),
    types.includes('team')
      ? searchTeams(searchText, { top, ...request }).catch(() => [] as OwnerRecord[])
      : Promise.resolve([] as OwnerRecord[]),
  ]);

  return [...users, ...teams];
};

/** Retrieve a single owner once its type is known. */
export const getOwner = async (
  id: string,
  type: OwnerType,
  options: WebApiRequestOptions = {},
): Promise<OwnerRecord> => {
  const headers = {
    Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    ...options.headers,
  };

  if (type === 'team') {
    const raw = await webApiGet<Record<string, unknown>>(
      `teams(${id})?$select=${TEAM_COLUMNS.join(',')}`,
      { ...options, headers },
    );
    return ownerFromTeam(raw);
  }

  const raw = await webApiGet<Record<string, unknown>>(
    `systemusers(${id})?$select=${SYSTEM_USER_COLUMNS.join(',')}`,
    { ...options, headers },
  );

  return ownerFromUser({
    systemuserid: String(raw.systemuserid ?? id),
    fullname: (raw.fullname as string) ?? null,
    jobtitle: (raw.jobtitle as string) ?? null,
    internalemailaddress: (raw.internalemailaddress as string) ?? null,
    mobilephone: (raw.mobilephone as string) ?? null,
    address1_telephone1: (raw.address1_telephone1 as string) ?? null,
    address1_composite: (raw.address1_composite as string) ?? null,
    title: (raw.title as string) ?? null,
    isdisabled: Boolean(raw.isdisabled),
    businessUnit: (raw[`_businessunitid_value${FORMATTED}`] as string) ?? null,
  });
};
