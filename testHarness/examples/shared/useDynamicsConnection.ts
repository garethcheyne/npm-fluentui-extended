/**
 * Custom React hook for managing Dynamics 365 connection state.
 *
 * This hook encapsulates all the logic for:
 * - Initializing the Dynamics mock/connection on mount
 * - Tracking authentication state
 * - Login and logout actions
 *
 * Usage:
 * ```tsx
 * const {
 *   connected,
 *   loading,
 *   configured,
 *   user,
 *   login,
 *   logout
 * } = useDynamicsConnection();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  installDynamicsMock,
  loginToDynamics,
  isDynamicsAuthenticated,
  logoutFromDynamics,
  getDynamicsUser,
} from '../../dynamics-mock';

export interface DynamicsConnectionState {
  /** Whether the user is currently authenticated with Dynamics 365 */
  connected: boolean;

  /** Whether a connection operation is in progress */
  loading: boolean;

  /** Whether the environment has been configured (VITE_* env vars set) */
  configured: boolean;

  /** The currently authenticated user's display name, if any */
  user: string | null;

  /** Triggers a login to Dynamics 365 */
  login: () => Promise<boolean>;

  /** Logs out from Dynamics 365 */
  logout: () => Promise<void>;
}

/**
 * Hook that manages Dynamics 365 connection lifecycle.
 *
 * On mount, it:
 * 1. Installs the mock/proxy layer
 * 2. Checks if already authenticated (e.g., from previous session)
 * 3. Updates state accordingly
 *
 * @example
 * ```tsx
 * function App() {
 *   const dynamics = useDynamicsConnection();
 *
 *   if (dynamics.loading) return <Spinner />;
 *
 *   return dynamics.connected
 *     ? <ConnectedView onLogout={dynamics.logout} />
 *     : <Button onClick={dynamics.login}>Connect</Button>;
 * }
 * ```
 */
export function useDynamicsConnection(): DynamicsConnectionState {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  // Initialize the Dynamics mock on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // installDynamicsMock sets up the global Xrm object and
        // checks environment configuration
        const { isConfigured, isAuthenticated } = await installDynamicsMock();
        setConfigured(isConfigured);
        setConnected(isAuthenticated);

        if (isAuthenticated) {
          const dynamicsUser = getDynamicsUser();
          setUser(dynamicsUser?.username || dynamicsUser?.name || null);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Login action - opens Azure AD auth flow
  const login = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await loginToDynamics();
      setConnected(success);

      if (success) {
        const dynamicsUser = getDynamicsUser();
        setUser(dynamicsUser?.username || dynamicsUser?.name || null);
      }

      return success;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout action - clears tokens and state
  const logout = useCallback(async (): Promise<void> => {
    await logoutFromDynamics();
    setConnected(false);
    setUser(null);
  }, []);

  return {
    connected,
    loading,
    configured,
    user,
    login,
    logout,
  };
}
