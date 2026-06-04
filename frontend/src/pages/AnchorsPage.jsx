import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { Mic, Search, TableRows, ViewModule } from '@mui/icons-material';
import api from '../api';
import PageHeader from '../components/PageHeader';
import ResponsiveTable from '../components/ResponsiveTable';

const ANCHOR_COLOR = '#7c3aed';

function LanguageChips({ language }) {
  const langs = Array.isArray(language) ? language : [];
  if (!langs.length) return <Typography variant="body2" color="text.secondary">—</Typography>;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {langs.map((l) => (
        <Chip
          key={l}
          label={l}
          size="small"
          sx={{ bgcolor: '#f5f3ff', color: ANCHOR_COLOR, fontWeight: 700, fontSize: '0.72rem' }}
        />
      ))}
    </Stack>
  );
}

function AnchorCard({ item }) {
  const langs = Array.isArray(item.language) ? item.language.join(', ') : '—';
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—';

  return (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${ANCHOR_COLOR}` }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6" fontWeight={800}>{item.fullName || '—'}</Typography>
              <Typography variant="body2" color="text.secondary">{item.mobile || 'No mobile'}</Typography>
            </Box>
            <Chip
              label={item.gender || '—'}
              size="small"
              sx={{ bgcolor: '#faf5ff', color: ANCHOR_COLOR, fontWeight: 700 }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Age</Typography>
              <Typography fontWeight={700}>{item.age || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Registered</Typography>
              <Typography fontWeight={700}>{date}</Typography>
            </Box>
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">Language(s)</Typography>
            <Typography fontWeight={600} sx={{ fontSize: '0.85rem' }}>{langs}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AnchorsPage() {
  const [anchors, setAnchors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('card');

  useEffect(() => {
    api.get('/anchors')
      .then((r) => setAnchors(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAnchors([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return anchors;
    return anchors.filter(
      (a) =>
        String(a.fullName || '').toLowerCase().includes(q) ||
        String(a.mobile || '').includes(q) ||
        (Array.isArray(a.language) && a.language.some((l) => l.toLowerCase().includes(q)))
    );
  }, [anchors, search]);

  const rows = filtered.map((a) => ({
    title: a.fullName,
    name: a.fullName || '—',
    gender: a.gender || '—',
    age: a.age || '—',
    mobile: a.mobile || '—',
    language: () => <LanguageChips language={a.language} />,
    registered: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—'
  }));

  return (
    <Box>
      <PageHeader
        eyebrow="Report"
        title="Anchors"
        subtitle="All registered anchors for Badte Kadam Scholar Awards 2026."
        chips={[
          { label: `${anchors.length} Registered` },
          { label: `${filtered.length} Shown` }
        ]}
      />

      <Card sx={{ mb: 2, borderTop: `3px solid ${ANCHOR_COLOR}` }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Mic sx={{ color: ANCHOR_COLOR }} />
                <Typography variant="h6" fontWeight={800}>Anchor Records</Typography>
              </Stack>
              <Typography color="text.secondary" variant="body2">
                Search by name, mobile number, or language.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 220 }}
              />
              <ToggleButtonGroup
                exclusive
                value={viewMode}
                onChange={(_, v) => v && setViewMode(v)}
                size="small"
              >
                <ToggleButton value="card"><ViewModule fontSize="small" /></ToggleButton>
                <ToggleButton value="table"><TableRows fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>Loading anchors...</Typography>
      ) : viewMode === 'card' ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }
          }}
        >
          {filtered.length ? (
            filtered.map((a) => <AnchorCard key={a._id} item={a} />)
          ) : (
            <Card><CardContent><Typography color="text.secondary">No anchors found.</Typography></CardContent></Card>
          )}
        </Box>
      ) : (
        <ResponsiveTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'gender', label: 'Gender' },
            { key: 'age', label: 'Age' },
            { key: 'mobile', label: 'Mobile' },
            { key: 'language', label: 'Language(s)' },
            { key: 'registered', label: 'Registered' }
          ]}
          rows={rows}
          mobileTitleKey="title"
        />
      )}
    </Box>
  );
}
