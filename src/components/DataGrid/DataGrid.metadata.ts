import * as React from 'react';
import {
  getEntityAttributes,
  getEntityDefinition,
  getEntityLookupNavigation,
  getEntityOptionSets,
} from '../../api/metadata';
import type { LookupNavigation } from '../../api/metadata';
import { labelOf } from '../../api/metadata.types';
import type { AttributeMetadata, EntityDefinition } from '../../api/metadata.types';
import { toImageSrc } from './DataGrid.utils';
import type {
  DataGridChoice,
  DataGridColumn,
  DataGridDataType,
  DataGridLookupValue,
  DataGridRow,
} from './DataGrid.types';

/**
 * Dynamics 365 metadata to grid columns.
 *
 * This is what separates the grid from a generic table: point it at an entity
 * and it reads the schema the way a model-driven form does — labels, types,
 * option sets and their colours, decimal places, character caps, and which
 * columns Dataverse will actually accept a write to.
 *
 * Nothing here is required. A column config with no `entityName` behind it is
 * left exactly as written, so the same grid serves a REST API that has never
 * heard of Dataverse.
 */

/** Suffix Dynamics puts on the display-ready form of a value. */
export const FORMATTED_VALUE = '@OData.Community.Display.V1.FormattedValue';
/** Suffix carrying the target entity of a lookup, so a link knows where to go. */
export const LOOKUP_LOGICAL_NAME = '@Microsoft.Dynamics.CRM.lookuplogicalname';

/**
 * The header a query must carry for the annotations above to be returned.
 *
 * Without it Dataverse sends the raw id for a lookup and the raw integer for a
 * choice, so a metadata-driven grid renders GUIDs where names belong. It is a
 * request header rather than something the grid can add for you, because the
 * grid does not issue the query.
 *
 * ```ts
 * webApiGet(query, { headers: { Prefer: INCLUDE_ANNOTATIONS } })
 * ```
 */
export const INCLUDE_ANNOTATIONS = 'odata.include-annotations="*"';

/**
 * The audit and ownership columns every Dataverse table carries.
 *
 * This list is not used to decide what is editable — `IsValidForUpdate` already
 * answers that, per org, and second-guessing it would override a table that has
 * been deliberately configured otherwise. It is here so the person-shaped ones
 * can be given a hover card, which is additive rather than restrictive.
 */
export const SYSTEM_ATTRIBUTES: ReadonlySet<string> = new Set([
  'createdby',
  'createdon',
  'createdonbehalfby',
  'modifiedby',
  'modifiedon',
  'modifiedonbehalfby',
  'ownerid',
  'owningbusinessunit',
  'owningteam',
  'owninguser',
  'overriddencreatedon',
  'importsequencenumber',
  'timezoneruleversionnumber',
  'utcconversiontimezonecode',
  'versionnumber',
]);

/** The system columns that point at a person or team. */
const SYSTEM_PERSON_ATTRIBUTES: ReadonlySet<string> = new Set([
  'createdby',
  'createdonbehalfby',
  'modifiedby',
  'modifiedonbehalfby',
  'ownerid',
  'owninguser',
  'owningteam',
  'owningbusinessunit',
]);

/** Columns nobody wants in a grid by default, however readable they are. */
const NOISE_ATTRIBUTES: ReadonlySet<string> = new Set([
  'importsequencenumber',
  'timezoneruleversionnumber',
  'utcconversiontimezonecode',
  'versionnumber',
  'overriddencreatedon',
  'createdonbehalfby',
  'modifiedonbehalfby',
]);

/** Whether an attribute is one the platform owns rather than the table's own. */
export function isSystemAttribute(logicalName: string): boolean {
  return SYSTEM_ATTRIBUTES.has(logicalName.toLowerCase());
}

/** Columns a hover card over a person or team is worth fetching. */
const PERSON_HOVER_COLUMNS = ['fullname', 'jobtitle', 'internalemailaddress', 'address1_telephone1'];

/**
 * What metadata knows about displaying one lookup.
 *
 * `nameAttribute` is the target entity's own primary-name column, which is how
 * Dataverse decides what a reference is called — it is `name` on some tables,
 * `fullname` or `title` on others, and never guessable.
 */
export interface LookupDisplay {
  targetEntity: string;
  /** `$expand` term, which is not the attribute name. */
  navigationProperty?: string;
  /** Attribute on the target entity holding its display name. */
  nameAttribute?: string;
}

