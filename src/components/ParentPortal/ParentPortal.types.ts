import type { ReactNode } from 'react';

export interface ParentPortalProps {
  children: ReactNode;
  containerId?: string;
  syncStyles?: boolean;
  syncTokens?: boolean;
  syncInterval?: number;
  containerStyles?: string;
}

export interface UseParentPortalMountOptions {
  containerId?: string;
  syncStyles?: boolean;
  syncTokens?: boolean;
  syncInterval?: number;
  containerStyles?: string;
}
