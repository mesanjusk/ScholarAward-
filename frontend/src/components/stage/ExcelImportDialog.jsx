import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Alert, Box, Button, DialogContent, MenuItem, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import ResponsiveDialog from '../ResponsiveDialog';
import api from '../../api';

const TEMPLATE_ROWS = [
  ['name', 'username', 'mobile', 'email', 'password'],
  ['John Doe', 'john.doe', '9876543210', 'john@example.com', ''],
  ['Jane Smith', 'jane.smith', '9123456780', 'jane@example.com', ''],
];

function downloadTemplate(type) {
  const ws = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
  ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type === 'guests' ? 'Guests' : 'Volunteers');
  XLSX.writeFile(wb, `${type}_import_template.xlsx`);
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const rows = raw.map((r) => ({
          name: String(r.name || r.Name || r.fullName || r['Full Name'] || '').trim(),
          username: String(r.username || r.Username || '').trim(),
          mobile: String(r.mobile || r.Mobile || r.phone || r.Phone || '').trim(),
          email: String(r.email || r.Email || '').trim(),
          password: String(r.password || r.Password || '').trim(),
        }));
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function ExcelImportDialog({ open, onClose, onImported }) {
  const [importTab, setImportTab] = useState('guests');
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    api.get('/roles').then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setRoles(list);
      if (list.length && !selectedRole) setSelectedRole(list[0]._id);
    }).catch(() => {});
  }, [open]);

  const resetFile = () => { setRows([]); setFileName(''); setParseError(''); setResult(null); };

  const handleTabChange = (_, v) => { setImportTab(v); resetFile(); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setResult(null);
    try {
      const parsed = await parseFile(file);
      setRows(parsed);
    } catch {
      setParseError('Could not read file. Please use .xlsx, .xls, or .csv format.');
      setRows([]);
    }
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!rows.length || !selectedRole) return;
    setLoading(true);
    setResult(null);
    try {
      const endpoint = importTab === 'guests' ? '/users/bulk-import-guests' : '/users/bulk-import-volunteers';
      const res = await api.post(endpoint, { rows, roleId: selectedRole });
      setResult(res.data);
      if (res.data.created?.length) onImported();
    } catch (err) {
      setResult({ message: err.response?.data?.message || 'Import failed', errors: [] });
    }
    setLoading(false);
  };

  const validRows = rows.filter((r) => r.name && r.username);
  const invalidCount = rows.length - validRows.length;
  const label = importTab === 'guests' ? 'Guest' : 'Volunteer';

  return (
    <ResponsiveDialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={800}>Import {label}s from Excel</Typography>
            <Button size="small" startIcon={<DownloadIcon />} onClick={() => downloadTemplate(importTab)}>
              Download Template
            </Button>
          </Stack>

          <Tabs value={importTab} onChange={handleTabChange}>
            <Tab value="guests" label="Guests" />
            <Tab value="volunteers" label="Volunteers" />
          </Tabs>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              select
              label="Assign Role"
              size="small"
              sx={{ minWidth: 220 }}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {roles.map((r) => <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>)}
            </TextField>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {fileName || `Choose .xlsx / .csv`}
              <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFile} />
            </Button>
            {fileName && (
              <Button size="small" color="error" onClick={resetFile}>Clear</Button>
            )}
          </Stack>

          {parseError && <Alert severity="error">{parseError}</Alert>}

          {rows.length > 0 && !result && (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              {/* Header */}
              <Stack direction="row" sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 0.75 }} spacing={1}>
                <Typography variant="caption" fontWeight={700} sx={{ width: 24 }}>#</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ flex: 1.2 }}>Name</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>Username</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ width: 110 }}>Mobile</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>Email</Typography>
              </Stack>
              {/* Rows */}
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {rows.map((r, i) => {
                  const err = !r.name || !r.username;
                  return (
                    <Stack
                      key={i}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      px={2}
                      py={0.5}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                        bgcolor: err ? 'error.50' : 'transparent',
                      }}
                    >
                      <Typography variant="caption" sx={{ width: 24, color: 'text.secondary' }}>{i + 2}</Typography>
                      <Typography variant="body2" sx={{ flex: 1.2 }} noWrap color={!r.name ? 'error' : 'inherit'}>
                        {r.name || 'missing'}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }} noWrap color={!r.username ? 'error' : 'inherit'}>
                        {r.username || 'missing'}
                      </Typography>
                      <Typography variant="body2" sx={{ width: 110 }}>{r.mobile}</Typography>
                      <Typography variant="body2" sx={{ flex: 1 }} noWrap color="text.secondary">{r.email}</Typography>
                    </Stack>
                  );
                })}
              </Box>
            </Box>
          )}

          {result && (
            <Alert severity={result.errors?.length ? 'warning' : 'success'}>
              {result.message}
              {result.errors?.length > 0 && (
                <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}><Typography variant="caption">Row {e.row}: {e.message}</Typography></li>
                  ))}
                  {result.errors.length > 5 && (
                    <li><Typography variant="caption">…and {result.errors.length - 5} more</Typography></li>
                  )}
                </Box>
              )}
            </Alert>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {rows.length > 0
                ? `${validRows.length} valid · ${invalidCount} invalid (name + username required)`
                : `Upload a file — columns: name, username, mobile, email, password`}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={onClose}>Close</Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={!validRows.length || !selectedRole || loading}
              >
                {loading ? 'Importing…' : `Import ${validRows.length} ${label}${validRows.length !== 1 ? 's' : ''}`}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </ResponsiveDialog>
  );
}
