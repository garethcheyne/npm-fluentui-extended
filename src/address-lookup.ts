/**
 * `fluentui-extended/address-lookup` - the address picker on its own.
 *
 * The root entry is one bundle that imports every peer at the top, so a consumer
 * after just the address picker would have to install - and a bundler resolve -
 * the grid, drag-and-drop and date picker peers too. This entry reaches only
 * Lookup, Fluent and the icons. Built for PCF controls, where Fluent comes from
 * the platform and everything else is shipped in the control's own bundle.
 */
export { AddressLookup, AddressMapCard, placeKind, placeKindLabel, placeTypeIcon } from './components/AddressLookup';
export type { AddressLookupProps, AddressMapCardProps, PlaceKind } from './components/AddressLookup';

export {
  loadGoogleMaps,
  isGoogleMapsReady,
  searchPlacePredictions,
  getPlaceDetails,
  parsePlaceAddress,
  placeMapUrl,
  clearPlacesCache,
  formatPlaceAddress,
  geocodeAddress,
  reverseGeocode,
  placeFromAddress,
  resolvePlace,
} from './api/googlePlaces';
export type {
  PlaceAddress,
  PlaceAddressComponent,
  PlaceAddressOptions,
  PlaceDetail,
  PlacePrediction,
  PlaceSearchOptions,
} from './api/googlePlaces.types';
