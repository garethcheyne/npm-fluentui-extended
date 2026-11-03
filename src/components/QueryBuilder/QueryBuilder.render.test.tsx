import * as React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { getWebApiBaseUrl, setWebApiBaseUrl, setWebApiFetch } from '../../api/webApi';
import { QueryBuilder } from './QueryBuilder';
import type { QueryBuilderApplyResult, QueryBuilderField, QueryBuilderProps, QueryBuilderState } from './QueryBuilder.types';

/**
 * QueryBuilder's first render tests.
 *
 * The serializer and parser already have their own tests; what these pin is the
 * component wrapped around them - that picking a field, an operator and a value
 * in the rows really changes the query the caller is handed, that a FetchXML
 * query passed in comes back as rows, and that groups combine the way their
 * AND/OR says. With `fields` supplied the builder must not touch the network at
 * all; without them it reads metadata through the shared Web API client, and
 * one test holds it to `setWebApiBaseUrl` so it cannot drift back onto a
 * hard-coded `fetch('/api/data/...')` that only works inside Dynamics.
 */

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 200 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: 32, width: 300, height: 32, toJSON: () => '' };
  } as never;
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const FIELDS: QueryBuilderField[] = [
  { id: 'name', label: 'Account Name', dataType: 'string' },
  { id: 'revenue', label: 'Annual Revenue', dataType: 'number', attributeType: 'money' },
  {
    id: 'statuscode',
    label: 'Status Reason',
    dataType: 'optionset',
    options: [
      { label: 'Active', value: 1 },
      { label: 'Inactive', value: 2 },
    ],
  },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let requests: string[] = [];
const DEFAULT_BASE_URL = getWebApiBaseUrl();

beforeEach(() => {
  requests = [];
  setWebApiFetch(async (input) => {
    requests.push(decodeURIComponent(input));
    return json({ error: { message: `Unexpected request ${input}` } }, 404);
  });
});

afterEach(() => {
  setWebApiBaseUrl(DEFAULT_BASE_URL);
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

function renderBuilder(props: Partial<QueryBuilderProps> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <QueryBuilder entityName="account" entitySetName="accounts" fields={FIELDS} {...props} />
    </FluentProvider>,
  );
}

/** The latest state the builder reported. */
const lastState = (onStateChange: ReturnType<typeof vi.fn>) =>
  onStateChange.mock.calls[onStateChange.mock.calls.length - 1][0] as QueryBuilderState;

/** The latest serialized query the builder reported (it debounces by 150ms). */
const lastSerialized = (onSerializedChange: ReturnType<typeof vi.fn>) =>
  onSerializedChange.mock.calls[onSerializedChange.mock.calls.length - 1][0] as QueryBuilderApplyResult;

/** Open a condition row's field Lookup and choose a field from it. */
const chooseField = (row: HTMLElement, current: string, next: string) => {
  fireEvent.click(within(row).getByText(current));
  fireEvent.click(screen.getByRole('option', { name: new RegExp(next) }));
};

/** Open a Fluent Dropdown or Combobox and choose an option from it. */
const choose = (control: HTMLElement, option: string) => {
  fireEvent.click(control);
  fireEvent.click(screen.getByRole('option', { name: option }));
};

const conditionRows = (group: HTMLElement = document.body) =>
  within(group).getAllByRole('row').filter((row) => row.getAttribute('aria-hidden') !== 'true');

describe('QueryBuilder with fields supplied', () => {
  it('renders a first condition on the first field without going to the network', () => {
    renderBuilder({ entityDisplayName: 'Accounts' });

    expect(screen.getByText('Query Builder: Accounts')).toBeInTheDocument();
    const [row] = conditionRows();
    expect(within(row).getByText('Account Name')).toBeInTheDocument();
    expect(within(row).getByRole('combobox', { name: 'Operator' })).toHaveTextContent('Contains');
    expect(requests).toEqual([]);
  });

  it('updates the reported state as a field, operator and value are chosen', async () => {
    const onStateChange = vi.fn();
    renderBuilder({ onStateChange });
    const [row] = conditionRows();

    chooseField(row, 'Account Name', 'Annual Revenue');
    choose(within(row).getByRole('combobox', { name: 'Operator' }), 'Greater Than');
    fireEvent.change(within(row).getByLabelText('Value'), { target: { value: '50000' } });

    await waitFor(() =>
      expect(lastState(onStateChange).groups[0].conditions[0]).toMatchObject({
        fieldId: 'revenue',
        operator: 'gt',
        value: '50000',
      }),
    );
  });

  it('reports FetchXML and an OData filter for a simple condition', async () => {
    const onSerializedChange = vi.fn();
    renderBuilder({ onSerializedChange });

    fireEvent.change(screen.getByLabelText('Value'), { target: { value: "O'Brien" } });

    await waitFor(() => expect(lastSerialized(onSerializedChange).odataFilter).toBe("contains(name, 'O''Brien')"));
    const result = lastSerialized(onSerializedChange);
    expect(result.fetchXml).toContain('<entity name="account">');
    expect(result.fetchXml).toContain('<condition attribute="name" operator="like" value="%O&apos;Brien%" />');
    expect(result.odataQuery).toBe("accounts?$filter=contains(name, 'O''Brien')");
    expect(result.odataUnsupported).toEqual([]);
  });

  it('shows the conditions of a FetchXML query it is given', () => {
    renderBuilder({
      initialFetchXml:
        '<fetch><entity name="account"><filter type="and">' +
        '<condition attribute="revenue" operator="gt" value="1000" />' +
        '<condition attribute="statuscode" operator="eq" value="2" />' +
        '</filter></entity></fetch>',
    });

    const [revenue, status] = conditionRows();
    expect(within(revenue).getByText('Annual Revenue')).toBeInTheDocument();
    expect(within(revenue).getByRole('combobox', { name: 'Operator' })).toHaveTextContent('Greater Than');
    expect(within(revenue).getByLabelText('Value')).toHaveValue(1000);
    expect(within(status).getByText('Status Reason')).toBeInTheDocument();
    expect(within(status).getByRole('combobox', { name: 'Value' })).toHaveTextContent('Inactive');
  });

  it('adds a second group and combines its conditions with OR when asked', async () => {
    const onSerializedChange = vi.fn();
    renderBuilder({ onSerializedChange });

    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'Ltd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Add group/ }));
    const second = screen.getByRole('grid', { name: 'Filter group 2' });
    fireEvent.click(within(second).getByRole('button', { name: 'Add condition' }));
    const [first, next] = conditionRows(second);
    fireEvent.change(within(first).getByLabelText('Value'), { target: { value: 'Contoso' } });
    fireEvent.change(within(next).getByLabelText('Value'), { target: { value: 'Fabrikam' } });
    choose(within(second).getByRole('combobox', { name: 'Group logic' }), 'OR');

    // Each group combines its own rows; the groups themselves are ANDed together
    await waitFor(() =>
      expect(lastSerialized(onSerializedChange).odataFilter).toBe(
        "contains(name, 'Ltd') and (contains(name, 'Contoso') or contains(name, 'Fabrikam'))",
      ),
    );
    const { fetchXml } = lastSerialized(onSerializedChange);
    expect(fetchXml).toContain('<filter type="and"><filter type="and"><condition attribute="name" operator="like" value="%Ltd%" /></filter><filter type="or">');
  });

  it('removes a group, and offers no way to add one when allowGroups is off', async () => {
    const { unmount } = renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Add group/ }));
    expect(screen.getAllByRole('grid', { name: /Filter group/ })).toHaveLength(2);

    fireEvent.click(within(screen.getByRole('grid', { name: 'Filter group 2' })).getByRole('button', { name: 'Remove group' }));
    expect(screen.getAllByRole('grid', { name: /Filter group/ })).toHaveLength(1);
    unmount();

    renderBuilder({ allowGroups: false });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: /Add group/ })).not.toBeInTheDocument());
  });

  // Regression: every edit used to rebuild the state as `{ groups }`, dropping the
  // imported query options, so a FetchXML query lost its top and no-lock on the first edit.
  it('keeps an imported query’s top and no-lock when a condition is added', async () => {
    const onSerializedChange = vi.fn();
    renderBuilder({
      onSerializedChange,
      initialFetchXml:
        '<fetch top="10" no-lock="true"><entity name="account"><filter type="and">' +
        '<condition attribute="revenue" operator="gt" value="1000" /></filter></entity></fetch>',
    });
    await waitFor(() => expect(lastSerialized(onSerializedChange).fetchXml).toContain('top="10"'));

    fireEvent.click(screen.getByRole('button', { name: 'Add condition' }));

    await waitFor(() => expect(conditionRows()).toHaveLength(2));
    await waitFor(() => expect(lastSerialized(onSerializedChange).state.groups[0].conditions).toHaveLength(2));
    expect(lastSerialized(onSerializedChange).fetchXml).toContain('top="10"');
    expect(lastSerialized(onSerializedChange).fetchXml).toContain('no-lock="true"');
  });
});