/**
 * Attribute type to grid data type.
 *
 * `AttributeType` is read in preference to `AttributeTypeName` because the
 * latter is suffixed (`PicklistType` against `Picklist`) and comparing the two
 * directly is a well-worn trap. The suffixed name is only consulted for the
 * virtual attributes, where the coarse type says nothing useful.
 */
export function attributeToDataType(attribute: AttributeMetadata): DataGridDataType {
  switch (attribute.AttributeType) {
    case 'Memo':
      return 'multiline';
    case 'Integer':
    case 'BigInt':
      return 'integer';
    case 'Decimal':
    case 'Double':
      return 'decimal';
    case 'Money':
      return 'money';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
      // A DateOnly attribute rendered with a time reads as a bug, and the time
      // it shows is meaningless — the value has no time component to begin with.
      return attribute.DateTimeBehavior?.Value === 'DateOnly' || attribute.Format === 'DateOnly'
        ? 'date'
        : 'datetime';
    case 'Picklist':
    case 'State':
    case 'Status':
    case 'MultiSelectPicklist':
      return 'choice';
    case 'Lookup':
    case 'Customer':
    case 'Owner':
      return 'lookup';
    case 'Image':
      return 'image';
    case 'Virtual':
      return attribute.AttributeTypeName?.Value === 'MultiSelectPicklistType' ? 'choice' : 'string';
    default:
      return 'string';
  }
}

/** Options for a picklist-like attribute, from either a local or a global set. */
export function attributeChoices(attribute: AttributeMetadata | undefined): DataGridChoice[] {
  if (!attribute) return [];
  // A global option set leaves `OptionSet` empty and puts the values on
  // `GlobalOptionSet` instead. Reading only the first is the usual cause of a
  // choice column rendering raw integers.
  const options = attribute.OptionSet?.Options ?? attribute.GlobalOptionSet?.Options ?? [];
  return options.map((option) => ({
    value: option.Value,
    label: labelOf(option.Label, String(option.Value)),
    color: option.Color ?? undefined,
  }));
}

/**
 * A sensible starting width for a column, given what it holds.
 *
 * Widths are the one thing metadata cannot supply and the one thing a user
 * notices immediately, so these are chosen to make a first render usable rather
 * than to be right — the user drags from here, and the layout is remembered.
 */
function defaultWidth(dataType: DataGridDataType, attribute: AttributeMetadata): number {
  switch (dataType) {
    case 'boolean':
      return 60;
    case 'image':
      return 56;
    case 'integer':
      return 90;
    case 'decimal':
    case 'money':
    case 'percent':
      return 110;
    case 'date':
      return 110;
    case 'datetime':
      return 150;
    case 'choice':
      return 140;
    case 'lookup':
      return 200;
    case 'multiline':
      return 240;
    default:
      return Math.min(320, Math.max(120, (attribute.MaxLength ?? 100) * 1.6));
  }
}

/**
 * The property a value actually arrives on.
 *
 * Lookups are the exception in a Web API payload: `primarycontactid` is returned
 * as `_primarycontactid_value`, and asking for the bare name gets nothing back.
 */
export function attributeValueKey(attribute: AttributeMetadata): string {
  return attributeToDataType(attribute) === 'lookup'
    ? `_${attribute.LogicalName}_value`
    : attribute.LogicalName;
}

/**
 * A fully configured column derived from one attribute.
 *
 * Everything is a default: merge an explicit column over the top and the
 * explicit value wins, so metadata fills the gaps rather than dictating.
 */
