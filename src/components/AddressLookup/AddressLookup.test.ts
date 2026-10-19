import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  clearPlacesCache,
  formatPlaceAddress,
  geocodeAddress,
  getPlaceDetails,
  parsePlaceAddress,
  placeFromAddress,
  placeMapUrl,
  splitUnitPrefix,
} from '../../api/googlePlaces';
import { placeKind } from './AddressLookup.icons';
import type { PlaceDetail } from '../../api/googlePlaces.types';

const component = (longName: string, shortName: string, ...types: string[]) => ({
  longName,
  shortName,
  types,
});

const place = (overrides: Partial<PlaceDetail> = {}): PlaceDetail => ({
  placeId: 'ChIJtest',
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
  ...overrides,
});

describe('parsePlaceAddress', () => {
  it('joins the street number and route into one street line', () => {
    expect(parsePlaceAddress(place()).street).toBe('1 Queen Street');
  });

  it('returns long names for state and country by default', () => {
    const parsed = parsePlaceAddress(place());
    expect(parsed.state).toBe('Auckland');
    expect(parsed.country).toBe('New Zealand');
  });

  it('switches state and country to short names independently', () => {
    // Dynamics address fields are usually short for state and country but long elsewhere
    expect(parsePlaceAddress(place(), { stateShortName: true }).state).toBe('AUK');
    expect(parsePlaceAddress(place(), { stateShortName: true }).country).toBe('New Zealand');
    expect(parsePlaceAddress(place(), { countryShortName: true }).country).toBe('NZ');
  });

  it('falls back to the county when a rural address has no locality', () => {
    const rural = place({
      addressComponents: [
        component('Waikato District', 'Waikato District', 'administrative_area_level_2'),
        component('Waikato', 'WKO', 'administrative_area_level_1'),
      ],
    });

    expect(parsePlaceAddress(rural).city).toBe('Waikato District');
  });

  it('reads the suburb from whichever sublocality Google supplied', () => {
    expect(parsePlaceAddress(place()).suburb).toBe('Auckland CBD');

    const neighbourhood = place({
      addressComponents: [component('Ponsonby', 'Ponsonby', 'neighborhood')],
    });
    expect(parsePlaceAddress(neighbourhood).suburb).toBe('Ponsonby');
  });

  it('leaves missing components empty rather than undefined', () => {
    const sparse = parsePlaceAddress(place({ addressComponents: [] }));

    expect(sparse.street).toBe('');
    expect(sparse.building).toBe('');
    expect(sparse.postcode).toBe('');
  });

  it('carries the coordinates and place id through unchanged', () => {
    const parsed = parsePlaceAddress(place());

    expect(parsed.latitude).toBe(-36.8442);
    expect(parsed.longitude).toBe(174.7676);
    expect(parsed.placeId).toBe('ChIJtest');
  });
});

describe('placeMapUrl', () => {
  it('prefers the permalink Google supplies', () => {
    expect(placeMapUrl(place({ url: 'https://maps.google.com/?cid=1' }))).toBe(
      'https://maps.google.com/?cid=1',
    );
  });

  it('builds a coordinate search when there is no permalink', () => {
    expect(placeMapUrl(place())).toBe(
      'https://www.google.com/maps/search/?api=1&query=-36.8442,174.7676&query_place_id=ChIJtest',
    );
  });

  it('leaves out the place id parameter when there is no place id', () => {
    expect(placeMapUrl(place({ placeId: '' }))).toBe(
      'https://www.google.com/maps/search/?api=1&query=-36.8442,174.7676',
    );
  });

  it('searches the address text when there are no coordinates', () => {
    expect(placeMapUrl(place({ placeId: '', latitude: 0, longitude: 0, formattedAddress: '1 Queen St' }))).toBe(
      'https://www.google.com/maps/search/?api=1&query=1%20Queen%20St',
    );
  });
});

describe('request caching', () => {
  // A stand-in for the Maps API: each status in the queue answers one request
  const installGoogle = (statuses: string[]) => {
    const getDetails = vi.fn((_request: unknown, callback: (place: unknown, status: string) => void) => {
      const status = statuses.shift() ?? 'OK';
      setTimeout(() => callback(status === 'OK' ? { place_id: 'ChIJtest', types: [] } : null, status));
    });
    const geocode = vi.fn((_request: unknown, callback: (results: unknown[], status: string) => void) => {
      const status = statuses.shift() ?? 'OK';
      setTimeout(() => callback(status === 'OK' ? [{ place_id: 'g', types: [] }] : [], status));
    });
    (window as { google?: unknown }).google = {
      maps: {
        places: {
          PlacesServiceStatus: { OK: 'OK' },
          PlacesService: vi.fn(function PlacesService() { return { getDetails }; }),
        },
        Geocoder: vi.fn(function Geocoder() { return { geocode }; }),
      },
    };
    return { getDetails, geocode };
  };

  afterEach(() => {
    clearPlacesCache();
    delete (window as { google?: unknown }).google;
  });

  it('joins a request already in flight, so a hover then a click is one call', async () => {
    const { getDetails } = installGoogle(['OK']);

    await Promise.all([getPlaceDetails('ChIJtest', 'key'), getPlaceDetails('ChIJtest', 'key')]);

    expect(getDetails).toHaveBeenCalledTimes(1);
  });

  it('remembers a "not found" but retries a transient failure', async () => {
    const { getDetails, geocode } = installGoogle(['NOT_FOUND', 'OVER_QUERY_LIMIT', 'OK']);

    await expect(getPlaceDetails('stale', 'key')).rejects.toThrow('NOT_FOUND');
    await expect(getPlaceDetails('stale', 'key')).rejects.toThrow('NOT_FOUND');
    expect(getDetails).toHaveBeenCalledTimes(1);

    await expect(geocodeAddress('Nowhere', 'key')).rejects.toThrow('OVER_QUERY_LIMIT');
    await expect(geocodeAddress('  nowhere ', 'key')).resolves.toMatchObject({ placeId: 'g' });
    expect(geocode).toHaveBeenCalledTimes(2);
  });
});

