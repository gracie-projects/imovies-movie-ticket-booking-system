import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader } from './common.jsx';

/** Guards a route. role="admin" additionally requires the admin role. */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Checking your session..." />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (role && user.role !== role) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-shield-lock display-4 text-muted" aria-hidden="true" />
        <h1 className="h3 mt-3">Access denied</h1>
        <p className="text-muted">This area is only available to administrators.</p>
      </div>
    );
  }
  return children;
}
