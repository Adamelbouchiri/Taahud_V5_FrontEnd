import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services';
import { readRoles } from '../services/auth';

/* ============================================================
 *  UserContext
 *  ----------------------------------------------------------------
 *  Loads the authenticated user via auth.me() once when the
 *  dashboard mounts, and exposes them (and their roles) to every
 *  page beneath it.
 *
 *  Pages read the user with:
 *
 *      const { user, loading, refresh, roles, isAdmin } = useUser();
 *
 *  Roles come from the snapshot persisted at login/register time
 *  (services/auth.js → saveRoles). /auth/me doesn't return roles
 *  in the current contract, so we trust the stored snapshot until
 *  the next sign-in. The http.js 401 interceptor clears the storage
 *  on token revocation, which forces a fresh login and a fresh
 *  roles snapshot.
 * ============================================================ */

const UserContext = createContext({
  user: null,
  loading: true,
  error: null,
  roles: [],
  isAdmin: false,
  isSuperAdmin: false,
  refresh: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState(() => readRoles());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await auth.me();
      setUser(me);
      // Re-read roles from storage after /me — the 401 interceptor
      // might have cleared them, and we want React state to reflect
      // that next render.
      setRoles(readRoles());
    } catch (err) {
      setError(err);
      setUser(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* auth.logout() clears storage in its own `finally`, so the local
     state must come down even when the revoke request rejects
     (offline, 401 on an already-dead token). Otherwise storage says
     "guest" while this provider still hands the old user — and their
     roles — to every page under it. */
  const logout = async () => {
    try {
      await auth.logout();
    } finally {
      setUser(null);
      setRoles([]);
    }
  };

  const isAdmin = roles.includes('admin') || roles.includes('super-admin');
  const isSuperAdmin = roles.includes('super-admin');

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        roles,
        isAdmin,
        isSuperAdmin,
        refresh: load,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
