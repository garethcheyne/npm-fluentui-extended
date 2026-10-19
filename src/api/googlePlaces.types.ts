/** One component of a Google address, flattened to the fields a form needs. */
export interface PlaceAddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

/** A row in the autocomplete list. Cheap - no Place Details call has been made yet. */
export interface PlacePrediction {
  placeId: string;
  /** The whole suggestion, e.g. "1 Queen Street, Auckland, New Zealand" */
  description: string;
  /** The distinguishing part, e.g. "1 Queen Street" */
  mainText: string;
  /** The context, e.g. "Auckland, New Zealand" */
  secondaryText: string;
  types: string[];
}

/** A resolved place. One Place Details call per instance, so they are cached. */
export interface PlaceDetail {
  placeId: string;
  name?: string;
  formattedAddress: string;
  addressComponents: PlaceAddressComponent[];
  latitude: number;
  longitude: number;
  types: string[];
  /** Google Maps permalink for the place, when Google supplies one */
  url?: string;
  rating?: number;
  userRatingsTotal?: number;
  phone?: string;
  website?: string;
  businessStatus?: string;
}

/** A place flattened to the columns an address is actually stored in. */
export interface PlaceAddress {
  placeId: string;
  formattedAddress: string;
  /** Premise or subpremise - the building, where Google names one */
  building: string;
  /** Street number and route joined, e.g. "1 Queen Street" */
  street: string;
  /** Sublocality or neighbourhood */
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface PlaceSearchOptions {
  apiKey: string;
  /**
   * Restrict results to these ISO 3166-1 alpha-2 country codes, e.g. `['nz', 'au']`.
   * Google allows at most five.
   */
  countries?: string | string[];
  /**
   * Prediction types. Defaults to `['address']`, which is what an address field
   * wants; use `['establishment']` for businesses or `['geocode']` for anything
   * Google can place on a map.
   */
  types?: string[];
}

/**
 * How long/short names are chosen when flattening a place.
 *
 * Dynamics address fields are usually short for state and country ("NSW", "AU")
 * but long for everything else, so each is switched separately.
 */
export interface PlaceAddressOptions {
  stateShortName?: boolean;
  countryShortName?: boolean;
}
