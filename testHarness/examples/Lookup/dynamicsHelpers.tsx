/**
 * Dynamics 365 API search helpers for Lookup components.
 *
 * These functions wrap the native `fetch()` API to query Dynamics 365
 * entities and transform the results into `LookupOption` format.
 *
 * When the harness is connected to a real Dynamics environment, these
 * helpers are used instead of the mock data to demonstrate live search.
 */

import React from 'react';
import { BuildingRegular, PersonRegular } from '@fluentui/react-icons';
import type { LookupOption } from '../../../src';

/**
 * Type guard to check if the global Xrm object is available.
 *
 * Dynamics 365 exposes the Xrm object on the window for client-side scripts.
 * Our dynamics-mock.ts installs a shim when running in the test harness.
 */
function hasXrm(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (window as any).Xrm !== 'undefined';
}

/**
 * Get the Dynamics 365 org base URL.
 *
 * Returns the URL configured via environment variables, or extracts it
 * from the global Xrm object if available.
 */
function getApiBase(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xrm = (window as any).Xrm;
  if (xrm?.Utility?.getGlobalContext) {
    return `${xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2`;
  }
  // Relative by design. Inside Dynamics this is same-origin; in the harness the dev
  // server proxies it and attaches the bearer token (see testHarness/vite.config.ts),
  // so the browser neither holds nor needs a token of its own.
  return '/api/data/v9.2';
}

// =============================================================================
// NATIVE FETCH SEARCH - Uses native fetch() instead of Xrm.WebApi
// =============================================================================

/**
 * Search Dynamics 365 records using the native fetch() API.
 *
 * This function builds an OData query and calls the Web API directly,
 * bypassing the Xrm.WebApi wrapper. This approach:
 * - Works in the test harness (outside Dynamics forms)
 * - Allows full control over headers and response handling
 * - Returns results in LookupOption format for immediate use
 *
 * @param entitySet - The OData entity set name (e.g., 'accounts', 'contacts')
 * @param searchText - The text to search for (uses 'contains' filter)
 * @param primaryField - The primary display field (e.g., 'name', 'fullname')
 * @param secondaryField - The secondary display field (e.g., 'accountnumber')
 * @param detailFields - Additional fields to show in expandable details
 * @param top - Maximum number of results (default: 25)
 * @returns Promise resolving to array of LookupOption
 *
 * @example
 * ```tsx
 * // Search accounts by name
 * const options = await searchDynamicsRecordsNative(
 *   'accounts',
 *   'contoso',
 *   'name',
 *   'accountnumber',
 *   ['telephone1', 'address1_city']
 * );
 * ```
 */
