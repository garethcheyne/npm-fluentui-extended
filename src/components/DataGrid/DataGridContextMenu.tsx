import * as React from 'react';
import {
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import type { CommandBarItem } from '../CommandBar';
import { useDataGridStyles } from './DataGrid.styles';

export interface DataGridContextMenuProps {
  /** Where the right-click landed, in viewport coordinates. */
  position: { x: number; y: number } | null;
  items: CommandBarItem[];
  onDismiss: () => void;
}

/**
 * A right-click menu at the pointer.
 *
 * Items are `CommandBarItem`s so a command can be declared once and used in the
 * toolbar and the context menu without being described twice.
 */
export function DataGridContextMenu({ position, items, onDismiss }: DataGridContextMenuProps) {
  const styles = useDataGridStyles();
  if (!position || items.length === 0) return null;

  return (
    <Menu
      open
      onOpenChange={(_, data) => {
        if (!data.open) onDismiss();
      }}
      positioning={{ position: 'below', align: 'start', target: pointerTarget(position) }}
    >
      {/* Empty: the menu is opened from a contextmenu handler, not by clicking
          anything of its own. */}
      <MenuTrigger disableButtonEnhancement>
        <span />
      </MenuTrigger>
      <MenuPopover>
        <MenuList className={styles.menuList}>
          {items.map((item) => (
            <React.Fragment key={item.key}>
              {item.dividerBefore && <MenuDivider />}
              {renderItem(item, onDismiss, styles.menuList)}
            </React.Fragment>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

function renderItem(
  item: CommandBarItem,
  onDismiss: () => void,
  listClassName: string,
): React.ReactElement {
  if (item.subItems?.length) {
    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <MenuItem icon={item.icon} disabled={item.disabled}>
            {item.text}
          </MenuItem>
        </MenuTrigger>
        <MenuPopover>
          <MenuList className={listClassName}>
            {item.subItems.map((sub) => (
              <React.Fragment key={sub.key}>
                {sub.dividerBefore && <MenuDivider />}
                {renderItem(sub, onDismiss, listClassName)}
              </React.Fragment>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  }

  return (
    <MenuItem
      icon={item.icon}
      disabled={item.disabled}
      onClick={() => {
        item.onClick?.();
        onDismiss();
      }}
    >
      {item.text}
    </MenuItem>
  );
}

/**
 * A stand-in element at the pointer, so Fluent's positioning can anchor a menu
 * to a right-click that landed on no particular child.
 */
function pointerTarget(position: { x: number; y: number }): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      x: position.x,
      y: position.y,
      top: position.y,
      left: position.x,
      bottom: position.y,
      right: position.x,
      width: 0,
      height: 0,
      toJSON: () => '',
    }),
  } as HTMLElement;
}
