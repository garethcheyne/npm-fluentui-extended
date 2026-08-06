import type * as React from 'react';
import type { PresenceBadgeStatus } from '@fluentui/react-components';
import type { OwnerRecord, OwnerType } from '../../api/owner';
import type { FieldAppearance } from '../../types/appearance';
import type { SystemUserContactItem } from '../SystemUserPersona/SystemUserPersona.types';

export interface OwnerLookupProps {
  /** Selected owner. Controlled - pair with `onOwnerSelect`. */
  selectedOwner?: OwnerRecord | null;
  /** Called with the chosen owner, or null when cleared */
  onOwnerSelect?: (owner: OwnerRecord | null) => void;
  /**
   * Enable multi-select. Selections render as badges, exactly as they do on any
   * multi-select Lookup. Pair with `selectedOwners` and `onOwnersSelect`.
   */
  multiSelect?: boolean;
  /** Selected owners in multi-select mode (controlled) */
  selectedOwners?: OwnerRecord[];
  /** Called with the full selection in multi-select mode */
  onOwnersSelect?: (owners: OwnerRecord[]) => void;
  /** Maximum selections in multi-select mode. Omit for unlimited. */
  maxSelection?: number;
  /** Input size, passed through to Lookup */
  size?: 'small' | 'medium';
  /**
   * Which owner types to offer. Defaults to `['systemuser']`.
   *
   * Pass both and the lookup grows a header letting the user switch between Users and
   * Teams, the way a polymorphic Dynamics lookup does - no extra wiring needed.
   */
  types?: OwnerType[];
  /**
   * Supply owners instead of querying. Use for tests, or when the host app already
   * has a roster in memory.
   */
  owners?: OwnerRecord[];
  /** Custom search, replacing the built-in systemusers/teams queries */
  onSearch?: (searchText: string) => Promise<OwnerRecord[]> | OwnerRecord[];
  /** Maximum results per type. Defaults to 15. */
  searchTop?: number;
  /** Include disabled user accounts. Defaults to false. */
  includeDisabled?: boolean;
  /**
   * Presence per owner id. Dynamics does not expose Teams presence through the Web
   * API, so the host app has to supply it. Ignored for team owners.
   */
  presence?: Record<string, PresenceBadgeStatus>;
  /** Show the contact card when hovering the resolved owner. Defaults to true. */
  showHoverCard?: boolean;
  /** Extra rows appended to the hover card's Contact section */
  additionalContact?: SystemUserContactItem[];
  /** Content rendered at the bottom of the hover card */
  cardActions?: React.ReactNode;
  /** Called when the resolved owner's name is clicked - use it to open the record */
  onOwnerClick?: (owner: OwnerRecord) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Allow clearing the selection. Defaults to true. */
  clearable?: boolean;
  /** See Appearance. Defaults to `filled-darker`. */
  appearance?: FieldAppearance;
  /** Label rendered above the control */
  label?: string | React.ReactElement;
  /** Validation message rendered below the control */
  validationMessage?: string | React.ReactElement;
  required?: boolean;
  /** Minimum characters before a search fires. Defaults to 0 (search on focus). */
  minSearchLength?: number;
  /** Debounce for the search in ms. Defaults to 300. */
  searchDebounceMs?: number;
  /** Message shown when a search returns nothing */
  noResultsMessage?: string;
  /** Called when a search fails */
  onSearchError?: (error: Error) => void;
  className?: string;
  /** Force the dropdown open. Mainly for documentation captures and tests. */
  open?: boolean;
}
