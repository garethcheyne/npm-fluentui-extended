import * as React from 'react';
import { Field, Text, mergeClasses } from '@fluentui/react-components';
import { EditRegular, LocationRegular } from '@fluentui/react-icons';
import { Lookup } from '../Lookup';
import type { LookupOption } from '../Lookup';
import {
  formatPlaceAddress,
  getPlaceDetails,
  parsePlaceAddress,
  searchPlacePredictions,
  splitUnitPrefix,
} from '../../api/googlePlaces';
import type { PlaceAddress, PlaceDetail, PlacePrediction } from '../../api/googlePlaces.types';
import { DEFAULT_FIELD_APPEARANCE } from '../../types/appearance';
import { AddressMapCard } from './AddressMapCard';
import { placeTypeIcon } from './AddressLookup.icons';
import { useAddressLookupStyles } from './AddressLookup.styles';
import type { AddressLookupProps } from './AddressLookup.types';

/** Key of the row that offers the typed text when Google finds nothing. */
const FREE_TEXT_KEY = '__fluentui-extended-free-text__';

/** The typed text as an address - street and formatted address, nothing Google would supply. */
const freeTextAddress = (text: string): PlaceAddress => ({
  placeId: '',
  formattedAddress: text,
  building: '',
  street: text,
  suburb: '',
  city: '',
  state: '',
  postcode: '',
  country: '',
  latitude: 0,
  longitude: 0,
});

/**
 * Put a unit split off the search back on the chosen address - on the street
 * line as "Level 5/135 Coronation Dr", or as the building. As the building,
 * Google's own subpremise wins when it found one.
 */
const withUnit = (
  address: PlaceAddress,
  unit: string,
  placement: AddressLookupProps['unitPlacement'],
): PlaceAddress => {
  if (!unit) return address;
  const formattedAddress = address.formattedAddress && `${unit}/${address.formattedAddress}`;

  if (placement === 'street') {
    return { ...address, street: `${unit}/${address.street}`, formattedAddress };
  }

  return address.building ? address : { ...address, building: unit, formattedAddress };
};

/** A suggestion row's data - the prediction, plus any unit split off the search for it. */
type PredictionRow = PlacePrediction & { unit: string };

// A stored value carries the address columns; a suggestion row carries a prediction
const isPlaceAddress = (data: unknown): data is PlaceAddress =>
  typeof data === 'object' && data !== null && 'street' in data;

/**
 * A Google Places address picker.
 *
 * This is a **preconfigured `Lookup`** - it owns the Places calls and the map
 * card, and hands everything else to Lookup, so an address field looks and
 * behaves like every other lookup on the form.
 *
 * Google bills per request, so the work is split the way the API prices it:
 * typing buys Autocomplete predictions only, and a place is resolved once - when
 * its card opens or when the row is chosen, whichever happens first.
 */