describe('formatPlaceAddress', () => {
  it('prefers the formatted address when one is stored', () => {
    expect(formatPlaceAddress({ formattedAddress: '1 Queen St, Auckland', street: 'ignored' })).toBe(
      '1 Queen St, Auckland',
    );
  });

  it('joins the stored columns in written order, skipping blanks', () => {
    expect(
      formatPlaceAddress({ street: '1 Queen Street', suburb: '', city: 'Auckland', postcode: '1010', country: 'NZ' }),
    ).toBe('1 Queen Street, Auckland, 1010, NZ');
  });

  it('returns an empty string when nothing is stored', () => {
    expect(formatPlaceAddress({})).toBe('');
  });
});

describe('placeFromAddress', () => {
  const stored = {
    building: 'Vero Centre',
    street: '48 Shortland Street',
    suburb: 'Auckland CBD',
    city: 'Auckland',
    state: 'AUK',
    postcode: '1010',
    country: 'NZ',
    latitude: -36.8466,
    longitude: 174.7682,
  };

  it('round-trips through parsePlaceAddress, so choosing a stored address keeps its columns', () => {
    const parsed = parsePlaceAddress(placeFromAddress(stored));

    expect(parsed).toMatchObject(stored);
  });

  it('keeps the stored coordinates', () => {
    const detail = placeFromAddress(stored);

    expect(detail.latitude).toBe(-36.8466);
    expect(detail.longitude).toBe(174.7682);
  });

  it('treats missing or 0,0 coordinates as none', () => {
    expect(placeFromAddress({ street: '1 Queen Street' }).latitude).toBe(0);
    expect(placeFromAddress({ street: '1 Queen Street', latitude: Number.NaN, longitude: 1 }).latitude).toBe(0);
  });
});

describe('placeKind', () => {
  it('picks the specific type over the generic ones Google also returns', () => {
    // Every airport is also an establishment and a point of interest
    expect(placeKind(['airport', 'point_of_interest', 'establishment'])).toBe('airport');
    expect(placeKind(['lodging', 'point_of_interest', 'establishment'])).toBe('lodging');
    expect(placeKind(['restaurant', 'food', 'establishment'])).toBe('shop');
  });

  it('separates the levels of an address', () => {
    expect(placeKind(['street_address'])).toBe('address');
    expect(placeKind(['premise'])).toBe('building');
    expect(placeKind(['route'])).toBe('street');
    expect(placeKind(['locality', 'political'])).toBe('locality');
    expect(placeKind(['administrative_area_level_1', 'political'])).toBe('region');
    expect(placeKind(['country', 'political'])).toBe('country');
    expect(placeKind(['postal_code'])).toBe('postcode');
  });

  it('falls back to a generic place for unknown or missing types', () => {
    expect(placeKind(['something_new'])).toBe('place');
    expect(placeKind([])).toBe('place');
    expect(placeKind(undefined)).toBe('place');
  });
});

describe('splitUnitPrefix', () => {
  it('splits a level written with a slash', () => {
    expect(splitUnitPrefix('Level 5/135 Coronation Dr Milton QLD 4064')).toEqual({
      unit: 'Level 5',
      street: '135 Coronation Dr Milton QLD 4064',
    });
  });

  it('splits units written with a comma or a space', () => {
    expect(splitUnitPrefix('Unit 3B, 12 Smith St')).toEqual({ unit: 'Unit 3B', street: '12 Smith St' });
    expect(splitUnitPrefix('Suite 2 10 Queen St')).toEqual({ unit: 'Suite 2', street: '10 Queen St' });
  });

  it('splits the numeric slash shorthand', () => {
    expect(splitUnitPrefix('5/135 Coronation Dr')).toEqual({ unit: '5', street: '135 Coronation Dr' });
  });

  it('splits a level and a suite together', () => {
    expect(splitUnitPrefix('Level 2, Suite 4, 10 Smith St')).toEqual({
      unit: 'Level 2, Suite 4',
      street: '10 Smith St',
    });
  });

  it('leaves an address with no unit alone', () => {
    expect(splitUnitPrefix('135 Coronation Dr')).toEqual({ unit: '', street: '135 Coronation Dr' });
    expect(splitUnitPrefix('Shop Lane')).toEqual({ unit: '', street: 'Shop Lane' });
    // A unit with no street number after it is still being typed - leave it for Google
    expect(splitUnitPrefix('Level 5 Coronation')).toEqual({ unit: '', street: 'Level 5 Coronation' });
  });
});
