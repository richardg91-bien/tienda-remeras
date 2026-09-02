import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const AuthContext = createContext(null);

// ── Helpers ───────────────────────────────────────────────
const saveToken  = (t) => localStorage.setItem("accessToken", t);
const getToken   = ()  => localStorage.getItem("accessToken");
const clearToken = ()  => localStorage.removeItem("accessToken");

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true mientras verifica sesión inicial

  // ── Headers con JWT ───────────────────────────────────
  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization:  `Bearer ${getToken()}`,
  });

  // ── Refresh access token silencioso ───────────────────
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method:      "POST",
        credentials: "include", // envía la cookie refreshToken
      });
      if (!res.ok) return false;
      const { accessToken } = await res.json();
      saveToken(accessToken);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Verifica sesión al cargar la app ──────────────────
  useEffect(() => {
    const checkSession = async () => {
      const token = getToken();
      if (!token) { setLoading(false); return; }

      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: authHeaders(),
        });

        if (res.ok) {
          const { user } = await res.json();
          setUser(user);
        } else if (res.status === 401) {
          // Token expirado — intenta refrescar
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            const res2 = await fetch(`${API}/api/auth/me`, { headers: authHeaders() });
            if (res2.ok) {
              const { user } = await res2.json();
              setUser(user);
            } else {
              clearToken();
            }
          } else {
            clearToken();
          }
        }
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Register ──────────────────────────────────────────
  const register = async ({ firstName, lastName, email, password, phone }) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ firstName, lastName, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.errors?.[0]?.msg || "Error al registrarse.");
    saveToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  // ── Login ─────────────────────────────────────────────
  const login = async ({ email, password }) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Email o contraseña incorrectos.");
    saveToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  // ── Logout ────────────────────────────────────────────
  const logout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method:      "POST",
        credentials: "include",
        headers:     authHeaders(),
      });
    } catch { /* silencioso */ }
    clearToken();
    setUser(null);
  };

  // ── Actualizar usuario en contexto (tras editar perfil) ─
  const updateUser = (updates) => setUser((prev) => ({ ...prev, ...updates }));

  // ── Fetch autenticado (wrapper) ───────────────────────
  const authFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(`${API}${url}`, {
      ...options,
      credentials: "include",
      headers: { ...authHeaders(), ...(options.headers ?? {}) },
    });

    // Si el token expiró, refresca y reintenta una vez
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return fetch(`${API}${url}`, {
          ...options,
          credentials: "include",
          headers: { ...authHeaders(), ...(options.headers ?? {}) },
        });
      }
      clearToken();
      setUser(null);
    }
    return res;
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAuthenticated: !!user,
      register, login, logout,
      updateUser, authFetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