export async function searchDynamicsRecordsNative(
  entitySet: string,
  searchText: string,
  primaryField: string,
  secondaryField: string,
  detailFields: string[] = [],
  top: number = 25
): Promise<LookupOption[]> {
  // Determine the entity's primary key field (follows Dynamics naming convention)
  const entityKey = entitySet.replace(/s$/, '') + 'id'; // accounts -> accountid

  // Build the $select clause with all requested fields
  const selectFields = [entityKey, primaryField, secondaryField, ...detailFields].join(',');

  // Build the $filter clause
  // When search text is provided, use contains() for case-insensitive search
  const filter = searchText
    ? `&$filter=contains(${primaryField},'${encodeURIComponent(searchText)}')`
    : '';

  // Construct the OData URL against the proxied base
  const url = `${getApiBase()}/${entitySet}?$select=${selectFields}${filter}&$top=${top}&$orderby=${primaryField} asc`;

  try {
    const response = await fetch(url, {
      headers: {
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'Prefer': 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Dynamics records to LookupOption format
    return (data.value || []).map((record: Record<string, unknown>) => {
      const option: LookupOption = {
        key: record[entityKey] as string,
        text: (record[primaryField] as string) || '(No Name)',
        secondaryText: (record[secondaryField] as string) || undefined,
        icon: entitySet === 'contacts' ? <PersonRegular /> : <BuildingRegular />,
      };

      // Build details array from additional fields
      if (detailFields.length > 0) {
        option.details = detailFields
          .filter((field) => record[field])
          .map((field) => ({
            // Format the field name as a readable label
            label: field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: String(record[field]),
          }));
      }

      return option;
    });
  } catch (error) {
    console.error('[searchDynamicsRecordsNative]', error);
    return [];
  }
}

// =============================================================================
// XRM.WEBAPI SEARCH - Uses Xrm.WebApi.retrieveMultipleRecords
// =============================================================================

/**
 * Search Dynamics 365 records using Xrm.WebApi.retrieveMultipleRecords.
 *
 * This function uses the standard Dynamics client API, which handles
 * authentication automatically when running inside a Dynamics form.
 * Our dynamics-mock.ts shims this API for the test harness.
 *
 * @param entityName - The logical entity name (e.g., 'accounts', 'contacts')
 * @param searchText - The text to search for
 * @param primaryField - The primary display field
 * @param secondaryField - The secondary display field
 * @param detailFields - Additional fields for details
 * @returns Promise resolving to array of LookupOption
 *
 * @example
 * ```tsx
 * // Search accounts (when Xrm is available)
 * const options = await searchDynamicsRecords(
 *   'accounts',
 *   'adv',
 *   'name',
 *   'accountnumber',
 *   ['telephone1', 'emailaddress1']
 * );
 * ```
 */
export async function searchDynamicsRecords(
  entityName: string,
  searchText: string,
  primaryField: string,
  secondaryField: string,
  detailFields: string[] = []
): Promise<LookupOption[]> {
  if (!hasXrm()) {
    console.warn('[searchDynamicsRecords] Xrm not available');
    return [];
  }

  const entityKey = entityName.replace(/s$/, '') + 'id';
  const selectFields = [entityKey, primaryField, secondaryField, ...detailFields].join(',');
  const filter = searchText
    ? `$filter=contains(${primaryField},'${searchText}')`
    : '';

  // Assemble from parts: interpolating an empty `filter` between two ampersands
  // produces "&&", and Dynamics rejects the empty parameter with
  // "The query parameter  is not supported"
  const options = `?${[`$select=${selectFields}`, filter, '$top=25', `$orderby=${primaryField} asc`]
    .filter(Boolean)
    .join('&')}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (window as any).Xrm.WebApi.retrieveMultipleRecords(entityName, options);

    return (result.entities || []).map((record: Record<string, unknown>) => {
      const option: LookupOption = {
        key: record[entityKey] as string,
        text: (record[primaryField] as string) || '(No Name)',
        secondaryText: (record[secondaryField] as string) || undefined,
        icon: entityName === 'contacts' ? <PersonRegular /> : <BuildingRegular />,
      };

      if (detailFields.length > 0) {
        option.details = detailFields
          .filter((field) => record[field])
          .map((field) => ({
            label: field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: String(record[field]),
          }));
      }

      return option;
    });
  } catch (error) {
    console.error('[searchDynamicsRecords]', error);
    return [];
  }
}

// =============================================================================
// CONTACT-SPECIFIC SEARCH
// =============================================================================

/**
 * Search contacts with pre-configured fields.
 *
 * A convenience wrapper around `searchDynamicsRecords` that uses
 * standard contact fields. Shows fullname as primary, jobtitle as
 * secondary, and email/phone in details.
 *
 * @param searchText - The text to search for
 * @returns Promise resolving to array of LookupOption
 */
export async function searchDynamicsContacts(searchText: string): Promise<LookupOption[]> {
  return searchDynamicsRecords(
    'contacts',
    searchText,
    'fullname',
    'jobtitle',
    // `parentcustomerid` is a navigation property and cannot be selected; the value
    // is exposed as `_parentcustomerid_value`. Selecting the former fails the whole
    // request with "Could not find a property named 'parentcustomerid'".
    ['emailaddress1', 'telephone1', '_parentcustomerid_value']
  );
}
