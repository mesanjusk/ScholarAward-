import { Card, CardContent, Stack, Typography } from '@mui/material';

export default function StatCard({ title, value, subtitle }) {
  return (
    <Card sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(231,254,241,0.9))' }}>
      <CardContent>
        <Stack spacing={0.75}>
          <Typography color="text.secondary" variant="body2">{title}</Typography>
          <Typography variant="h5" fontWeight={900}>{value}</Typography>
          {subtitle ? <Typography color="text.secondary" variant="caption">{subtitle}</Typography> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