describe('QueryBuilder loading its own fields', () => {
  const ATTRIBUTES = [
    { LogicalName: 'name', SchemaName: 'Name', DisplayName: { UserLocalizedLabel: { Label: 'Account Name' } }, AttributeType: 'String', IsValidForAdvancedFind: { Value: true } },
    { LogicalName: 'revenue', SchemaName: 'Revenue', DisplayName: { UserLocalizedLabel: { Label: 'Annual Revenue' } }, AttributeType: 'Money', IsValidForAdvancedFind: { Value: true } },
    { LogicalName: 'versionnumber', SchemaName: 'VersionNumber', DisplayName: { UserLocalizedLabel: { Label: 'Version Number' } }, AttributeType: 'BigInt', IsValidForAdvancedFind: { Value: false } },
  ];

  const serveMetadata = (url: string): Response => {
    if (url.includes("EntityDefinitions(LogicalName='account')/Attributes/")) return json({ value: [] });
    if (url.includes("EntityDefinitions(LogicalName='account')/Attributes")) return json({ value: ATTRIBUTES });
    if (url.includes("EntityDefinitions(LogicalName='account')")) {
      return json({ LogicalName: 'account', EntitySetName: 'accounts', PrimaryNameAttribute: 'name', PrimaryIdAttribute: 'accountid' });
    }
    return json({ error: { message: `Unexpected request ${url}` } }, 404);
  };

  beforeEach(() => {
    setWebApiFetch(async (input) => {
      requests.push(decodeURIComponent(input));
      return serveMetadata(decodeURIComponent(input));
    });
  });

  it('reads the entity’s metadata through the shared client, honouring setWebApiBaseUrl', async () => {
    setWebApiBaseUrl('/custom/api');
    const onSerializedChange = vi.fn();
    render(
      <FluentProvider theme={webLightTheme}>
        <QueryBuilder entityName="account" onSerializedChange={onSerializedChange} />
      </FluentProvider>,
    );

    // Sorted by label, so the first condition lands on Account Name
    const [row] = await waitFor(() => {
      const rows = conditionRows();
      expect(within(rows[0]).getByText('Account Name')).toBeInTheDocument();
      return rows;
    });
    expect(row).toBeInTheDocument();

    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((url) => url.startsWith('/custom/api/'))).toBe(true);
    expect(requests).toContain(
      "/custom/api/EntityDefinitions(LogicalName='account')?$select=EntitySetName,DisplayName,PrimaryNameAttribute,PrimaryIdAttribute",
    );
    expect(requests.some((url) => url.startsWith("/custom/api/EntityDefinitions(LogicalName='account')/Attributes?"))).toBe(true);
    // The entity set name came from metadata, so the OData query can be built from it
    await waitFor(() => expect(lastSerialized(onSerializedChange).odataQuery).toMatch(/^accounts(\?|$)/));
  });

  // Regression: the Web API returns IsValidForAdvancedFind as `{ Value: false }`, and a
  // comparison with bare `false` never matched, so hidden attributes were offered.
  it('leaves out attributes that are not valid for Advanced Find', async () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <QueryBuilder entityName="account" />
      </FluentProvider>,
    );
    const [row] = await waitFor(() => {
      const rows = conditionRows();
      expect(within(rows[0]).getByText('Account Name')).toBeInTheDocument();
      return rows;
    });

    fireEvent.click(within(row).getByText('Account Name'));

    expect(screen.getByRole('option', { name: /Annual Revenue/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Version Number/ })).not.toBeInTheDocument();
  });
});
