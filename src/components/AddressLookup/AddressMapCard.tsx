import * as React from 'react';
import { Link, Spinner, Text, mergeClasses } from '@fluentui/react-components';
import { ErrorCircleRegular, OpenRegular, StarFilled } from '@fluentui/react-icons';
import {
  formatPlaceAddress,
  isGoogleMapsReady,
  parsePlaceAddress,
  placeFromAddress,
  placeMapUrl,
  resolvePlace,
} from '../../api/googlePlaces';
import type { PlaceAddress } from '../../api/googlePlaces.types';
import type { PlaceDetail } from '../../api/googlePlaces.types';
import { placeTypeIcon } from './AddressLookup.icons';
import { useAddressMapCardStyles } from './AddressLookup.styles';
import type { AddressMapCardProps } from './AddressLookup.types';

// Free-text and cleared addresses carry 0,0 rather than coordinates
const hasCoordinates = (point: Pick<PlaceAddress, 'latitude' | 'longitude'>): boolean =>
  Boolean(point.latitude || point.longitude);

/**
 * A map and summary for a Google place.
 *
 * Everything here is deliberately mount-triggered rather than render-triggered:
 * the card is built by `AddressLookup` for every suggestion, but only mounted
 * when a popover actually opens, so the Place Details call and the map instance
 * belong to the one row the user paused on.
 */
