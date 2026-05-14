import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services';

/* ============================================================
 *  UserContext
 *  ----------------------------------------------------------------
 *  Loads the authenticated user via auth.me() once when the
 *  dashboard mounts, and exposes them to every page beneath it.
 *
 *  Pages read the user with:
 *
 *      const { user, loading, refresh } = useUser();
 *
 *  In production: if `auth.me()` 401s, redirect to /login.
 *  Right now we just leave loading=false with user=null so the
 *  dashboard renders without flashing during dev with mock data.
 * ============================================================ */

const UserContext = createContext({
  user: null,
  loading: true,
  error: null,
  refresh: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await auth.me();
      setUser(me);
    } catch (err) {
      setError(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const logout = async () => {
    await auth.logout();
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
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
