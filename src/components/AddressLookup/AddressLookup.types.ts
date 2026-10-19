import type * as React from 'react';
import type { PlaceAddress, PlaceDetail, PlacePrediction } from '../../api/googlePlaces.types';
import type { FieldAppearance } from '../../types/appearance';

export interface AddressLookupProps {
  /**
   * Google Maps API key, with the Maps JavaScript API and Places API enabled and
   * the host's origin allowed under the key's HTTP referrer restrictions.
   */
  apiKey: string;
  /** Selected address. Controlled - pair with `onSelect`. */
  value?: PlaceAddress | null;
  /**
   * The text shown for the selected address. Defaults to the whole address on
   * one line; return just `address.street` for a street field that sits above
   * separate suburb, city and postcode fields. The map card still shows it all.
   */
  formatValue?: (address: PlaceAddress) => string;
  /**
   * Called with the chosen address flattened to form columns, and the place it
   * came from, or `(null, null)` when cleared.
   */
  onSelect?: (address: PlaceAddress | null, place: PlaceDetail | null) => void;
  /**
   * Restrict results to these ISO 3166-1 alpha-2 country codes, e.g. `['nz', 'au']`.
   * Google allows at most five.
   */
  countries?: string | string[];
  /**
   * Prediction types. Defaults to `['address']`; use `['establishment']` for
   * businesses or `['geocode']` for anything Google can place on a map.
   */
  searchTypes?: string[];
  /** Return the state as its abbreviation, e.g. "NSW". Defaults to false. */
  stateShortName?: boolean;
  /** Return the country as its code, e.g. "AU". Defaults to false. */
  countryShortName?: boolean;

  // ── Map card ────────────────────────────────────────────────────────────────

  /**
   * Reveal a card with a map when the pointer settles on a suggestion. Defaults
   * to true.
   *
   * The place behind a row is not resolved until its card opens, so a list of
   * suggestions costs nothing until one is hovered, and the place resolved for
   * the card is reused when that row is chosen.
   */
  showMapCard?: boolean;
  /** Where the card is offered: the suggestion list, the resolved value, or both. */
  mapCardTarget?: 'list' | 'rest' | 'both';
  /** Delay before a hover opens the card and resolves the place. Defaults to 400ms. */
  mapCardDelayMs?: number;
  /** Map zoom on the card. Defaults to 15. */
  mapZoom?: number;
  /** List the coordinates on the card. Defaults to true. */
  showCoordinates?: boolean;
  /** Show the rating and review count, where the place has them. Defaults to true. */
  showRatings?: boolean;
  /** Content rendered at the bottom of the card, e.g. a "Use this address" button */
  cardActions?: React.ReactNode;

  // ── Presentation ────────────────────────────────────────────────────────────

  placeholder?: string;
  disabled?: boolean;
  /**
   * Show the address without a way to change it - the text stays at full
   * contrast and the map card is still offered, the way Dynamics shows a field
   * the user cannot edit. Prefer it to `disabled` for a locked field.
   */
  readOnly?: boolean;
  /**
   * Offer the typed text as an address, above any suggestions, for addresses
   * Google does not know. The text is returned as the street and the formatted
   * address, with no place id or coordinates. Defaults to false.
   */
  allowFreeText?: boolean;
  /**
   * Where a unit or level typed before the street number ("Level 5/135
   * Coronation Dr") goes on the chosen address. Google is searched without it,
   * since it rarely matches with one. `street` keeps it on the street line as
   * "Level 5/135 Coronation Dr"; `building` puts it in the building, unless
   * Google returned one. Defaults to `building`.
   */
  unitPlacement?: 'building' | 'street';
  /** Allow clearing the selection. Defaults to true. */
  clearable?: boolean;
  /** See Appearance. Defaults to `filled-darker`. */
  appearance?: FieldAppearance;
  size?: 'small' | 'medium';
  /** Label rendered above the control */
  label?: string | React.ReactElement;
  /** Validation message rendered below the control */
  validationMessage?: string | React.ReactElement;
  required?: boolean;
  /**
   * Minimum characters before a search fires. Defaults to 3 - Google charges per
   * request and one or two characters cannot say much about an address.
   */
  minSearchLength?: number;
  /** Debounce for the search in ms. Defaults to 300. */
  searchDebounceMs?: number;
  /** Message shown when a search returns nothing */
  noResultsMessage?: string;
  /** Replace the dropdown header. Pass `null` to remove it. */
  header?: React.ReactNode;
  /**
   * Replace the dropdown footer, which otherwise counts the suggestions and says
   * "Powered by Google". Google's terms require that attribution wherever Places
   * results are shown without a map, so keep it in a replacement. Pass `null` to
   * remove the footer.
   */
  footer?: React.ReactNode;
  /** Called when a search or a place lookup fails */
  onError?: (error: Error) => void;
  /** Observe the raw predictions, e.g. to log what Google offered */
  onPredictions?: (predictions: PlacePrediction[]) => void;
  className?: string;
  /** Force the dropdown open. Mainly for documentation captures and tests. */
  open?: boolean;
  id?: string;
}

export interface AddressMapCardProps {
  /** The place to show. Optional when `address` is given. */
  placeId?: string;
  /**
   * A stored address to show instead of, or as a fallback for, a place id - for
   * records saved without one. Its coordinates are used as they are; without
   * them the address text is geocoded, which needs the Geocoding API on the key.
   */
  address?: Partial<PlaceAddress> | null;
  apiKey: string;
  /** Skip the fetch when the place is already resolved */
  place?: PlaceDetail | null;
  mapZoom?: number;
  showCoordinates?: boolean;
  showRatings?: boolean;
  actions?: React.ReactNode;
  onError?: (error: Error) => void;
}
