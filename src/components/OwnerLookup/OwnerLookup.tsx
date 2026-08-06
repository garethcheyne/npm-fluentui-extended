import * as React from 'react';
import { Avatar, Field, Text, ToggleButton, mergeClasses } from '@fluentui/react-components';
import { PeopleTeamRegular, PersonRegular } from '@fluentui/react-icons';
import { Lookup } from '../Lookup';
import type { LookupOption } from '../Lookup';
import { SystemUserCard } from '../SystemUserPersona';
import { searchOwners } from '../../api/owner';
import type { OwnerRecord, OwnerType } from '../../api/owner';
import { initialsOf, systemUserImageUrl } from '../../api/systemUser';
import type { SystemUserRecord } from '../../api/systemUser';
import { DEFAULT_FIELD_APPEARANCE } from '../../types/appearance';
import { useOwnerLookupStyles } from './OwnerLookup.styles';
import type { OwnerLookupProps } from './OwnerLookup.types';

/** Re-hydrate the systemuser shape the contact card renders from. */
const toUserRecord = (owner: OwnerRecord): SystemUserRecord => ({
  systemuserid: owner.id,
  fullname: owner.name,
  jobtitle: owner.jobtitle ?? null,
  internalemailaddress: owner.email ?? null,
  mobilephone: owner.mobile ?? null,
  address1_telephone1: owner.phone ?? null,
  address1_composite: owner.address ?? null,
  title: owner.jobtitle ?? null,
  isdisabled: owner.isdisabled,
  businessUnit: owner.businessUnit ?? null,
});

/**
 * A Dynamics 365 owner picker.
 *
 * This is a **preconfigured `Lookup`** - it owns the querying and the presentation of
 * owners, and hands everything else to Lookup, so the resolved value renders as the
 * same badge any lookup uses and multi-select comes for free.
 *
 * `ownerid` is polymorphic: an owner is a systemuser *or* a team. Both are searched
 * and marked, users carrying the contact card they show on a form and teams their own
 * summary.
 */
