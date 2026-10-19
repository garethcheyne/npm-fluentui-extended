/**
 * AddressLookup Component Examples
 *
 * Demonstrates the Google Places address picker:
 *
 * 1. **Prediction-only search** - typing buys Autocomplete predictions, nothing else
 * 2. **Hover map card** - the place behind a row is resolved when its card opens
 * 3. **Flattened result** - the selection arrives as form columns, ready to bind
 * 4. **Country restriction** - narrow results to the markets you sell in
 *
 * A key is needed. Put `VITE_GOOGLE_MAPS_API_KEY` in `.env`, or paste one below -
 * the key must have the Maps JavaScript API and Places API enabled, and allow
 * `http://localhost:*` under its HTTP referrer restrictions.
 */

import React from 'react';
import { Input, Text, Field } from '@fluentui/react-components';

// Import from the library source (../../../src) — in a real app you'd use:
// import { AddressLookup } from 'fluentui-extended';
import { AddressLookup } from '../../../src';
import type { PlaceAddress } from '../../../src';
import type { ExampleProps } from '../shared/types';

const panel: React.CSSProperties = {
  border: '1px solid #e1dfdd',
  borderRadius: 8,
  padding: 24,
  background: '#fff',
};

/** A form column, so the field is not stretched the width of the browser */
const formColumn: React.CSSProperties = {
  maxWidth: 480,
};

const envKey = (import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_GOOGLE_MAPS_API_KEY;

export function AddressLookupExamples(_props: ExampleProps) {
  const [apiKey, setApiKey] = React.useState(envKey ?? '');
  const [address, setAddress] = React.useState<PlaceAddress | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const columns: Array<[string, string | number]> = address
    ? [
        ['Building', address.building],
        ['Street', address.street],
        ['Suburb', address.suburb],
        ['City', address.city],
        ['State', address.state],
        ['Postcode', address.postcode],
        ['Country', address.country],
        ['Latitude', address.latitude],
        ['Longitude', address.longitude],
        ['Place ID', address.placeId],
      ]
    : [];

  return (
    <section style={{ marginBottom: 40 }}>
      <h2>Address Lookup</h2>
      <p style={{ color: '#666', marginBottom: 12 }}>
        A Google Places picker built on Lookup. Hover a suggestion to see it on a map -
        the place is only resolved once the pointer settles, and that same result is
        reused when the row is chosen.
      </p>

      <div style={{ ...panel, ...formColumn, marginBottom: 16 }}>
        <Field
          label="Google Maps API key"
          hint="Set VITE_GOOGLE_MAPS_API_KEY in .env to skip this. The key needs the Maps JavaScript API and Places API, and must allow http://localhost:*"
        >
          <Input
            value={apiKey}
            type="password"
            placeholder="AIza..."
            onChange={(_, data) => setApiKey(data.value)}
          />
        </Field>
      </div>

      <div style={{ ...panel, ...formColumn }}>
        <AddressLookup
          apiKey={apiKey}
          label="Address"
          value={address}
          onSelect={(picked) => {
            setAddress(picked);
            setError(null);
          }}
          countries={['nz', 'au']}
          stateShortName
          countryShortName
          onError={(err) => setError(err.message)}
        />

        {!apiKey && (
          <Text size={200} style={{ color: '#888', display: 'block', marginTop: 12 }}>
            Enter a key above to search.
          </Text>
        )}

        {error && (
          <Text size={200} style={{ color: '#a4262c', display: 'block', marginTop: 12 }}>
            {error}
          </Text>
        )}

        {address && (
          <div style={{ marginTop: 20 }}>
            <strong style={{ fontSize: 13 }}>Bound columns</strong>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                columnGap: 16,
                rowGap: 4,
                marginTop: 8,
                fontSize: 13,
              }}
            >
              {columns.map(([label, value]) => (
                <React.Fragment key={label}>
                  <span style={{ color: '#666' }}>{label}</span>
                  <span>{value === '' || value === 0 ? '-' : value}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ ...formColumn, marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
        <strong>What it costs</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
          <li>Typing bills Autocomplete only - never Place Details per suggestion</li>
          <li>One Place Details call per card opened, cached and reused on selection</li>
          <li>
            <code>minSearchLength</code> defaults to 3 so short input never leaves the browser
          </li>
        </ul>
      </div>
    </section>
  );
}
