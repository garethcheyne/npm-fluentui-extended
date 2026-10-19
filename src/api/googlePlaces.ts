import type {
  PlaceAddress,
  PlaceAddressComponent,
  PlaceAddressOptions,
  PlaceDetail,
  PlacePrediction,
  PlaceSearchOptions,
} from './googlePlaces.types';

declare global {
  interface Window {
    google?: any;
  }
}

const SCRIPT_ID = 'fluentui-extended-google-maps';
const CALLBACK_NAME = '__fluentuiExtendedGoogleMapsReady';
const LOADER_NAME = '__fluentuiExtendedGoogleMapsLoader';

type Loader = { apiKey: string; promise: Promise<void> };

// One loader per document, keyed by the API key that started it. Held on the
// window, not the module: the root and `address-lookup` entries are separate
// bundles with their own copy of this file, and a second script tag would
// overwrite the shared callback and leave the first loader's promise hanging.
const getLoader = (): Loader | null =>
  ((window as unknown as Record<string, unknown>)[LOADER_NAME] as Loader | undefined) ?? null;
const setLoader = (value: Loader | null): void => {
  (window as unknown as Record<string, unknown>)[LOADER_NAME] = value ?? undefined;
};

/**
 * Place Details and Geocoding are billed per call, and the same place is
 * routinely resolved twice - once when a row's card is hovered, again when the
 * row is chosen, often while the first is still in flight. The promise is cached,
 * not the result, so the second caller joins the first request.
 */
const detailCache = new Map<string, Promise<PlaceDetail>>();
/** Geocoder results, keyed by the query or the coordinates. */
const geocodeCache = new Map<string, Promise<PlaceDetail>>();

// Answers that will not change on a retry. Kept cached so hovering an unknown
// address again does not pay for the same "no" twice; anything else - a quota or
// network failure, a bad key - is dropped so the next attempt goes to Google.
const PERMANENT_STATUSES = ['NOT_FOUND', 'ZERO_RESULTS'];

const statusError = (message: string, status: string): Error =>
  Object.assign(new Error(`${message}: ${status}`), { status });

const cached = <T>(cache: Map<string, Promise<T>>, key: string, request: () => Promise<T>): Promise<T> => {
  const existing = cache.get(key);
  if (existing) return existing;

  const promise = request();
  cache.set(key, promise);
  promise.catch((err: unknown) => {
    const status = (err as { status?: unknown } | null)?.status;
    const permanent = typeof status === 'string' && PERMANENT_STATUSES.includes(status);
    if (!permanent && cache.get(key) === promise) cache.delete(key);
  });
  return promise;
};

/** True once the Maps JavaScript API and its Places library are usable. */
export const isGoogleMapsReady = (): boolean => Boolean(window.google?.maps?.places);

/**
 * Load the Maps JavaScript API once per page.
 *
 * The tag is deduplicated and the promise shared, because every row of a result
 * list can ask for the API at the same moment and a second `<script>` would
 * either race the first or make Google complain about being loaded twice.
 */
