/**
 * Dataverse's own record hierarchies, for a hierarchical Lookup.
 *
 * A table can mark one relationship to itself as hierarchical - an account's
 * parent account, a business unit's parent, a product family - and Dataverse
 * then answers "under" and "above" questions about it. That relationship is the
 * only reliable source of which column holds the parent: the name varies
 * (`parentaccountid`, `parent_contactid`, `msdyn_parenttag`), so it is read from
 * metadata rather than guessed.
 */

import { escapeODataString, webApiGet } from './webApi';
import type { WebApiCollection, WebApiRequestOptions } from './webApi';
import { getEntityDefinition } from './metadata';

/** A table's hierarchical relationship. */
export interface HierarchyRelationship {
  /** Relationship schema name, e.g. "account_parent_account". */
  schemaName: string;
  /** Lookup column holding the parent, e.g. "parentaccountid". */
  parentAttribute: string;
}

/** A record placed in its hierarchy. */
export interface HierarchyRecord {
  id: string;
  name: string;
  parentId: string | null;
  /** Whether any record names this one as its parent. */
  hasChildren: boolean;
  /** The row as returned, for columns asked for through `select`. */
  raw: Record<string, unknown>;
}

export interface HierarchyQueryOptions extends WebApiRequestOptions {
  /** The parent column, when the table's hierarchical relationship should not be used. */
  parentAttribute?: string;
  /** Further columns to return on each record's `raw`. */
  select?: string[];
  /**
   * An OData filter every record must also pass, e.g. `statecode eq 0`. Applied
   * to matches and children; ancestors are fetched regardless, since a match
   * without its path is the thing this module exists to avoid.
   */
  filter?: string;
  /** Most records to return. Defaults to 250 for children, 25 for search matches. */
  top?: number;
}

const relationshipCache = new Map<string, Promise<HierarchyRelationship | null>>();

/** Clear cached relationships. Exposed mainly for tests. */
export const clearHierarchyCache = (): void => {
  relationshipCache.clear();
};

/**
 * Find a table's hierarchical relationship. Resolves `null` for a table that
 * has none - most tables - rather than failing.
 */
export const getHierarchyRelationship = (entityLogicalName: string): Promise<HierarchyRelationship | null> => {
  const cached = relationshipCache.get(entityLogicalName);
  if (cached) return cached;

  const request = webApiGet<
    WebApiCollection<{ SchemaName: string; ReferencingAttribute: string; ReferencingEntity: string }>
  >(
    `EntityDefinitions(LogicalName='${entityLogicalName}')/OneToManyRelationships` +
      '?$select=SchemaName,ReferencingAttribute,ReferencingEntity&$filter=IsHierarchical eq true',
  )
    .then((response) => {
      // Hierarchical relationships are always to the table itself; the check is belt and braces
      const relationship = (response.value || []).find((r) => r.ReferencingEntity === entityLogicalName);
      return relationship
        ? { schemaName: relationship.SchemaName, parentAttribute: relationship.ReferencingAttribute }
        : null;
    })
    .catch((err) => {
      relationshipCache.delete(entityLogicalName);
      throw err;
    });

  relationshipCache.set(entityLogicalName, request);
  return request;
};

/** A GUID with the braces some surfaces add stripped, or an error for anything that is not one. */
const guid = (value: string): string => {
  const id = value.replace(/[{}]/g, '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`Not a record id: ${value}`);
  }
  return id.toLowerCase();
};

interface HierarchyContext {
  entitySetName: string;
  idAttribute: string;
  nameAttribute: string;
  parentAttribute: string;
  /** The parent column as the Web API returns it: `_parentaccountid_value`. */
  parentValue: string;
}

const resolveContext = async (entityLogicalName: string, options: HierarchyQueryOptions): Promise<HierarchyContext> => {
  const [entity, relationship] = await Promise.all([
    getEntityDefinition(entityLogicalName),
    options.parentAttribute ? Promise.resolve(null) : getHierarchyRelationship(entityLogicalName),
  ]);
  const parentAttribute = options.parentAttribute ?? relationship?.parentAttribute;
  if (!parentAttribute) {
    throw new Error(`${entityLogicalName} has no hierarchical relationship; pass parentAttribute`);
  }
  return {
    entitySetName: entity.EntitySetName,
    idAttribute: entity.PrimaryIdAttribute,
    nameAttribute: entity.PrimaryNameAttribute,
    parentAttribute,
    parentValue: `_${parentAttribute}_value`,
  };
};

const selectFor = (context: HierarchyContext, options: HierarchyQueryOptions): string =>
  [...new Set([context.idAttribute, context.nameAttribute, context.parentValue, ...(options.select ?? [])])].join(',');

const andFilter = (filter: string, extra?: string): string => (extra ? `(${filter}) and (${extra})` : filter);

const toRecords = (context: HierarchyContext, rows: Record<string, unknown>[]): HierarchyRecord[] =>
  rows.map((raw) => ({
    id: String(raw[context.idAttribute] ?? ''),
    name: String(raw[context.nameAttribute] ?? ''),
    parentId: (raw[context.parentValue] as string | null) ?? null,
    hasChildren: false,
    raw,
  }));

