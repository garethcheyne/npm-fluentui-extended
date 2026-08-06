import * as React from 'react';
import { Avatar, Badge, Link, PresenceBadgeStatus, Spinner, Text } from '@fluentui/react-components';
import {
  BuildingRegular,
  CallRegular,
  ChevronRightRegular,
  MailRegular,
  PhoneRegular,
} from '@fluentui/react-icons';
import { initialsOf } from '../../api/systemUser';
import type { SystemUserRecord } from '../../api/systemUser';
import { useSystemUserPersonaStyles } from './SystemUserPersona.styles';
import type { SystemUserContactItem } from './SystemUserPersona.types';

export interface SystemUserCardProps {
  user: SystemUserRecord | null;
  loading: boolean;
  error: string | null;
  imageUrl?: string | null;
  presence?: PresenceBadgeStatus;
  additionalContact?: SystemUserContactItem[];
  actions?: React.ReactNode;
}

/**
 * The contact card body, modelled on the persona flyout in Dynamics: identity at the
 * top, then a Contact section of actionable rows. Rows with no value are dropped
 * rather than rendered blank - a card of empty labels reads as broken.
 */
export const SystemUserCard: React.FC<SystemUserCardProps> = ({
  user,
  loading,
  error,
  imageUrl,
  presence,
  additionalContact,
  actions,
}) => {
  const styles = useSystemUserPersonaStyles();

  const contactItems = React.useMemo((): SystemUserContactItem[] => {
    if (!user) return [];

    const items: SystemUserContactItem[] = [];

    if (user.internalemailaddress) {
      items.push({
        key: 'email',
        icon: <MailRegular />,
        value: user.internalemailaddress,
        href: `mailto:${user.internalemailaddress}`,
      });
    }
    if (user.address1_telephone1) {
      items.push({
        key: 'phone',
        icon: <CallRegular />,
        value: user.address1_telephone1,
        href: `tel:${user.address1_telephone1}`,
      });
    }
    if (user.mobilephone) {
      items.push({
        key: 'mobile',
        icon: <PhoneRegular />,
        value: user.mobilephone,
        href: `tel:${user.mobilephone}`,
      });
    }
    if (user.address1_composite) {
      items.push({ key: 'address', icon: <BuildingRegular />, value: user.address1_composite });
    }
    if (user.businessUnit) {
      items.push({ key: 'businessunit', icon: <BuildingRegular />, value: user.businessUnit });
    }

    return [...items, ...(additionalContact ?? [])];
  }, [user, additionalContact]);

  if (loading) {
    return (
      <div className={styles.cardStateRow}>
        <Spinner size="tiny" />
        <Text size={200}>Loading user...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.cardStateRow}>
        <Text className={styles.errorText}>{error}</Text>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.cardStateRow}>
        <Text size={200}>No user details available.</Text>
      </div>
    );
  }

  return (
    <>
      <div className={styles.cardHeader}>
        <Avatar
          size={72}
          name={user.fullname ?? undefined}
          initials={initialsOf(user.fullname)}
          image={imageUrl ? { src: imageUrl } : undefined}
          badge={presence ? { status: presence } : undefined}
        />
        <span className={styles.cardHeaderText}>
          <Text weight="semibold" className={styles.cardName}>
            {user.fullname || 'Unnamed user'}
            {user.isdisabled && (
              <Badge className={styles.disabledBadge} appearance="tint" color="danger" size="small">
                Disabled
              </Badge>
            )}
          </Text>
          {user.jobtitle && <Text className={styles.cardTitle}>{user.jobtitle}</Text>}
          {user.businessUnit && <Text className={styles.cardTitle}>{user.businessUnit}</Text>}
        </span>
      </div>

      {contactItems.length > 0 && (
        <div className={styles.cardSection}>
          <Text weight="semibold" className={styles.cardSectionTitle}>
            Contact
            <ChevronRightRegular fontSize={12} />
          </Text>

          {contactItems.map((item) => (
            <div key={item.key} className={styles.contactRow}>
              {item.icon && <span className={styles.contactIcon}>{item.icon}</span>}
              {item.href ? (
                <Link href={item.href} className={styles.contactLink}>
                  {item.value}
                </Link>
              ) : (
                <Text className={styles.contactValue}>{item.value}</Text>
              )}
            </div>
          ))}
        </div>
      )}

      {actions && <div className={styles.cardFooter}>{actions}</div>}
    </>
  );
};
