import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Protege una ruta — redirige a /login si no está autenticado.
 * Guarda la ruta original en state para redirigir de vuelta tras el login.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Muestra un spinner mientras verifica la sesión inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
