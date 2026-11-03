import * as React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import type { PlaceAddress, PlaceDetail, PlacePrediction } from '../../api/googlePlaces.types';
import { AddressLookup } from './AddressLookup';
import type { AddressLookupProps } from './AddressLookup.types';

/**
 * AddressLookup's first render tests.
 *
 * Google bills per request and the Maps script cannot load in jsdom, so the
 * Places module is mocked at its boundary: the two calls that cost money -
 * predictions while typing, details once a row is chosen - are fakes, and the
 * pure helpers that flatten a place into form columns are the real ones. What
 * is worth pinning is that typing buys predictions only, that choosing one
 * resolves it and hands back the flattened address, that the caller's country
 * restriction really reaches the search, and that a field the user may not
 * change offers nothing to change it with.
 */

const places = vi.hoisted(() => ({
  searchPlacePredictions: vi.fn(),
  getPlaceDetails: vi.fn(),
}));

vi.mock('../../api/googlePlaces', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/googlePlaces')>();
  const unavailable = () => Promise.reject(new Error('Google Maps is not loaded in tests'));
  return {
    ...actual,
    searchPlacePredictions: places.searchPlacePredictions,
    getPlaceDetails: places.getPlaceDetails,
    loadGoogleMaps: unavailable,
    resolvePlace: unavailable,
    geocodeAddress: unavailable,
    reverseGeocode: unavailable,
    isGoogleMapsReady: () => false,
  };
});

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

const PREDICTIONS: PlacePrediction[] = [
  {
    placeId: 'ChIJqueen',
    description: '1 Queen Street, Auckland CBD, Auckland, New Zealand',
    mainText: '1 Queen Street',
    secondaryText: 'Auckland CBD, Auckland, New Zealand',
    types: ['street_address'],
  },
  {
    placeId: 'ChIJqueenvic',
    description: '1 Queen Street, Melbourne VIC, Australia',
    mainText: '1 Queen Street',
    secondaryText: 'Melbourne VIC, Australia',
    types: ['street_address'],
  },
];

const component = (longName: string, shortName: string, ...types: string[]) => ({ longName, shortName, types });

const QUEEN_STREET: PlaceDetail = {
  placeId: 'ChIJqueen',
  formattedAddress: '1 Queen Street, Auckland CBD, Auckland 1010, New Zealand',
  addressComponents: [
    component('1', '1', 'street_number'),
    component('Queen Street', 'Queen St', 'route'),
    component('Auckland CBD', 'Auckland CBD', 'sublocality', 'sublocality_level_1'),
    component('Auckland', 'Auckland', 'locality'),
    component('Auckland', 'AUK', 'administrative_area_level_1'),
    component('New Zealand', 'NZ', 'country'),
    component('1010', '1010', 'postal_code'),
  ],
  latitude: -36.8442,
  longitude: 174.7676,
  types: ['street_address'],
};

const PLACEHOLDER = 'Start typing an address...';

beforeEach(() => {
  places.searchPlacePredictions.mockReset().mockResolvedValue(PREDICTIONS);
  places.getPlaceDetails.mockReset().mockResolvedValue(QUEEN_STREET);
});

function renderAddress(props: Partial<AddressLookupProps> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AddressLookup apiKey="test-key" searchDebounceMs={0} showMapCard={false} {...props} />
    </FluentProvider>,
  );
}

const type = (text: string) => fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: text } });

/** The countries a search was restricted to, whichever form the caller's list travelled in. */
const countriesOf = (call: unknown[]) => {
  const { countries } = call[1] as { countries?: string | string[] };
  return (Array.isArray(countries) ? countries : String(countries ?? '').split(',')).filter(Boolean);
};

