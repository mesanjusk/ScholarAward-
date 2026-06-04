import { Card, CardContent, Stack, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, useMediaQuery, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function ResponsiveTable({ columns, rows, mobileTitleKey = 'title' }) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));

  if (mobile) {
    return (
      <Stack spacing={1.5}>
        {rows.length ? rows.map((row, idx) => (
          <Card key={idx} sx={{ borderRadius: 4 }}>
            <CardContent>
              <Stack spacing={1.15}>
                <Typography variant="subtitle1" fontWeight={800}>{row[mobileTitleKey] || `Row ${idx + 1}`}</Typography>
                {columns.filter((col) => col.key !== mobileTitleKey).map((col) => (
                  <Box key={col.key} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1, alignItems: 'start' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ pt: 0.25 }}>{col.label}</Typography>
                    <Box sx={{ minWidth: 0 }}>{typeof row[col.key] === 'function' ? row[col.key]() : row[col.key] || '-'}</Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )) : <Card><CardContent><Typography color="text.secondary">No records found.</Typography></CardContent></Card>}
      </Stack>
    );
  }

  return (
    <TableContainer component={Card} sx={{ borderRadius: 5, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: 'rgba(37,211,102,0.08)' }}>
          <TableRow>
            {columns.map((col) => <TableCell key={col.key}>{col.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? rows.map((row, idx) => (
            <TableRow key={idx} hover>
              {columns.map((col) => <TableCell key={col.key}>{typeof row[col.key] === 'function' ? row[col.key]() : row[col.key] || '-'}</TableCell>)}
            </TableRow>
          )) : (
            <TableRow><TableCell colSpan={columns.length}><Chip label="No records" size="small" /></TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
