import { Box, Chip, Stack, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle, chips = [], action, eyebrow }) {
  return (
    <Box sx={{ mb: { xs: 1.75, sm: 2.5 } }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: 'stretch', lg: 'center' }}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>{eyebrow}</Typography> : null}
          {title ? <Typography variant="h5" sx={{ mb: subtitle ? 0.4 : 0, fontSize: { xs: '1.15rem', sm: '1.45rem' } }}>{title}</Typography> : null}
          {subtitle ? <Typography color="text.secondary" sx={{ fontSize: { xs: 13, sm: 14 }, maxWidth: 820 }}>{subtitle}</Typography> : null}
          {chips.length ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
              {chips.map((c, i) => <Chip key={i} label={c.label} color={c.color || 'default'} variant={c.variant || 'filled'} size="small" />)}
            </Stack>
          ) : null}
        </Box>
        {action ? <Box sx={{ width: { xs: '100%', lg: 'auto' } }}>{action}</Box> : null}
      </Stack>
    </Box>
  );
}