describe('AddressLookup', () => {
  it('searches Google as the user types and lists what comes back', async () => {
    renderAddress();

    type('1 Queen');

    expect(await screen.findByText('Auckland CBD, Auckland, New Zealand')).toBeInTheDocument();
    expect(screen.getByText('Melbourne VIC, Australia')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    // Google's attribution, which its terms require wherever results show without a map
    expect(screen.getByText('2 suggestions · Powered by Google')).toBeInTheDocument();
    expect(places.searchPlacePredictions).toHaveBeenCalledWith('1 Queen', expect.objectContaining({ apiKey: 'test-key' }));
    expect(places.getPlaceDetails).not.toHaveBeenCalled();
  });

  it('does not spend a request on fewer characters than minSearchLength', async () => {
    renderAddress({ minSearchLength: 4 });

    type('1 Q');

    expect(await screen.findByText('Type at least 4 characters')).toBeInTheDocument();
    expect(places.searchPlacePredictions).not.toHaveBeenCalled();
  });

  it('resolves the chosen suggestion and hands back the address flattened to form columns', async () => {
    const onSelect = vi.fn();
    renderAddress({ onSelect });
    type('1 Queen');

    fireEvent.click(await screen.findByText('Auckland CBD, Auckland, New Zealand'));

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(places.getPlaceDetails).toHaveBeenCalledWith('ChIJqueen', 'test-key');
    const [address, place] = onSelect.mock.calls[0] as [PlaceAddress, PlaceDetail];
    expect(address).toEqual({
      placeId: 'ChIJqueen',
      formattedAddress: '1 Queen Street, Auckland CBD, Auckland 1010, New Zealand',
      building: '',
      street: '1 Queen Street',
      suburb: 'Auckland CBD',
      city: 'Auckland',
      state: 'Auckland',
      postcode: '1010',
      country: 'New Zealand',
      latitude: -36.8442,
      longitude: 174.7676,
    });
    expect(place).toBe(QUEEN_STREET);
  });

  it('returns state and country as codes when asked to', async () => {
    const onSelect = vi.fn();
    renderAddress({ onSelect, stateShortName: true, countryShortName: true });
    type('1 Queen');

    fireEvent.click(await screen.findByText('Auckland CBD, Auckland, New Zealand'));

    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onSelect.mock.calls[0][0]).toMatchObject({ state: 'AUK', country: 'NZ' });
  });

  it('passes the countries restriction and prediction types through to the search', async () => {
    renderAddress({ countries: ['nz', 'au'], searchTypes: ['establishment'] });

    type('1 Queen');

    await waitFor(() => expect(places.searchPlacePredictions).toHaveBeenCalledTimes(1));
    const call = places.searchPlacePredictions.mock.calls[0];
    expect(countriesOf(call)).toEqual(['nz', 'au']);
    expect(call[1]).toMatchObject({ types: ['establishment'] });
  });

  it('searches without a typed unit and puts the unit back on the chosen address', async () => {
    const onSelect = vi.fn();
    renderAddress({ onSelect });

    type('Level 5/1 Queen');

    await waitFor(() => expect(places.searchPlacePredictions).toHaveBeenCalledWith('1 Queen', expect.anything()));
    fireEvent.click(await screen.findByText('Auckland CBD, Auckland, New Zealand'));
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onSelect.mock.calls[0][0]).toMatchObject({ building: 'Level 5', street: '1 Queen Street' });
  });

  it('reports a failed search through onError and says so under the field', async () => {
    places.searchPlacePredictions.mockRejectedValue(new Error('REQUEST_DENIED'));
    const onError = vi.fn();
    renderAddress({ onError });

    type('1 Queen');

    expect(await screen.findByText('REQUEST_DENIED')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'REQUEST_DENIED' }));
  });

  it('offers the typed text as an address when allowFreeText is on, without resolving a place', async () => {
    places.searchPlacePredictions.mockResolvedValue([]);
    const onSelect = vi.fn();
    renderAddress({ onSelect, allowFreeText: true });

    type('42 Nowhere Road');
    fireEvent.click(await screen.findByText('Use "42 Nowhere Road"'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: '', street: '42 Nowhere Road', formattedAddress: '42 Nowhere Road' }),
      null,
    );
    expect(places.getPlaceDetails).not.toHaveBeenCalled();
  });

  it('shows a read-only value with no way to type over or clear it', () => {
    const value: PlaceAddress = {
      placeId: 'ChIJqueen',
      formattedAddress: '1 Queen Street, Auckland CBD, Auckland 1010, New Zealand',
      building: '',
      street: '1 Queen Street',
      suburb: 'Auckland CBD',
      city: 'Auckland',
      state: 'Auckland',
      postcode: '1010',
      country: 'New Zealand',
      latitude: -36.8442,
      longitude: 174.7676,
    };
    renderAddress({ value, readOnly: true });

    expect(screen.getByText('1 Queen Street, Auckland CBD, Auckland 1010, New Zealand')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it('disables the input when disabled, so nothing can be searched', async () => {
    renderAddress({ disabled: true });

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeDisabled();
    // Even a change event forced onto it opens no list and buys no predictions
    type('1 Queen');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(places.searchPlacePredictions).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