export function columnFromAttribute<T extends DataGridRow>(
  attribute: AttributeMetadata,
  choices: DataGridChoice[] = [],
  lookup?: LookupDisplay,
): DataGridColumn<T> {
  const dataType = attributeToDataType(attribute);
  const key = attributeValueKey(attribute);
  const label = labelOf(attribute.DisplayName, attribute.LogicalName);

  const column: DataGridColumn<T> = {
    key,
    label,
    description: labelOf(attribute.Description, label),
    dataType,
    width: defaultWidth(dataType, attribute),
    // Metadata alone decides this. Calculated, rollup and platform-owned columns
    // already report false, and an org that has deliberately made one writable
    // should not be second-guessed by a list checked into a library.
    editable: attribute.IsValidForUpdate?.Value === true,
    maxLength: attribute.MaxLength,
    precision: attribute.Precision,
    groupable: dataType === 'choice' || dataType === 'boolean' || dataType === 'lookup',
  };

  if (dataType === 'choice') {
    column.choices = choices;
    // Dynamics renders a choice as a pill wherever its option set has colours,
    // and a grid that renders them as plain text reads as a different product.
    column.choiceAsBadge = true;
  }

  if (dataType === 'money' || dataType === 'decimal') {
    column.prefix = attribute.AttributeType === 'Money' ? '$' : undefined;
    column.negativeIsRed = true;
  }

  if (dataType === 'image') {
    // Nothing to sort, filter or group on, and a base64 blob is not something a
    // user should be able to type into.
    column.sortable = false;
    column.filterable = false;
    column.groupable = false;
    column.editable = false;

    /**
     * Where the picture comes from, in order of what costs least.
     *
     * Dataverse publishes `<image>_url` beside the column: a relative path to
     * the stored image that can be selected for pennies. The column itself
     * returns the whole picture as base64 inline, so a page of fifty rows
     * becomes megabytes of JSON — worth reading if it happens to be there, but
     * never worth asking for.
     */
    column.getImageSrc = (ctx) => {
      const row = ctx.row as Record<string, unknown>;
      const url = row[`${key}_url`];
      if (typeof url === 'string' && url !== '') {
        // Relative to the org, not to the API root.
        return url.startsWith('/') ? url : `/${url}`;
      }
      return toImageSrc(ctx.value);
    };
  }

  if (dataType === 'lookup') {
    column.lookupEntity = attribute.Targets?.[0];
    // "Who last touched this" is the question these columns exist to answer, and
    // Dynamics answers it with a persona — coin then name — plus a card. A bare
    // pill in the same place reads as a different product.
    if (SYSTEM_PERSON_ATTRIBUTES.has(attribute.LogicalName)) {
      column.persona = true;
      column.hoverCard = true;
      column.hoverCardColumns = PERSON_HOVER_COLUMNS;
    }
    // The id is on `_field_value`. Its display name can arrive two ways, and
    // both are tried because a caller may have asked for either:
    //
    //   1. As a formatted-value annotation beside the id, which needs the
    //      `Prefer: odata.include-annotations` header on the query.
    //   2. On the expanded navigation property, where metadata has told us which
    //      attribute on the target entity holds its name.
    //
    // Falling through to the id keeps the cell clickable when neither was
    // requested, rather than rendering an empty reference.
    column.getLookupValue = (ctx): DataGridLookupValue | null => {
      const id = ctx.value == null ? '' : String(ctx.value);
      if (!id) return null;
      const row = ctx.row as Record<string, unknown>;

      const annotated = row[`${key}${FORMATTED_VALUE}`];
      const expanded =
        lookup?.navigationProperty && lookup.nameAttribute
          ? (row[lookup.navigationProperty] as Record<string, unknown> | undefined)?.[
              lookup.nameAttribute
            ]
          : undefined;

      return {
        id,
        text: String(annotated ?? expanded ?? id),
        entity: String(
          row[`${key}${LOOKUP_LOGICAL_NAME}`] ?? lookup?.targetEntity ?? attribute.Targets?.[0] ?? '',
        ),
      };
    };
  }

  return column;
}

