import * as React from 'react';
import {
  Avatar,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  Tooltip,
  mergeClasses,
} from '@fluentui/react-components';
import { getSystemUser, initialsOf, systemUserImageUrl } from '../../api/systemUser';
import type { SystemUserRecord } from '../../api/systemUser';
import { SystemUserCard } from './SystemUserCard';
import { useSystemUserPersonaStyles } from './SystemUserPersona.styles';
import type { SystemUserPersonaProps, SystemUserPersonaSize } from './SystemUserPersona.types';

/** Avatar pixel sizes per persona size, from the Fluent avatar scale. */
const AVATAR_SIZE: Record<SystemUserPersonaSize, 24 | 32 | 40> = {
  small: 24,
  medium: 32,
  large: 40,
};

/**
 * A Dynamics 365 systemuser persona.
 *
 * Fluent's `Persona` renders whatever you hand it; this one knows how to fetch a user,
 * where their record photo lives, and what a Dynamics persona flyout contains. Loading
 * is deferred until the pointer settles on the persona, so a grid column of them costs
 * one request per card actually looked at rather than one per row.
 */
export const SystemUserPersona: React.FC<SystemUserPersonaProps> = ({
  userId,
  user: providedUser,
  name,
  secondaryText,
  tertiaryText,
  imageUrl,
  presence,
  size = 'medium',
  avatarOnly = false,
  showSecondaryText = true,
  showHoverCard = true,
  additionalContact,
  cardActions,
  onClick,
  onLoadError,
  className,
}) => {
  const styles = useSystemUserPersonaStyles();
  const [user, setUser] = React.useState<SystemUserRecord | null>(providedUser ?? null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const loadedRef = React.useRef(false);
  const disposedRef = React.useRef(false);

  React.useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  // A different user on the same slot invalidates whatever was cached
  React.useEffect(() => {
    loadedRef.current = false;
    setUser(providedUser ?? null);
    setError(null);
  }, [userId, providedUser]);

  const effectiveId = providedUser?.systemuserid ?? userId;

  const loadUser = React.useCallback(async () => {
    if (providedUser || loadedRef.current || !userId) return;

    loadedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const record = await getSystemUser(userId);
      if (!disposedRef.current) setUser(record);
    } catch (err) {
      if (disposedRef.current) return;
      // Allow a retry on the next hover rather than caching the failure
      loadedRef.current = false;
      const failure = err instanceof Error ? err : new Error('Failed to load user');
      setError(failure.message);
      onLoadError?.(failure);
    } finally {
      if (!disposedRef.current) setLoading(false);
    }
  }, [providedUser, userId, onLoadError]);

  const displayName = name ?? user?.fullname ?? '';
  const displaySecondary = secondaryText ?? user?.jobtitle ?? undefined;
  const displayTertiary = tertiaryText ?? user?.businessUnit ?? undefined;

  // `null` is an explicit opt-out; `undefined` means "derive it from the record"
  const resolvedImage =
    imageUrl === null ? undefined : imageUrl ?? (effectiveId ? systemUserImageUrl(effectiveId) : undefined);

  const avatar = (
    <Avatar
      size={AVATAR_SIZE[size]}
      name={displayName || undefined}
      initials={initialsOf(displayName)}
      image={resolvedImage ? { src: resolvedImage } : undefined}
      badge={presence ? { status: presence } : undefined}
    />
  );

  const persona = (
    <span className={mergeClasses(styles.root, className)}>
      {avatar}
      {!avatarOnly && (
        <span className={styles.text}>
          <Text
            weight="regular"
            className={mergeClasses(styles.name, onClick && styles.nameClickable)}
            onClick={onClick && user ? () => onClick(user) : undefined}
          >
            {displayName || 'Unnamed user'}
          </Text>
          {showSecondaryText && displaySecondary && (
            <Text className={styles.secondary}>{displaySecondary}</Text>
          )}
          {size === 'large' && displayTertiary && <Text className={styles.tertiary}>{displayTertiary}</Text>}
        </span>
      )}
    </span>
  );

  // With the label hidden the avatar needs an accessible name from somewhere
  const anchor =
    avatarOnly && displayName ? (
      <Tooltip content={displayName} relationship="label" withArrow>
        {persona}
      </Tooltip>
    ) : (
      persona
    );

  if (!showHoverCard) return anchor;

  return (
    <Popover
      open={open}
      onOpenChange={(_, data) => {
        setOpen(data.open);
        if (data.open) void loadUser();
      }}
      openOnHover
      mouseLeaveDelay={250}
      withArrow
      positioning="below-start"
    >
      <PopoverTrigger disableButtonEnhancement>{anchor}</PopoverTrigger>
      <PopoverSurface className={styles.cardSurface}>
        <SystemUserCard
          user={user}
          loading={loading}
          error={error}
          imageUrl={resolvedImage}
          presence={presence}
          additionalContact={additionalContact}
          actions={cardActions}
        />
      </PopoverSurface>
    </Popover>
  );
};
