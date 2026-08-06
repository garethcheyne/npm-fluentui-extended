/**
 * systemuser lookups and retrieval.
 *
 * Kept separate from the generic metadata client because user records have their own
 * quirks: the display name lives on `fullname` rather than `name`, disabled users are
 * still returned by default, and the record photo is a binary property that has to be
 * addressed through its own `$value` path rather than selected as a column.
 */

import { escapeODataString, webApiGet, getWebApiBaseUrl } from './webApi';
import type { WebApiCollection, WebApiRequestOptions } from './webApi';

/** Columns a persona needs to render without a second round trip. */
export const SYSTEM_USER_COLUMNS = [
  'systemuserid',
  'fullname',
  'jobtitle',
  'internalemailaddress',
  'mobilephone',
  'address1_telephone1',
  'address1_composite',
  'title',
  'isdisabled',
  '_businessunitid_value',
] as const;

/** A systemuser record, narrowed to what the persona components read. */
export interface SystemUserRecord {
  systemuserid: string;
  fullname?: string | null;
  jobtitle?: string | null;
  internalemailaddress?: string | null;
  mobilephone?: string | null;
  address1_telephone1?: string | null;
  address1_composite?: string | null;
  title?: string | null;
  isdisabled?: boolean;
  /** Business unit name, resolved from the lookup's formatted-value annotation */
  businessUnit?: string | null;
}

const BUSINESS_UNIT_FORMATTED = '_businessunitid_value@OData.Community.Display.V1.FormattedValue';

/**
 * URL for a user's record photo.
 *
 * `entityimage` is a binary property: selecting it alongside other columns returns the
 * raw base64 inline and bloats every search response, so the image is addressed by URL
 * and left to the browser to fetch and cache.
 */
export const systemUserImageUrl = (systemUserId: string): string =>
  `${getWebApiBaseUrl()}/systemusers(${systemUserId})/entityimage/$value`;

const toRecord = (raw: Record<string, unknown>): SystemUserRecord => ({
  systemuserid: String(raw.systemuserid ?? ''),
  fullname: (raw.fullname as string) ?? null,
  jobtitle: (raw.jobtitle as string) ?? null,
  internalemailaddress: (raw.internalemailaddress as string) ?? null,
  mobilephone: (raw.mobilephone as string) ?? null,
  address1_telephone1: (raw.address1_telephone1 as string) ?? null,
  address1_composite: (raw.address1_composite as string) ?? null,
  title: (raw.title as string) ?? null,
  isdisabled: Boolean(raw.isdisabled),
  businessUnit: (raw[BUSINESS_UNIT_FORMATTED] as string) ?? null,
});

/** Retrieve a single user. */
export const getSystemUser = async (
  systemUserId: string,
  options: WebApiRequestOptions = {},
): Promise<SystemUserRecord> => {
  const raw = await webApiGet<Record<string, unknown>>(
    `systemusers(${systemUserId})?$select=${SYSTEM_USER_COLUMNS.join(',')}`,
    {
      ...options,
      headers: {
        // Resolves the business unit lookup to its name
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
        ...options.headers,
      },
    },
  );

  return toRecord(raw);
};

export interface SearchSystemUsersOptions extends WebApiRequestOptions {
  /** Maximum records to return. Defaults to 25. */
  top?: number;
  /**
   * Include users whose account is disabled. Defaults to false - a disabled user is
   * rarely a valid choice on a form, and Dynamics hides them from lookups too.
   */
  includeDisabled?: boolean;
  /**
   * Exclude non-interactive and application users. Defaults to true, so integration
   * accounts do not clutter a people picker.
   */
  interactiveOnly?: boolean;
}

/**
 * Search users by name.
 *
 * An empty `searchText` returns the first page unfiltered, which is what a people
 * picker wants on focus before anything has been typed.
 */
export const searchSystemUsers = async (
  searchText: string,
  options: SearchSystemUsersOptions = {},
): Promise<SystemUserRecord[]> => {
  const { top = 25, includeDisabled = false, interactiveOnly = true, ...request } = options;

  const filters: string[] = [];
  if (searchText.trim()) {
    filters.push(`contains(fullname,'${escapeODataString(searchText.trim())}')`);
  }
  if (!includeDisabled) {
    filters.push('isdisabled eq false');
  }
  if (interactiveOnly) {
    // accessmode 0 = Read-Write (a normal interactive user); 4 = Non-interactive
    filters.push('accessmode eq 0');
  }

  const params = [`$select=${SYSTEM_USER_COLUMNS.join(',')}`, `$top=${top}`, '$orderby=fullname asc'];
  if (filters.length > 0) {
    params.push(`$filter=${filters.join(' and ')}`);
  }

  const response = await webApiGet<WebApiCollection<Record<string, unknown>>>(
    `systemusers?${params.join('&')}`,
    {
      ...request,
      headers: {
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
        ...request.headers,
      },
    },
  );

  return (response.value || []).map(toRecord);
};

/** Initials for an avatar fallback, e.g. "Gareth Cheyne" -> "GC". */
export const initialsOf = (fullName: string | null | undefined): string | undefined => {
  if (!fullName?.trim()) return undefined;

  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';

  return (first + last).toUpperCase() || undefined;
};
