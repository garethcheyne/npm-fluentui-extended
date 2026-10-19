import * as React from 'react';
import {
  AirplaneRegular,
  BedRegular,
  BuildingBankRegular,
  BuildingGovernmentRegular,
  BuildingHomeRegular,
  BuildingRegular,
  BuildingShopRegular,
  CityRegular,
  GlobeRegular,
  HomeRegular,
  MailRegular,
  MapRegular,
  RoadRegular,
  TreeDeciduousRegular,
  VehicleBusRegular,
  VehicleSubwayRegular,
} from '@fluentui/react-icons';

/**
 * What a suggestion actually is, reduced from Google's ~100 place types to the
 * handful a person needs to tell apart at a glance in a list.
 */
export type PlaceKind =
  | 'address'
  | 'building'
  | 'street'
  | 'postcode'
  | 'locality'
  | 'region'
  | 'country'
  | 'business'
  | 'shop'
  | 'civic'
  | 'bank'
  | 'lodging'
  | 'airport'
  | 'transit'
  | 'bus'
  | 'outdoors'
  | 'place';

/**
 * Ordered most specific first, because Google returns several types per
 * prediction - an airport is also an `establishment` and a `point_of_interest`,
 * and the plane is the useful one.
 */
const KIND_BY_TYPE: Array<[PlaceKind, string[]]> = [
  ['airport', ['airport']],
  ['transit', ['transit_station', 'train_station', 'subway_station', 'light_rail_station']],
  ['bus', ['bus_station']],
  ['lodging', ['lodging']],
  ['bank', ['bank', 'atm', 'finance']],
  ['shop', ['store', 'shopping_mall', 'supermarket', 'restaurant', 'cafe', 'food']],
  [
    'civic',
    ['hospital', 'school', 'university', 'local_government_office', 'city_hall', 'courthouse'],
  ],
  ['outdoors', ['park', 'natural_feature', 'campground']],
  ['building', ['premise', 'subpremise']],
  ['address', ['street_address']],
  ['street', ['route', 'intersection']],
  ['postcode', ['postal_code']],
  ['locality', ['locality', 'sublocality', 'neighborhood', 'postal_town']],
  ['region', ['administrative_area_level_1', 'administrative_area_level_2']],
  ['country', ['country']],
  ['business', ['establishment', 'point_of_interest']],
];

/** Classify a Google prediction by its types. */
export const placeKind = (types: string[] | undefined): PlaceKind => {
  if (!types?.length) return 'place';

  for (const [kind, matches] of KIND_BY_TYPE) {
    if (types.some((type) => matches.includes(type))) return kind;
  }

  return 'place';
};

const ICONS: Record<PlaceKind, React.ReactElement> = {
  address: <HomeRegular />,
  building: <BuildingHomeRegular />,
  street: <RoadRegular />,
  postcode: <MailRegular />,
  locality: <CityRegular />,
  region: <MapRegular />,
  country: <GlobeRegular />,
  business: <BuildingRegular />,
  shop: <BuildingShopRegular />,
  civic: <BuildingGovernmentRegular />,
  bank: <BuildingBankRegular />,
  lodging: <BedRegular />,
  airport: <AirplaneRegular />,
  transit: <VehicleSubwayRegular />,
  bus: <VehicleBusRegular />,
  outdoors: <TreeDeciduousRegular />,
  place: <BuildingRegular />,
};

/** Human name for a kind, used as the icon's tooltip. */
const LABELS: Record<PlaceKind, string> = {
  address: 'Street address',
  building: 'Building',
  street: 'Street',
  postcode: 'Postcode',
  locality: 'Suburb or town',
  region: 'Region',
  country: 'Country',
  business: 'Business',
  shop: 'Shop or restaurant',
  civic: 'Civic building',
  bank: 'Bank',
  lodging: 'Accommodation',
  airport: 'Airport',
  transit: 'Train or transit station',
  bus: 'Bus station',
  outdoors: 'Park or natural feature',
  place: 'Place',
};

export const placeKindLabel = (kind: PlaceKind): string => LABELS[kind];

/** The icon for a prediction, titled so the distinction is not colour-and-shape only. */
export const placeTypeIcon = (types: string[] | undefined): React.ReactElement => {
  const kind = placeKind(types);
  return (
    <span title={LABELS[kind]} aria-label={LABELS[kind]}>
      {ICONS[kind]}
    </span>
  );
};
