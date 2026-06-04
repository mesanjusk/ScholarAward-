import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';
import PwaInstallPrompt from '../components/pwa/PwaInstallPrompt';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 1.5, background: 'linear-gradient(180deg,#eef4ff 0%,#f7fafc 100%)' }}>
      <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 420 }}>
        <PwaInstallPrompt />
        <Card sx={{ width: '100%', maxWidth: 420, mx: 'auto' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2} component="form" onSubmit={submit}>
              <Stack spacing={1} alignItems="center">
                <Box sx={{ width: 56, height: 56, borderRadius: 99, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'white' }}><LockOutlinedIcon /></Box>
                <Typography variant="h5">Badte Kadam</Typography>
                <Typography color="text.secondary" align="center">BK Scholar Awards 2026</Typography>
              </Stack>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField label="Username" value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <TextField label="Password" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Button size="large" variant="contained" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Login'}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
