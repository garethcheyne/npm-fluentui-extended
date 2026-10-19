/**
 * Live Dynamics 365 rows for the DataGrid example.
 *
 * The record to load comes from `VITE_DYNAMICS_DATAGRID_01` / `_02`, each holding
 * a D365 query string (`etn=opportunity&id=<guid>`). That is the same shape the
 * platform puts in a web resource's own URL, so a target copied straight out of
 * a browser address bar works here without editing.
 */

import { webApiGet } from '../../../src/api/webApi';
import type { WebApiCollection } from '../../../src/api/webApi';
import { getEntityDefinition } from '../../../src/api/metadata';
import { INCLUDE_ANNOTATIONS } from '../../../src/components/DataGrid';

export interface DataverseTarget {
  /** Env var it came from, e.g. `VITE_DYNAMICS_DATAGRID_01`. */
  name: string;
  /** Parent entity logical name, e.g. `opportunity`. */
  entity: string;
  /** Parent record id. */
  id: string;
}

/** The child table shown for a given parent. */
const CHILD_OF: Record<string, { entity: string; set: string; parentField: string }> = {
  opportunity: {
    entity: 'opportunityproduct',
    set: 'opportunityproducts',
    parentField: 'opportunityid',
  },
  quote: { entity: 'quotedetail', set: 'quotedetails', parentField: 'quoteid' },
  salesorder: { entity: 'salesorderdetail', set: 'salesorderdetails', parentField: 'salesorderid' },
  invoice: { entity: 'invoicedetail', set: 'invoicedetails', parentField: 'invoiceid' },
  // The custom price list item, not the out-of-box `productpricelevel` — the
  // PriceList app grids this table, and its parent lookup is `hnc_pricelevelid`.
  pricelevel: {
    entity: 'hnc_productpricelevel',
    set: 'hnc_productpricelevels',
    parentField: 'hnc_pricelevelid',
  },
};

/** Reads every `VITE_DYNAMICS_DATAGRID_*` var into a target. */
export function readTargets(): DataverseTarget[] {
  const env = import.meta.env as Record<string, string | undefined>;
  return Object.keys(env)
    .filter((key) => key.startsWith('VITE_DYNAMICS_DATAGRID_'))
    .sort()
    .map((name) => {
      const params = new URLSearchParams(env[name] ?? '');
      const entity = params.get('etn') ?? '';
      const id = (params.get('id') ?? '').replace(/[{}]/g, '');
      return { name, entity, id };
    })
    .filter((target) => target.entity !== '' && target.id !== '');
}

/** The child table to grid for a parent entity, if there is a known one. */
export function childTableFor(parentEntity: string) {
  return CHILD_OF[parentEntity] ?? null;
}

/**
 * Fetches the child rows for a target.
 *
 * `$select` is driven by the columns metadata produced, so the request asks for
 * exactly what the grid will render — no `$select` at all returns every column
 * on the table, which on `opportunityproduct` is well over a hundred.
 */
export async function fetchChildRows(
  target: DataverseTarget,
  select: string[],
  expand: string[] = [],
  top = 500,
): Promise<Record<string, unknown>[]> {
  const child = childTableFor(target.entity);
  if (!child) return [];

  // Lookups stay in their `_field_value` form. That is the term Dataverse wants
  // in `$select` — asking for the bare logical name is rejected outright, and
  // one bad term fails the whole query.
  const selectTerms = [...new Set(select)];

  const query =
    `${child.set}?$select=${selectTerms.join(',')}` +
    (expand.length > 0 ? `&$expand=${expand.join(',')}` : '') +
    `&$filter=_${child.parentField}_value eq ${target.id}` +
    `&$top=${top}`;

  const response = await webApiGet<WebApiCollection<Record<string, unknown>>>(query, {
    // Belt and braces alongside the `$expand` above: with annotations the grid
    // reads a lookup's name and a choice's label straight off the record, and
    // without either it has only raw ids and integers to show.
    headers: { Prefer: INCLUDE_ANNOTATIONS },
  });
  return response.value ?? [];
}

/**
 * The parent record's own display name, for the grid's heading.
 *
 * Set name and primary-name attribute both come from metadata rather than from
 * guesswork: `opportunity` pluralises to `opportunities`, not `opportunitys`,
 * and the column holding a record's name is `name` on some tables and
 * `fullname` or `title` on others.
 */
export async function fetchParentName(target: DataverseTarget): Promise<string> {
  try {
    const definition = await getEntityDefinition(target.entity);
    const nameAttribute = definition.PrimaryNameAttribute;
    const record = await webApiGet<Record<string, unknown>>(
      `${definition.EntitySetName}(${target.id})?$select=${nameAttribute}`,
    );
    return String(record[nameAttribute] ?? target.id);
  } catch {
    return target.id;
  }
}