export const AddressLookup: React.FC<AddressLookupProps> = ({
  apiKey,
  value,
  formatValue = formatPlaceAddress,
  onSelect,
  countries,
  searchTypes,
  stateShortName = false,
  countryShortName = false,
  showMapCard = true,
  mapCardTarget = 'both',
  mapCardDelayMs = 400,
  mapZoom = 15,
  showCoordinates = true,
  showRatings = true,
  cardActions,
  placeholder = 'Start typing an address...',
  disabled,
  readOnly,
  allowFreeText = false,
  unitPlacement = 'building',
  clearable = true,
  appearance = DEFAULT_FIELD_APPEARANCE,
  size,
  label,
  validationMessage,
  required,
  minSearchLength = 3,
  searchDebounceMs = 300,
  noResultsMessage = 'No addresses found',
  header,
  footer,
  onError,
  onPredictions,
  className,
  open,
  id,
}) => {
  const styles = useAddressLookupStyles();
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  // The unit split off the query the predictions answer, put back when one is chosen
  const [searchUnit, setSearchUnit] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Kept only so the settled value keeps the icon its suggestion had
  const [selectedPlace, setSelectedPlace] = React.useState<PlaceDetail | null>(null);

  const disposedRef = React.useRef(false);
  // A slow response for "12 Qu" must not land on top of the results for "12 Queen"
  const requestRef = React.useRef(0);
  // Likewise a slow Place Details for one chosen row must not overwrite a later choice
  const selectRef = React.useRef(0);
  // Lookup's debounce can fire after the list has closed; nobody is looking then
  const openRef = React.useRef(false);

  React.useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  // Joined so a caller passing a fresh array literal each render does not refire searches
  const countriesKey = Array.isArray(countries) ? countries.join(',') : countries ?? '';
  const typesKey = searchTypes?.join(',') ?? '';

  const runSearch = React.useCallback(
    async (query: string) => {
      if (!openRef.current && !open) return;
      setSearchText(query);

      if (query.length < minSearchLength) {
        requestRef.current += 1;
        setPredictions([]);
        setLoading(false);
        return;
      }

      const requestId = ++requestRef.current;
      setLoading(true);
      setError(null);

      try {
        const { unit, street } = splitUnitPrefix(query);
        const found = await searchPlacePredictions(street || query, {
          apiKey,
          countries: countriesKey,
          types: typesKey ? typesKey.split(',') : undefined,
        });

        if (disposedRef.current || requestId !== requestRef.current) return;
        setPredictions(found);
        setSearchUnit(unit);
        onPredictions?.(found);
      } catch (err) {
        const failure = err instanceof Error ? err : new Error('Address search failed');
        onError?.(failure);
        if (disposedRef.current || requestId !== requestRef.current) return;
        setError(failure.message);
        setPredictions([]);
      } finally {
        if (!disposedRef.current && requestId === requestRef.current) setLoading(false);
      }
    },
    [apiKey, countriesKey, typesKey, minSearchLength, onError, onPredictions, open],
  );

  // Lookup empties its input on close without calling onSearchChange, so drop the
  // query here too - otherwise reopening shows the old suggestions, a free-text
  // row for text no longer in the box, and a filter change re-runs a dead search
  const handleOpenChange = React.useCallback((next: boolean) => {
    openRef.current = next;
    if (next) return;
    requestRef.current += 1;
    setSearchText('');
    setPredictions([]);
    setSearchUnit('');
    setLoading(false);
  }, []);

  // Changing the countries or types while results are showing - e.g. a "worldwide"
  // switch in the header - should refresh them, not wait for the next keystroke
  const filterKey = `${countriesKey}|${typesKey}`;
  const lastFilterKey = React.useRef(filterKey);
  React.useEffect(() => {
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    if (searchText.length >= minSearchLength) void runSearch(searchText);
  }, [filterKey, searchText, minSearchLength, runSearch]);

  const freeText = searchText.trim();
  // Offered under the suggestions too - Google can return near misses for an
  // address it does not know, and the right one may not be among them
  const offerFreeText = allowFreeText && !loading && freeText.length >= minSearchLength;

  const options = React.useMemo<LookupOption[]>(() => {
    const rows: LookupOption[] = predictions.map((prediction) => ({
      key: prediction.placeId,
      text: searchUnit ? `${searchUnit}/${prediction.mainText}` : prediction.mainText,
      secondaryText: prediction.secondaryText,
      icon: placeTypeIcon(prediction.types),
      // The unit rides on the row so the choice keeps the unit it showed
      data: { ...prediction, unit: searchUnit } satisfies PredictionRow,
    }));

    if (offerFreeText) {
      // First, so a full list of suggestions cannot scroll it out of sight;
      // nothing is highlighted until the user moves, so Enter will not pick it
      rows.unshift({
        key: FREE_TEXT_KEY,
        text: `Use "${freeText}"`,
        secondaryText: 'Keep the address as typed',
        icon: <EditRegular />,
        // Carried on the row so the choice is the text it showed, not whatever
        // the search state holds by the time the handler runs
        data: freeText,
      });
    }

    return rows;
  }, [predictions, searchUnit, offerFreeText, freeText]);

  const selectedOption = React.useMemo<LookupOption | null>(() => {
    if (!value) return null;
    // Fall back to the whole address so a value with no street (a suburb, say) still shows
    const text = formatValue(value).trim() || formatPlaceAddress(value);
    if (!text) return null;

    // A value restored from a form carries no types, and a street address is what
    // an address field almost always holds
    const types =
      selectedPlace && selectedPlace.placeId === value.placeId
        ? selectedPlace.types
        : ['street_address'];

    return {
      key: value.placeId || text,
      text,
      icon: placeTypeIcon(types),
      data: value,
    };
  }, [value, selectedPlace, formatValue]);

  const handleSelect = React.useCallback(
    (option: LookupOption | null) => {
      const selectId = ++selectRef.current;

      if (!option) {
        setSelectedPlace(null);
        onSelect?.(null, null);
        return;
      }

      if (option.key === FREE_TEXT_KEY) {
        setSelectedPlace(null);
        onSelect?.(freeTextAddress(String(option.data ?? '')), null);
        return;
      }

      const unit = (option.data as PredictionRow | undefined)?.unit ?? '';

      // Cached when the row's card was hovered, so this is usually free
      getPlaceDetails(option.key, apiKey)
        .then((place: PlaceDetail) => {
          if (selectId !== selectRef.current) return;
          if (!disposedRef.current) setSelectedPlace(place);
          const address = parsePlaceAddress(place, { stateShortName, countryShortName });
          onSelect?.(withUnit(address, unit, unitPlacement), place);
        })
        .catch((err: unknown) => {
          const failure = err instanceof Error ? err : new Error('Could not load the address');
          onError?.(failure);
          if (disposedRef.current || selectId !== selectRef.current) return;
          setError(failure.message);
        });
    },
    [apiKey, stateShortName, countryShortName, unitPlacement, onSelect, onError],
  );

  const renderHoverCard = React.useCallback(
    (option: LookupOption) => {
      if (option.key === FREE_TEXT_KEY) return null;

      // A value restored from a form may have no place id - the card then maps it
      // from its stored coordinates, or geocodes its address text
      const address = isPlaceAddress(option.data) ? option.data : undefined;
      const placeId = (option.data as { placeId?: string } | undefined)?.placeId;
      if (!placeId && !address) return null;

      return (
        <AddressMapCard
          placeId={placeId}
          address={address}
          apiKey={apiKey}
          mapZoom={mapZoom}
          showCoordinates={showCoordinates}
          showRatings={showRatings}
          actions={cardActions}
          onError={onError}
        />
      );
    },
    [apiKey, mapZoom, showCoordinates, showRatings, cardActions, onError],
  );

  const defaultHeader = (
    <span className={styles.header}>
      <LocationRegular /> Google address search
    </span>
  );

  // Google's terms require the attribution wherever Places results are shown without a map
  const defaultFooter =
    searchText.length < minSearchLength
      ? `Type at least ${minSearchLength} characters`
      : `${predictions.length} suggestion${predictions.length === 1 ? '' : 's'} · Powered by Google`;

  const control = (
    <Lookup
      id={id}
      appearance={appearance}
      size={size}
      options={options}
      selectedOption={selectedOption}
      onOptionSelect={handleSelect}
      onSearchChange={runSearch}
      loading={loading}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      // A chosen address reads as text, not a record reference
      searchIcon="whenEmpty"
      clearable={clearable}
      // Lookup withholds onSearchChange below its own threshold, which would
      // leave stale suggestions on screen when the query is deleted back down;
      // the request threshold is enforced in runSearch instead
      minSearchLength={0}
      searchDebounceMs={searchDebounceMs}
      noResultsMessage={noResultsMessage}
      header={header === undefined ? defaultHeader : header}
      footer={footer === undefined ? defaultFooter : footer}
      open={open}
      onOpenChange={handleOpenChange}
      showHoverCard={showMapCard}
      hoverCardTarget={mapCardTarget}
      hoverCardDelayMs={mapCardDelayMs}
      renderHoverCard={showMapCard ? renderHoverCard : undefined}
      // Google has already ranked and filtered the predictions; matching them
      // against the raw input would drop "572 Kessels Rd" for "572-588 Kessels Road"
      disableClientFilter
      // A stored address is usually corrected, not replaced - Backspace hands it back as text
      editSelectionOnBackspace
    />
  );

  const body = (
    <>
      {control}
      {error && <Text className={styles.errorText}>{error}</Text>}
    </>
  );

  if (!label && !validationMessage) {
    return <div className={mergeClasses(styles.root, className)}>{body}</div>;
  }

  return (
    <Field
      className={mergeClasses(styles.root, className)}
      label={label}
      validationMessage={validationMessage}
      required={required}
    >
      {body}
    </Field>
  );
};