export const loadGoogleMaps = (apiKey: string): Promise<void> => {
  if (isGoogleMapsReady()) return Promise.resolve();
  if (!apiKey) return Promise.reject(new Error('A Google Maps API key is required'));
  const loader = getLoader();
  if (loader && loader.apiKey === apiKey) return loader.promise;

  const promise = new Promise<void>((resolve, reject) => {
    (window as unknown as Record<string, unknown>)[CALLBACK_NAME] = () => {
      delete (window as unknown as Record<string, unknown>)[CALLBACK_NAME];
      resolve();
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&loading=async&libraries=places&callback=${CALLBACK_NAME}`;
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[CALLBACK_NAME];
      setLoader(null);
      script.remove();
      reject(new Error('Failed to load the Google Maps API - check the key and its referrer restrictions'));
    };

    document.head.appendChild(script);
  });

  setLoader({ apiKey, promise });
  return promise;
};

/** Discard cached Place Details and geocodes. Mainly for tests. */
export const clearPlacesCache = (): void => {
  detailCache.clear();
  geocodeCache.clear();
};

const toArray = (countries?: string | string[]): string[] =>
  (Array.isArray(countries) ? countries : (countries ?? '').split(','))
    .map((country) => country.trim().toLowerCase())
    .filter(Boolean);

/**
 * Autocomplete suggestions for a query.
 *
 * Only predictions are fetched - a prediction is a cheap Autocomplete result,
 * not a place. Resolving every row up front would bill a Place Details call per
 * suggestion per keystroke, which is why the card and the selection each resolve
 * exactly one place, on demand.
 */
export const searchPlacePredictions = async (
  query: string,
  { apiKey, countries, types = ['address'] }: PlaceSearchOptions,
): Promise<PlacePrediction[]> => {
  await loadGoogleMaps(apiKey);

  if (!isGoogleMapsReady()) {
    throw new Error('The Google Places library is unavailable after loading');
  }

  return new Promise((resolve, reject) => {
    const places = window.google.maps.places;
    const service = new places.AutocompleteService();
    const request: Record<string, unknown> = { input: query, types };

    const restrictions = toArray(countries);
    if (restrictions.length) request.componentRestrictions = { country: restrictions };

    service.getPlacePredictions(request, (predictions: any[], status: string) => {
      if (status === places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }

      if (status !== places.PlacesServiceStatus.OK || !predictions) {
        reject(new Error(`Google Places search failed: ${status}`));
        return;
      }

      resolve(
        predictions.map((prediction) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || '',
          types: prediction.types || [],
        })),
      );
    });
  });
};

const DETAIL_FIELDS = [
  'place_id',
  'name',
  'formatted_address',
  'address_components',
  'geometry',
  'types',
  'url',
  'rating',
  'user_ratings_total',
  'formatted_phone_number',
  'website',
  'business_status',
];

/** Resolve a prediction into a place. Cached, so a hover then a click costs one call. */
export const getPlaceDetails = (placeId: string, apiKey: string): Promise<PlaceDetail> =>
  cached(detailCache, placeId, () => fetchPlaceDetails(placeId, apiKey));

const fetchPlaceDetails = async (placeId: string, apiKey: string): Promise<PlaceDetail> => {
  await loadGoogleMaps(apiKey);

  if (!isGoogleMapsReady()) {
    throw new Error('The Google Places library is unavailable after loading');
  }

  return new Promise<PlaceDetail>((resolve, reject) => {
    const places = window.google.maps.places;
    // PlacesService insists on a node to attribute Google's logo to, even
    // when nothing is rendered from it
    const service = new places.PlacesService(document.createElement('div'));

    service.getDetails({ placeId, fields: DETAIL_FIELDS }, (place: any, status: string) => {
      if (status !== places.PlacesServiceStatus.OK || !place) {
        reject(statusError('Google Place Details failed', status));
        return;
      }

      resolve({
        placeId: place.place_id || placeId,
        name: place.name,
        formattedAddress: place.formatted_address || '',
        addressComponents: (place.address_components || []).map((component: any) => ({
          longName: component.long_name,
          shortName: component.short_name,
          types: component.types || [],
        })),
        latitude: place.geometry?.location?.lat?.() ?? 0,
        longitude: place.geometry?.location?.lng?.() ?? 0,
        types: place.types || [],
        url: place.url,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        phone: place.formatted_phone_number,
        website: place.website,
        businessStatus: place.business_status,
      });
    });
  });
};

const componentOf = (
  components: PlaceAddressComponent[],
  type: string,
  short = false,
): string => {
  const match = components.find((component) => component.types.includes(type));
  if (!match) return '';
  return short ? match.shortName : match.longName;
};

// "Level 5", "Unit 3B", "Suite 12" - a word naming the part of the building, then its number
const UNIT_WORD =
  /^((?:level|lvl|floor|flr|fl|unit|apartment|apt|suite|ste|shop|flat|office|room|villa|townhouse)\.?\s*[a-z]?\d+[a-z]?)\s*[,/\\-]?\s*/i;
// "5/135" - the Australian and New Zealand shorthand for unit 5 at number 135
const UNIT_SLASH = /^([a-z]?\d+[a-z]?)\s*\/\s*(?=\d)/i;

/**
 * Split a leading unit or level off a typed address.
 *
 * Google Autocomplete matches "135 Coronation Dr" but often finds nothing, or
 * the wrong street, for "Level 5/135 Coronation Dr" - so the search goes out
 * without the unit and the unit is put back on the chosen address. Only split
 * when a street number follows, so "Shop Lane" and the like are left alone.
 */
export const splitUnitPrefix = (query: string): { unit: string; street: string } => {
  const units: string[] = [];
  let rest = query.trim();

  // Repeated for "Level 2, Suite 4, 10 Smith St"
  for (let match = UNIT_WORD.exec(rest) ?? UNIT_SLASH.exec(rest); match; ) {
    units.push(match[1].replace(/\s+/g, ' '));
    rest = rest.slice(match[0].length).trimStart();
    match = UNIT_WORD.exec(rest) ?? UNIT_SLASH.exec(rest);
  }

  return units.length && /^\d/.test(rest)
    ? { unit: units.join(', '), street: rest }
    : { unit: '', street: query.trim() };
};

/** Flatten a place into the columns an address is stored in. */
export const parsePlaceAddress = (
  place: PlaceDetail,
  { stateShortName = false, countryShortName = false }: PlaceAddressOptions = {},
): PlaceAddress => {
  const components = place.addressComponents;
  const streetNumber = componentOf(components, 'street_number');
  const route = componentOf(components, 'route');

  return {
    placeId: place.placeId,
    formattedAddress: place.formattedAddress,
    building: componentOf(components, 'premise') || componentOf(components, 'subpremise'),
    street: [streetNumber, route].filter(Boolean).join(' '),
    suburb:
      componentOf(components, 'sublocality') ||
      componentOf(components, 'sublocality_level_1') ||
      componentOf(components, 'neighborhood'),
    // Rural addresses often have no locality, where the county is the nearest thing to a city
    city:
      componentOf(components, 'locality') || componentOf(components, 'administrative_area_level_2'),
    state: componentOf(components, 'administrative_area_level_1', stateShortName),
    postcode: componentOf(components, 'postal_code'),
    country: componentOf(components, 'country', countryShortName),
    latitude: place.latitude,
    longitude: place.longitude,
  };
};

/** A Google Maps link for a place, falling back to its coordinates, then its address text. */
export const placeMapUrl = (place: PlaceDetail): string => {
  if (place.url) return place.url;
  // 0,0 is what a place without geometry parses to - a search there lands in the Atlantic
  const query =
    place.latitude || place.longitude
      ? `${place.latitude},${place.longitude}`
      : encodeURIComponent(place.formattedAddress);
  return (
    `https://www.google.com/maps/search/?api=1&query=${query}` +
    (place.placeId ? `&query_place_id=${encodeURIComponent(place.placeId)}` : '')
  );
};

// ── Addresses without a place id ─────────────────────────────────────────────

const hasCoordinates = (address: Partial<PlaceAddress>): boolean =>
  typeof address.latitude === 'number' &&
  typeof address.longitude === 'number' &&
  !Number.isNaN(address.latitude) &&
  !Number.isNaN(address.longitude) &&
  !(address.latitude === 0 && address.longitude === 0);

/** The stored columns joined into one line, in the order an address is written. */
export const formatPlaceAddress = (address: Partial<PlaceAddress>): string =>
  address.formattedAddress?.trim() ||
  [address.building, address.street, address.suburb, address.city, address.state, address.postcode, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');

const geocode = (request: Record<string, unknown>, cacheKey: string, apiKey: string): Promise<PlaceDetail> =>
  cached(geocodeCache, cacheKey, () => fetchGeocode(request, apiKey));

const fetchGeocode = async (request: Record<string, unknown>, apiKey: string): Promise<PlaceDetail> => {
  await loadGoogleMaps(apiKey);

  const maps = window.google?.maps;
  if (!maps?.Geocoder) {
    throw new Error('The Google Geocoding service is unavailable after loading');
  }

  return new Promise<PlaceDetail>((resolve, reject) => {
    const pending = new maps.Geocoder().geocode(request, (results: any[], status: string) => {
      const result = results?.[0];
      if (status !== 'OK' || !result) {
        reject(statusError('Google Geocoding failed', status));
        return;
      }

      resolve({
        placeId: result.place_id || '',
        formattedAddress: result.formatted_address || '',
        addressComponents: (result.address_components || []).map((component: any) => ({
          longName: component.long_name,
          shortName: component.short_name,
          types: component.types || [],
        })),
        latitude: result.geometry?.location?.lat?.() ?? 0,
        longitude: result.geometry?.location?.lng?.() ?? 0,
        types: result.types || [],
      });
    });
    // Newer Maps versions also return a promise that rejects on ZERO_RESULTS even
    // with a callback; the callback has it covered, so keep it out of the console
    pending?.catch?.(() => undefined);
  });
};

/** Place an address written as text. Needs the Geocoding API enabled on the key. */
export const geocodeAddress = (address: string, apiKey: string): Promise<PlaceDetail> =>
  geocode({ address }, `address:${address.trim().replace(/\s+/g, ' ').toLowerCase()}`, apiKey);

/** Find the address at a pair of coordinates. Needs the Geocoding API enabled on the key. */
export const reverseGeocode = (latitude: number, longitude: number, apiKey: string): Promise<PlaceDetail> =>
  geocode({ location: { lat: latitude, lng: longitude } }, `location:${latitude},${longitude}`, apiKey);

/**
 * Build a place from stored address columns, without asking Google.
 *
 * The components are rebuilt from the columns, so `parsePlaceAddress` hands the
 * same values back - choosing a stored address must not blank the fields it
 * came from.
 */
export const placeFromAddress = (address: Partial<PlaceAddress>): PlaceDetail => {
  const columns: Array<[string | undefined, string]> = [
    [address.building, 'premise'],
    [address.street, 'route'],
    [address.suburb, 'sublocality'],
    [address.city, 'locality'],
    [address.state, 'administrative_area_level_1'],
    [address.postcode, 'postal_code'],
    [address.country, 'country'],
  ];

  return {
    placeId: address.placeId || '',
    formattedAddress: formatPlaceAddress(address),
    addressComponents: columns
      .filter(([value]) => Boolean(value?.trim()))
      .map(([value, type]) => ({ longName: value!.trim(), shortName: value!.trim(), types: [type] })),
    latitude: hasCoordinates(address) ? address.latitude! : 0,
    longitude: hasCoordinates(address) ? address.longitude! : 0,
    types: ['street_address'],
  };
};

/**
 * Resolve whatever a record holds into a place to map.
 *
 * Records saved before Place IDs were stored, or typed in by hand, often have
 * only the columns. So: the place id first; then the stored coordinates, which
 * are what the record says and so win over a fresh geocode; then the address
 * text, geocoded. A stale place id falls through rather than failing the card.
 */
export const resolvePlace = async (
  { placeId, address }: { placeId?: string; address?: Partial<PlaceAddress> | null },
  apiKey: string,
): Promise<PlaceDetail> => {
  const id = (placeId || address?.placeId || '').trim();
  let placeIdError: unknown;

  if (id) {
    try {
      return await getPlaceDetails(id, apiKey);
    } catch (err) {
      placeIdError = err;
    }
  }

  if (address && hasCoordinates(address)) {
    const stored = placeFromAddress(address);
    if (stored.formattedAddress) {
      // Loaded here because the card draws a map, even though nothing is looked up
      await loadGoogleMaps(apiKey);
      return stored;
    }

    // Coordinates but no address - ask Google what is there, but keep the pin on the record's own point
    try {
      const found = await reverseGeocode(address.latitude!, address.longitude!, apiKey);
      return { ...found, latitude: stored.latitude, longitude: stored.longitude };
    } catch {
      await loadGoogleMaps(apiKey);
      return { ...stored, formattedAddress: `${stored.latitude.toFixed(6)}, ${stored.longitude.toFixed(6)}` };
    }
  }

  const text = address ? formatPlaceAddress(address) : '';
  if (text) return geocodeAddress(text, apiKey);

  if (placeIdError) throw placeIdError;
  throw new Error('There is no place id, coordinates or address to look up');
};