export const AddressMapCard: React.FC<AddressMapCardProps> = ({
  placeId,
  address,
  apiKey,
  place: providedPlace,
  mapZoom = 15,
  showCoordinates = true,
  showRatings = true,
  actions,
  onError,
}) => {
  const styles = useAddressMapCardStyles();
  const [place, setPlace] = React.useState<PlaceDetail | null>(providedPlace ?? null);
  const [loading, setLoading] = React.useState(!providedPlace);
  const [error, setError] = React.useState<string | null>(null);
  const [mapReady, setMapReady] = React.useState(false);

  const mapNode = React.useRef<HTMLDivElement>(null);
  const mapInstance = React.useRef<any>(null);
  const disposedRef = React.useRef(false);

  React.useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  // Keyed on the values, not the object - a caller building `address` inline would
  // otherwise refetch on every render
  const addressKey = address
    ? [address.placeId, address.formattedAddress, address.building, address.street, address.suburb,
        address.city, address.state, address.postcode, address.country, address.latitude, address.longitude].join('|')
    : '';
  const addressRef = React.useRef(address);
  addressRef.current = address;
  // Same for onError: an inline handler that sets state would otherwise refetch,
  // fail, set state and refetch again - a billed loop when the address is unknown
  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;

  React.useEffect(() => {
    if (providedPlace) {
      setPlace(providedPlace);
      setLoading(false);
      return;
    }

    const stored = addressRef.current;
    const storedPlace = stored && formatPlaceAddress(stored) ? placeFromAddress(stored) : null;
    setMapReady(false);

    // An address kept as typed has no place id or coordinates. Geocoding its text
    // finds whichever match Google likes best - "125 John Street" lands in Toronto -
    // so the card shows what was stored and nothing more
    if (storedPlace && !placeId && !stored?.placeId && !hasCoordinates(storedPlace)) {
      setPlace(storedPlace);
      setError(null);
      setLoading(false);
      return;
    }

    // Per run, so an answer for the previous place cannot land on this one
    let current = true;
    setLoading(true);
    setError(null);

    resolvePlace({ placeId, address: stored }, apiKey)
      .then((detail) => {
        if (!current || disposedRef.current) return;
        setPlace(detail);
      })
      .catch((err: unknown) => {
        const failure = err instanceof Error ? err : new Error('Could not load place details');
        onErrorRef.current?.(failure);
        if (!current || disposedRef.current) return;
        // The stored address is still worth showing when Google cannot find it
        if (storedPlace) setPlace(storedPlace);
        else setError(failure.message);
      })
      .finally(() => {
        if (current && !disposedRef.current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [placeId, addressKey, apiKey, providedPlace]);

  const located = Boolean(place && hasCoordinates(place));

  // `loading` is a dependency because the map node only exists once the spinner
  // is gone. React 18 batches setPlace and setLoading(false) into one render, but
  // React 16 (the PCF platform's React) renders twice - and the first render,
  // with the spinner still up, would otherwise be the only time this runs.
  React.useEffect(() => {
    if (loading || !place || !located || !mapNode.current || !isGoogleMapsReady()) return;

    const node = mapNode.current;
    const maps = window.google.maps;
    const center = { lat: place.latitude, lng: place.longitude };

    const map = new maps.Map(node, {
      center,
      zoom: mapZoom,
      mapTypeId: maps.MapTypeId.ROADMAP,
      // A card is a summary, not a map viewer - panning it steals the scroll
      disableDefaultUI: true,
      zoomControl: true,
      scrollwheel: false,
      draggable: false,
      keyboardShortcuts: false,
    });

    mapInstance.current = map;

    maps.event.addListenerOnce(map, 'idle', () => {
      if (!disposedRef.current) setMapReady(true);
    });

    new maps.Marker({
      position: center,
      map,
      title: place.name || place.formattedAddress,
    });

    return () => {
      maps.event.clearInstanceListeners(map);
      mapInstance.current = null;
      node.innerHTML = '';
    };
  }, [loading, place, located, mapZoom]);

  if (loading) {
    return (
      <div className={styles.state}>
        <Spinner size="tiny" label="Loading place details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={mergeClasses(styles.state, styles.errorState)}>
        <ErrorCircleRegular />
        <Text size={200}>{error}</Text>
      </div>
    );
  }

  if (!place) return null;

  const parsed = parsePlaceAddress(place);
  const rows: Array<[string, string]> = [
    ['Street', parsed.street],
    ['Suburb', parsed.suburb],
    ['City', parsed.city],
    ['State', parsed.state],
    ['Postcode', parsed.postcode],
    ['Country', parsed.country],
  ];

  return (
    <div className={styles.card}>
      {/* No coordinates means nowhere to put a pin - leave the map out rather than show an empty one */}
      {located && (
        <div className={styles.map}>
          <div ref={mapNode} className={styles.mapCanvas} />
          {!mapReady && (
            <div className={styles.mapOverlay}>
              <Spinner size="tiny" label="Loading map..." />
            </div>
          )}
        </div>
      )}

      {place.name && place.name !== place.formattedAddress && (
        <Text weight="semibold" className={styles.title}>
          {place.name}
        </Text>
      )}

      <div className={styles.address}>
        <span className={styles.addressIcon}>{placeTypeIcon(place.types)}</span>
        <Text>{place.formattedAddress}</Text>
      </div>

      <div className={styles.details}>
        {rows
          .filter(([, value]) => Boolean(value))
          .map(([label, value]) => (
            <React.Fragment key={label}>
              <Text className={styles.detailLabel}>{label}</Text>
              <Text className={styles.detailValue}>{value}</Text>
            </React.Fragment>
          ))}
      </div>

      {!place.placeId && !located && (
        <Text size={200} className={styles.meta}>
          Kept as typed - not matched to a Google address
        </Text>
      )}

      {((showCoordinates && located) || (showRatings && place.rating)) && (
        <div className={styles.meta}>
          {showRatings && place.rating && (
            <span className={styles.rating}>
              <StarFilled className={styles.ratingIcon} />
              <Text size={200}>
                {place.rating.toFixed(1)}
                {place.userRatingsTotal ? ` (${place.userRatingsTotal})` : ''}
              </Text>
            </span>
          )}
          {showCoordinates && located && (
            <Text size={200}>
              {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
            </Text>
          )}
        </div>
      )}

      {/* Unlocated, the link would only search Google Maps for the text - the same wrong guess */}
      {(located || place.placeId || actions) && (
        <div className={styles.footer}>
          {(located || place.placeId) && (
            <Link href={placeMapUrl(place)} target="_blank" rel="noreferrer">
              <OpenRegular /> View on Google Maps
            </Link>
          )}
          {actions}
        </div>
      )}
    </div>
  );
};