export const OwnerLookup: React.FC<OwnerLookupProps> = ({
  selectedOwner,
  onOwnerSelect,
  selectedOwners,
  onOwnersSelect,
  multiSelect = false,
  maxSelection,
  types = ['systemuser'],
  owners: providedOwners,
  onSearch,
  searchTop = 15,
  includeDisabled = false,
  presence,
  showHoverCard = true,
  additionalContact,
  cardActions,
  onOwnerClick,
  placeholder = 'Search users and teams...',
  disabled,
  clearable = true,
  appearance = DEFAULT_FIELD_APPEARANCE,
  size,
  label,
  validationMessage,
  required,
  minSearchLength = 0,
  searchDebounceMs = 300,
  noResultsMessage = 'No users or teams found',
  onSearchError,
  className,
  open,
}) => {
  const styles = useOwnerLookupStyles();
  const [results, setResults] = React.useState<OwnerRecord[]>(providedOwners ?? []);
  const [loading, setLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const disposedRef = React.useRef(false);
  React.useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  React.useEffect(() => {
    if (providedOwners) setResults(providedOwners);
  }, [providedOwners]);

  // Joined so a caller passing a fresh array literal each render does not refire searches
  const typesKey = types.join(',');

  /**
   * With both owner types in play the lookup offers a filter, mirroring how a
   * polymorphic Dynamics lookup lets you narrow to Users or Teams. With one type
   * there is nothing to choose, so no header is rendered at all.
   */
  const isPolymorphic = types.includes('systemuser') && types.includes('team');
  const [activeType, setActiveType] = React.useState<OwnerType | 'all'>('all');

  // A caller narrowing `types` invalidates a filter that is no longer offered
  React.useEffect(() => {
    setActiveType('all');
  }, [typesKey]);

  const runSearch = React.useCallback(
    async (searchText: string) => {
      // A caller-supplied roster is filtered by Lookup itself; no request to make
      if (providedOwners && !onSearch) return;

      setLoading(true);
      setSearchError(null);

      try {
        const found = onSearch
          ? await onSearch(searchText)
          : await searchOwners(searchText, {
              types: typesKey.split(',') as OwnerType[],
              top: searchTop,
              includeDisabled,
            });
        if (!disposedRef.current) setResults(found);
      } catch (err) {
        if (disposedRef.current) return;
        const failure = err instanceof Error ? err : new Error('Owner search failed');
        setSearchError(failure.message);
        setResults([]);
        onSearchError?.(failure);
      } finally {
        if (!disposedRef.current) setLoading(false);
      }
    },
    [providedOwners, onSearch, typesKey, searchTop, includeDisabled, onSearchError],
  );

  /** Users get their photo and presence; teams get a square glyph avatar. */
  const avatarFor = React.useCallback(
    (owner: OwnerRecord) =>
      owner.type === 'team' ? (
        // No `name`: Fluent derives initials from it and shows those in preference to
        // the icon, which would hide the glyph that distinguishes a team from a person
        <Avatar size={20} icon={<PeopleTeamRegular />} shape="square" color="neutral" aria-label={owner.name} />
      ) : (
        <Avatar
          size={20}
          name={owner.name}
          initials={initialsOf(owner.name)}
          image={{ src: systemUserImageUrl(owner.id) }}
          badge={presence?.[owner.id] ? { status: presence[owner.id] } : undefined}
        />
      ),
    [presence],
  );

  const toOption = React.useCallback(
    (owner: OwnerRecord): LookupOption => ({
      key: owner.id,
      text: owner.name,
      // Keeps titles and emails matchable by Lookup's client-side filter
      searchFields: [owner.jobtitle, owner.email, owner.type === 'team' ? 'team' : 'user']
        .filter(Boolean)
        .join(' '),
      icon: avatarFor(owner),
      secondaryText: owner.type === 'team' ? owner.description || 'Team' : owner.jobtitle ?? undefined,
      // Lets Lookup's hover card address the record, though the card body below is
      // supplied directly since an owner card is richer than a column list
      entityName: owner.type,
      recordId: owner.id,
      data: owner,
    }),
    [avatarFor],
  );

  const options = React.useMemo(
    () =>
      results
        .filter((owner) => activeType === 'all' || owner.type === activeType)
        .map(toOption),
    [results, toOption, activeType],
  );

  const typeFilterHeader = isPolymorphic ? (
    <div className={styles.typeFilter}>
      {([
        ['all', 'All', undefined],
        ['systemuser', 'Users', <PersonRegular key="u" />],
        ['team', 'Teams', <PeopleTeamRegular key="t" />],
      ] as const).map(([value, text, icon]) => (
        <ToggleButton
          key={value}
          size="small"
          appearance="subtle"
          icon={icon}
          checked={activeType === value}
          // The dropdown closes on blur, so the press must not steal focus
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setActiveType(value as OwnerType | 'all')}
        >
          {text}
        </ToggleButton>
      ))}
    </div>
  ) : undefined;

  const selectedOption = React.useMemo(
    () => (selectedOwner ? toOption(selectedOwner) : null),
    [selectedOwner, toOption],
  );

  const selectedOptionList = React.useMemo(
    () => (selectedOwners ?? []).map(toOption),
    [selectedOwners, toOption],
  );

  /** The contact card. Users get the full persona card; teams a short summary. */
  const renderHoverCard = React.useCallback(
    (option: LookupOption) => {
      const owner = option.data as OwnerRecord | undefined;
      if (!owner) return null;

      if (owner.type === 'team') {
        return (
          <div className={styles.teamCard}>
            <Text weight="semibold" className={styles.teamCardName}>
              {owner.name}
            </Text>
            {owner.description && <Text className={styles.teamCardLine}>{owner.description}</Text>}
            {owner.businessUnit && (
              <Text className={styles.teamCardLine}>Business unit: {owner.businessUnit}</Text>
            )}
            {owner.administrator && (
              <Text className={styles.teamCardLine}>Administrator: {owner.administrator}</Text>
            )}
            {owner.email && <Text className={styles.teamCardLine}>{owner.email}</Text>}
            {cardActions && <div className={styles.teamCardActions}>{cardActions}</div>}
          </div>
        );
      }

      return (
        <SystemUserCard
          user={toUserRecord(owner)}
          loading={false}
          error={null}
          imageUrl={systemUserImageUrl(owner.id)}
          presence={presence?.[owner.id]}
          additionalContact={additionalContact}
          actions={cardActions}
        />
      );
    },
    [styles, presence, additionalContact, cardActions],
  );

  const control = (
    <Lookup
      appearance={appearance}
      size={size}
      options={options}
      multiSelect={multiSelect}
      maxSelection={maxSelection}
      selectedOption={multiSelect ? undefined : selectedOption}
      selectedOptions={multiSelect ? selectedOptionList : undefined}
      onOptionSelect={(option) => onOwnerSelect?.((option?.data as OwnerRecord) ?? null)}
      onOptionsSelect={(opts) => onOwnersSelect?.(opts.map((o) => o.data as OwnerRecord))}
      onSearchChange={runSearch}
      onFocus={() => {
        if (results.length === 0) void runSearch('');
      }}
      loading={loading}
      placeholder={placeholder}
      disabled={disabled}
      clearable={clearable}
      minSearchLength={minSearchLength}
      searchDebounceMs={searchDebounceMs}
      noResultsMessage={noResultsMessage}
      header={typeFilterHeader}
      open={open}
      onRecordClick={onOwnerClick ? (option) => onOwnerClick(option.data as OwnerRecord) : undefined}
      showHoverCard={showHoverCard}
      renderHoverCard={renderHoverCard}
      hoverCardActions={cardActions}
      disableClientFilter={!providedOwners}
    />
  );

  const body = (
    <>
      {control}
      {searchError && <Text className={styles.errorText}>{searchError}</Text>}
    </>
  );

  if (!label && !validationMessage) {
    return <div className={mergeClasses(styles.root, className)}>{body}</div>;
  }

  return (
    <Field
      className={mergeClasses(styles.root, className)}
      label={label}
      required={required}
      validationMessage={validationMessage}
    >
      {body}
    </Field>
  );
};