/** Everything {@link useEntityColumns} needs to build a column set. */
export interface UseEntityColumnsOptions<T extends DataGridRow = DataGridRow> {
  /** Entity logical name, e.g. `"opportunityproduct"`. */
  entityName: string;
  /**
   * Columns to show, in order. Each needs only a `key`; anything else set on it
   * overrides what metadata says. Omit entirely to show every readable
   * attribute, which is rarely what a real grid wants.
   */
  columns?: Array<Partial<DataGridColumn<T>> & { key: string }>;
  /**
   * Load option-set values and colours. Costs one extra round trip per entity
   * and is worth it for any grid with a choice column. Defaults to true.
   */
  loadChoices?: boolean;
  /** Skip loading, e.g. until a parent record id is known. */
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export interface UseEntityColumnsResult<T extends DataGridRow = DataGridRow> {
  columns: DataGridColumn<T>[];
  /** Entity definition, for the primary id and set name a caller needs to query. */
  entity: EntityDefinition | null;
  attributes: Map<string, AttributeMetadata>;
  loading: boolean;
  error: Error | null;
  /** `$select` covering the requested columns, lookups included. */
  select: string[];
  /**
   * `$expand` terms that fetch each lookup's display name from its target.
   *
   * An alternative to asking for annotations: expand these and the grid reads
   * names from the expanded records instead.
   */
  expand: string[];
  /**
   * The entity's image column, where it has one enabled.
   *
   * Most tables do not, and `PrimaryImageAttribute` being absent is how you tell
   * — so this doubles as the check for whether an image column is worth
   * offering at all.
   */
  primaryImageAttribute: string | null;
}

/**
 * Builds grid columns from an entity's metadata.
 *
 * Give it an entity and a list of logical names and it returns columns already
 * labelled, typed, and — for choices — carrying their option sets and colours.
 * Anything set explicitly on a requested column is preserved, so a grid can lean
 * on metadata for the twenty columns that need nothing special and hand-write
 * the two that do.
 *
 * Until metadata arrives the requested columns are returned as-is rather than as
 * an empty array, so the grid renders its headers immediately instead of
 * flashing empty and then filling in.
 */
export function useEntityColumns<T extends DataGridRow = DataGridRow>(
  options: UseEntityColumnsOptions<T>,
): UseEntityColumnsResult<T> {
  const { entityName, columns: requested, loadChoices = true, enabled = true, onError } = options;

  const [entity, setEntity] = React.useState<EntityDefinition | null>(null);
  const [attributes, setAttributes] = React.useState<Map<string, AttributeMetadata>>(
    () => new Map(),
  );
  const [choices, setChoices] = React.useState<Map<string, DataGridChoice[]>>(() => new Map());
  const [lookups, setLookups] = React.useState<Map<string, LookupDisplay>>(() => new Map());
  const [loading, setLoading] = React.useState(enabled);
  const [error, setError] = React.useState<Error | null>(null);

  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;

  React.useEffect(() => {
    if (!enabled || !entityName) {
      setLoading(false);
      return;
    }

    // Guards against a slower earlier request overwriting a newer one when the
    // entity changes mid-flight.
    let live = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [definition, attributeList, optionSets] = await Promise.all([
          getEntityDefinition(entityName),
          getEntityAttributes(entityName),
          loadChoices ? getEntityOptionSets(entityName) : Promise.resolve([]),
        ]);
        if (!live) return;

        setEntity(definition);
        setAttributes(new Map(attributeList.map((a) => [a.LogicalName, a])));
        setChoices(new Map(optionSets.map((a) => [a.LogicalName, attributeChoices(a)])));

        /**
         * How each lookup is displayed and expanded.
         *
         * Best-effort and deliberately after the state above: a lookup still
         * renders from its formatted-value annotation without any of this, so a
         * failure here should cost the expand hint rather than the whole grid.
         */
        const navigation = await getEntityLookupNavigation(entityName).catch(
          () => new Map<string, LookupNavigation>(),
        );
        if (!live) return;

        const lookupAttributes = attributeList.filter(
          (a) => attributeToDataType(a) === 'lookup' && a.Targets?.length,
        );

        // One definition per distinct target, not per column - `createdby` and
        // `modifiedby` both point at systemuser, and the cache collapses them.
        const targets = [...new Set(lookupAttributes.map((a) => a.Targets![0]))];
        const definitions = await Promise.all(
          targets.map((t) => getEntityDefinition(t).catch(() => null)),
        );
        if (!live) return;

        const nameByEntity = new Map<string, string>();
        definitions.forEach((d, i) => {
          if (d) nameByEntity.set(targets[i], d.PrimaryNameAttribute);
        });

        setLookups(
          new Map(
            lookupAttributes.map((a) => [
              a.LogicalName,
              {
                targetEntity: a.Targets![0],
                navigationProperty: navigation.get(a.LogicalName)?.navigationProperty,
                nameAttribute: nameByEntity.get(a.Targets![0]),
              },
            ]),
          ),
        );
      } catch (err) {
        if (!live) return;
        const failure = err instanceof Error ? err : new Error(String(err));
        setError(failure);
        onErrorRef.current?.(failure);
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [entityName, loadChoices, enabled]);

  const columns = React.useMemo<DataGridColumn<T>[]>(() => {
    // No explicit list: show everything readable, minus the plumbing columns
    // nobody wants in a grid by default.
    const list =
      requested ??
      [...attributes.values()]
        .filter((a) => a.IsValidForRead?.Value !== false && !NOISE_ATTRIBUTES.has(a.LogicalName))
        .map((a) => ({ key: attributeValueKey(a) }));

    // Before metadata lands there is nothing to check a key against, so the
    // requested columns pass through and the grid draws its headers straight
    // away rather than flashing empty.
    const loaded = attributes.size > 0;

    const built: DataGridColumn<T>[] = [];
    for (const override of list) {
      const attribute = findAttribute(attributes, override.key);

      if (!attribute) {
        // A key the table does not have would otherwise reach `$select` and fail
        // the whole request — Dataverse rejects the entire query over one bad
        // property, taking every good column with it. Dropping it here costs one
        // column instead of the grid.
        if (loaded) {
          warnUnknownColumn(entityName, override.key);
          continue;
        }
        built.push({ ...override } as DataGridColumn<T>);
        continue;
      }

      const base = columnFromAttribute<T>(
        attribute,
        choices.get(attribute.LogicalName) ?? [],
        lookups.get(attribute.LogicalName),
      );
      // Explicit wins, but only where it was actually set — spreading an
      // override with `dataType: undefined` on it would erase the derived type.
      built.push({ ...base, ...definedOnly(override), key: base.key });
    }
    return built;
  }, [requested, attributes, choices, lookups, entityName]);

  const select = React.useMemo(() => {
    const terms = new Set<string>();
    for (const column of columns) {
      if (column.dataType === 'image') {
        // The `_url` companion is a short string; the column itself is the whole
        // picture as base64, and selecting one of those per row is what turns a
        // page into megabytes.
        terms.add(`${column.key}_url`);
        continue;
      }
      terms.add(column.key);
    }
    return [...terms];
  }, [columns]);

  /**
   * `$expand` covering the lookups on show, so their names arrive without
   * relying on annotations.
   *
   * Either route works — this or `Prefer: odata.include-annotations` — and the
   * grid reads whichever is present. Expanding costs a join per lookup but
   * returns exactly the one column each, where the annotation header returns
   * every annotation on every field.
   */
  const expand = React.useMemo(() => {
    const terms: string[] = [];
    for (const column of columns) {
      const attribute = findAttribute(attributes, column.key);
      const lookup = attribute ? lookups.get(attribute.LogicalName) : undefined;
      if (lookup?.navigationProperty && lookup.nameAttribute) {
        terms.push(`${lookup.navigationProperty}($select=${lookup.nameAttribute})`);
      }
    }
    return [...new Set(terms)];
  }, [columns, attributes, lookups]);

  return {
    columns,
    entity,
    attributes,
    loading,
    error,
    select,
    expand,
    primaryImageAttribute: entity?.PrimaryImageAttribute ?? null,
  };
}

/**
 * Resolves a column key back to its attribute, accepting either the logical name
 * or the `_field_value` form a lookup arrives as.
 */
function findAttribute(
  attributes: Map<string, AttributeMetadata>,
  key: string,
): AttributeMetadata | undefined {
  const direct = attributes.get(key);
  if (direct) return direct;
  const match = /^_(.+)_value$/.exec(key);
  return match ? attributes.get(match[1]) : undefined;
}

/** Drops keys explicitly set to `undefined`, which would otherwise erase a default. */
function definedOnly<V extends object>(value: V): Partial<V> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = v;
  return out as Partial<V>;
}

const warned = new Set<string>();

/**
 * Reports a column the table does not have.
 *
 * A dropped column is silent to the user and looks like the grid forgot it, so
 * it has to be loud in the console — and reported once per entity/key rather
 * than on every render, or it buries everything else.
 */
function warnUnknownColumn(entityName: string, key: string): void {
  const id = `${entityName}:${key}`;
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(
    `[DataGrid] "${entityName}" has no attribute "${key}", so that column has been dropped.\n` +
      'Left in, it would reach $select and Dataverse would reject the whole request — ' +
      'one bad property fails the query and takes every other column with it.\n' +
      'Check the logical name, and remember lookups are requested as `_name_value`.',
  );
}

/**
 * Reads a Dynamics record the way the grid wants it.
 *
 * Pass as `getCellValue` to have every cell prefer the raw value while letting
 * formatters see the annotation beside it. Lookups resolve through
 * `_field_value` without the caller having to know that is where the id lives.
 */
export function dataverseCellValue(row: DataGridRow, columnKey: string): unknown {
  if (columnKey in row) return row[columnKey];
  const lookupKey = `_${columnKey}_value`;
  return lookupKey in row ? row[lookupKey] : undefined;
}

/** The display-ready form Dynamics annotated onto a value, when there is one. */
export function dataverseFormattedValue(row: DataGridRow, columnKey: string): string | undefined {
  const annotation = row[`${columnKey}${FORMATTED_VALUE}`];
  return annotation == null ? undefined : String(annotation);
}
