import type * as React from 'react';
import type { PresenceBadgeStatus } from '@fluentui/react-components';
import type { SystemUserRecord } from '../../api/systemUser';

export type SystemUserPersonaSize = 'small' | 'medium' | 'large';

/** A contact row in the hover card's Contact section. */
export interface SystemUserContactItem {
  key: string;
  icon?: React.ReactElement;
  /** Rendered text */
  value: React.ReactNode;
  /** Makes the row a link, e.g. mailto: or tel: */
  href?: string;
}

export interface SystemUserPersonaProps {
  /** systemuser GUID. Supply this or `user` - with neither, nothing renders. */
  userId?: string;
  /**
   * Supply the record directly and skip loading. Use when a grid or lookup already
   * has the user in hand.
   */
  user?: SystemUserRecord;
  /** Overrides the name from the record */
  name?: string;
  /** Overrides the job title from the record */
  secondaryText?: React.ReactNode;
  /** Third line, e.g. business unit. Shown at `large` size only. */
  tertiaryText?: React.ReactNode;
  /**
   * Photo URL. Defaults to the user's Dynamics record photo; pass `null` to force
   * initials even when the user has one.
   */
  imageUrl?: string | null;
  /**
   * Teams presence. Dynamics does not expose this through the Web API, so it has to
   * come from the host app - omit it and no badge is shown.
   */
  presence?: PresenceBadgeStatus;
  size?: SystemUserPersonaSize;
  /** Show only the avatar, with the name in a tooltip */
  avatarOnly?: boolean;
  /**
   * Render the job title line. Defaults to true. Turn it off where the row height has
   * to be stable: a user with no job title would otherwise render one line instead of
   * two and shift everything around it.
   */
  showSecondaryText?: boolean;
  /**
   * Reveal the contact card on hover, the way a persona behaves on a Dynamics form.
   * Defaults to true.
   */
  showHoverCard?: boolean;
  /** Extra rows appended to the card's Contact section */
  additionalContact?: SystemUserContactItem[];
  /** Content rendered at the bottom of the card, e.g. an "Open record" link */
  cardActions?: React.ReactNode;
  /** Called when the persona name is clicked */
  onClick?: (user: SystemUserRecord) => void;
  /** Called when loading the user fails */
  onLoadError?: (error: Error) => void;
  className?: string;
}
