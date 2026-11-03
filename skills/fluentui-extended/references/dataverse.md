# Dataverse Web API helpers

The components share one small Web API client built on `fetch` (not `Xrm.WebApi`), so the same code
runs inside a model-driven form, in a standalone SPA and on a dev server. Everything here is exported
from `'fluentui-extended'`.

## Pointing the client at an org

| Function | Use |
| --- | --- |
| `setWebApiBaseUrl(url)` | Base path for every request. Default `/api/data/v9.2` (relative), which already works inside Dynamics. Set it for a dev proxy or a standalone app. |
| `getWebApiBaseUrl()` | Current base path. |
| `setWebApiFetch(fn)` | Replace the transport: `(input: string, init?: RequestInit) => Promise<Response>`. Use it to add a bearer token, or to route through your own authenticated client. |
| `webApiGet<T>(path, { signal?, headers? })` | GET a path relative to the base (`"accounts?$top=5"`) or an absolute URL (`@odata.nextLink` values). Throws `WebApiError` (`status`, `url`) carrying Dynamics' own error message. |

```ts
import { setWebApiBaseUrl, setWebApiFetch } from 'fluentui-extended';

setWebApiBaseUrl('/api/data/v9.2'); // dev-server proxy path; see layout.md "Local development"

// Standalone with MSAL or similar
setWebApiFetch(async (url, init) => {
  const token = await getToken();
  return fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
});
```

Every component that calls the Web API goes through this client, `QueryBuilder` included, so the
two setters configure all of them.

Pass an `AbortSignal` from an effect so an unmounted component cancels its request; an aborted
request rejects with the `AbortError` itself, not a `WebApiError`.

## Metadata

Cached per table for the life of the page; concurrent callers share one request; failures are not
cached. `clearMetadataCache()` resets it (tests, hot reload).

| Function | Returns |
| --- | --- |
| `getEntityDefinition(table)` | `EntityDefinition`: `EntitySetName`, `PrimaryIdAttribute`, `PrimaryNameAttribute`, `PrimaryImageAttribute`, `ObjectTypeCode`, `DisplayName` |
| `getEntityAttributes(table)` | `AttributeMetadata[]`, enriched with lookup `Targets`, `DateTimeBehavior`, `Format` (these live on derived types and are fetched by cast) |
| `getEntityOptionSets(table)` | Choice attributes with their options — local **and** global option sets |
| `getAttributeOptions(table, attribute)` | One attribute's option metadata |
| `getEntityLookupNavigation(table)` | `Map<attribute, { navigationProperty, targetEntity }>` — the `$expand` name of each lookup, which is not always its attribute name |
| `entityImageUrl(entity, id, 'thumbnail' \| 'full')` | URL of a record image, or `null` when the table has none |

Dataverse facts the helpers encode, and hand-written queries must respect:

- A **lookup value** is read as `_<attribute>_value`; its display name comes from the
  `OData.Community.Display.V1.FormattedValue` annotation (send `Prefer: odata.include-annotations`).
- A **global option set** leaves `OptionSet` empty and fills `GlobalOptionSet`.
- A **multi-select picklist** is stored as `"1,2,3"`; use `parseSelectedValues` / `formatMultiSelectValue`.
- Selecting an **image column** returns the whole picture as base64 inline; address it by URL instead.
- Escape user text in OData string literals by doubling single quotes (`'` → `''`) before putting
  it in a `$filter`; never interpolate raw input. (The package has no exported helper for this.)

## Users and owners

| Function | Notes |
| --- | --- |
| `searchSystemUsers(text, { top = 25, includeDisabled = false, interactiveOnly = true })` | Empty `text` returns the first page — what a picker shows on focus. Excludes disabled and application users by default, as Dynamics does. |
| `getSystemUser(id)` | `SystemUserRecord` incl. business unit name. |
| `systemUserImageUrl(id)` | Photo URL (fetched by the browser, not inlined). |
| `initialsOf(fullName)` | Avatar initials. |
| `searchOwners(text, { types = ['systemuser', 'team'], top = 15 /* per type */, includeDisabled = false })` | Users **and** teams; a failure on one type returns the other. |
| `searchTeams(text, { top })`, `getOwner(id, type)`, `ownerFromUser(user)` | `OwnerRecord` = `{ id, name, type: 'systemuser' \| 'team', ... }`. |

`OwnerLookup` and `SystemUserPersona` already use these; call them directly only for custom UI.

## Record hierarchies

A table may mark one self-referential relationship as **hierarchical** (account → parent account,
business unit, product, position, category, custom tables). Dataverse then answers "under" and
"above" queries for it. Choices (option sets) have no hierarchy in Dataverse.

```tsx
import { Lookup, useHierarchyLookup, type LookupOption } from 'fluentui-extended';

function ParentAccountField() {
  const [value, setValue] = React.useState<LookupOption | null>(null);
  // Reads the parent column from metadata; nothing else about the table is passed
  const hierarchy = useHierarchyLookup('account', { filter: 'statecode eq 0' });
  return <Lookup {...hierarchy} selectedOption={value} onOptionSelect={setValue} showPath />;
}
```

`useHierarchyLookup(table, options)` returns `{ hierarchical, options, loading, onSearchChange,
onLoadChildren, disableClientFilter }` for spreading onto a `Lookup`. It loads the top of the tree,
loads children when a node is opened, and searches server-side, returning each match together with
its ancestors. Options: `filter` (OData, applied to matches and children), `select` (extra columns,
returned on `option.data`), `top`, `parentAttribute` (override the relationship), `toOption(record,
option)` (add secondary text, icons), `onError`.

The functions underneath, for use without the hook:

| Function | Returns |
| --- | --- |
| `getHierarchyRelationship(table)` | `{ schemaName, parentAttribute }` or `null` when the table has none. Cached. |
| `getHierarchyChildren(table, parentId \| null, options)` | Records directly under a parent, or the roots for `null`. Default `top` 250. |
| `searchHierarchy(table, text, options)` | Name matches (default `top` 25) plus every ancestor of each. |

Each returns `HierarchyRecord[]`: `{ id, name, parentId, hasChildren, raw }`. `hasChildren` comes
from one FetchXML aggregate per page of records — OData `$apply` cannot group on a lookup — and
ancestors are fetched one request per level for all matches together, not one per match. A parent
id that is not a GUID is rejected before any request is built.