/** How many ids go in one request: enough to be few round trips, few enough to stay inside a URL. */
const ID_CHUNK = 50;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

/**
 * Mark which records have children, so the list draws a chevron only where
 * there is something under it.
 *
 * FetchXML, because this is a count grouped by a lookup: OData's `$apply` will
 * not group on one (it rejects `_parentaccountid_value` outright), and fetching
 * the children themselves to count them would pull every child of every row.
 */
const markChildren = async (
  entityLogicalName: string,
  context: HierarchyContext,
  records: HierarchyRecord[],
  options: WebApiRequestOptions,
): Promise<HierarchyRecord[]> => {
  const ids = records.map((record) => record.id).filter(Boolean);
  const withChildren = new Set<string>();

  await Promise.all(
    chunk(ids, ID_CHUNK).map(async (ids) => {
      const fetchXml =
        `<fetch aggregate="true"><entity name="${entityLogicalName}">` +
        `<attribute name="${context.parentAttribute}" groupby="true" alias="parent"/>` +
        `<attribute name="${context.idAttribute}" aggregate="count" alias="children"/>` +
        `<filter><condition attribute="${context.parentAttribute}" operator="in">` +
        ids.map((id) => `<value>${id}</value>`).join('') +
        '</condition></filter></entity></fetch>';
      const response = await webApiGet<WebApiCollection<{ parent?: string; children?: number }>>(
        `${context.entitySetName}?fetchXml=${encodeURIComponent(fetchXml)}`,
        options,
      );
      for (const row of response.value || []) {
        if (row.parent && (row.children ?? 0) > 0) withChildren.add(row.parent.toLowerCase());
      }
    }),
  );

  return records.map((record) => ({ ...record, hasChildren: withChildren.has(record.id.toLowerCase()) }));
};

/**
 * The records directly under a parent, or the top of the tree for `null`.
 * Each comes back knowing whether it has children of its own.
 */
export const getHierarchyChildren = async (
  entityLogicalName: string,
  parentId: string | null,
  options: HierarchyQueryOptions = {},
): Promise<HierarchyRecord[]> => {
  const context = await resolveContext(entityLogicalName, options);
  const filter = andFilter(
    parentId === null ? `${context.parentValue} eq null` : `${context.parentValue} eq ${guid(parentId)}`,
    options.filter,
  );
  const response = await webApiGet<WebApiCollection<Record<string, unknown>>>(
    `${context.entitySetName}?$select=${selectFor(context, options)}` +
      `&$filter=${filter}&$orderby=${context.nameAttribute}&$top=${options.top ?? 250}`,
    options,
  );
  return markChildren(entityLogicalName, context, toRecords(context, response.value || []), options);
};

/** Ceiling on levels walked up from a match, so bad data cannot loop forever. */
const MAX_DEPTH = 25;

/**
 * Records whose name contains `searchText`, together with every ancestor of
 * each, so the list can show where each match sits.
 *
 * Ancestors are fetched a level at a time - one request per level for all the
 * matches together - rather than one `Above` query per match, which would be
 * a request per result.
 */
export const searchHierarchy = async (
  entityLogicalName: string,
  searchText: string,
  options: HierarchyQueryOptions = {},
): Promise<HierarchyRecord[]> => {
  const context = await resolveContext(entityLogicalName, options);
  const filter = andFilter(`contains(${context.nameAttribute},'${escapeODataString(searchText)}')`, options.filter);
  const response = await webApiGet<WebApiCollection<Record<string, unknown>>>(
    `${context.entitySetName}?$select=${selectFor(context, options)}` +
      `&$filter=${encodeURIComponent(filter)}&$orderby=${context.nameAttribute}&$top=${options.top ?? 25}`,
    options,
  );

  const byId = new Map<string, HierarchyRecord>();
  for (const record of toRecords(context, response.value || [])) byId.set(record.id.toLowerCase(), record);

  for (let level = 0; level < MAX_DEPTH; level++) {
    const missing = [...new Set([...byId.values()].map((record) => record.parentId?.toLowerCase()))].filter(
      (id): id is string => Boolean(id) && !byId.has(id as string),
    );
    if (missing.length === 0) break;

    const parents = await Promise.all(
      chunk(missing, ID_CHUNK).map((ids) =>
        webApiGet<WebApiCollection<Record<string, unknown>>>(
          `${context.entitySetName}?$select=${selectFor(context, options)}` +
            `&$filter=${ids.map((id) => `${context.idAttribute} eq ${guid(id)}`).join(' or ')}`,
          options,
        ),
      ),
    );
    const found = parents.flatMap((page) => toRecords(context, page.value || []));
    // A parent the user cannot read leaves the chain there; its child shows at the top
    if (found.length === 0) break;
    for (const record of found) byId.set(record.id.toLowerCase(), record);
  }

  return markChildren(entityLogicalName, context, [...byId.values()], options);
};
