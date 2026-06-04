import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/accessControl';

export default function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!canAccess(user, permission)) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
            Access Restricted
          </Typography>
          <Typography color="text.secondary">
            Your account does not have permission to open this section.
          </Typography>
        </Box>
      </Box>
    );
  }

  return children;
}
