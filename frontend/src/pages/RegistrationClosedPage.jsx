import { Box, Container, Paper, Typography, Stack } from '@mui/material';
import { Lock, EventBusy } from '@mui/icons-material';

export default function RegistrationClosedPage({
  title = 'BK Awards – Registration',
  color = '#7c3aed',
}) {
  const lightBg = `${color}14`; // ~8% opacity tint

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${lightBg} 0%, ${color}22 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={4} sx={{ borderRadius: 4, overflow: 'hidden', textAlign: 'center' }}>
          {/* Header bar */}
          <Box sx={{ bgcolor: color, py: 3, px: 4 }}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5}>
              <Lock sx={{ color: '#fff', fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700} color="#fff">
                {title}
              </Typography>
            </Stack>
          </Box>

          {/* Body */}
          <Box sx={{ py: 6, px: 4 }}>
            <EventBusy sx={{ fontSize: 80, color, opacity: 0.25, mb: 2 }} />

            <Typography variant="h4" fontWeight={700} color={color} gutterBottom>
              Registration Closed
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.8 }}>
              Thank you for your interest.
              <br />
              Unfortunately, registrations are currently closed.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Please check back later or contact the organising team for more information.
            </Typography>
          </Box>

          {/* Footer */}
          <Box sx={{ bgcolor: `${color}0d`, py: 2, px: 4 }}>
            <Typography variant="caption" color="text.disabled">
              BK Awards &copy; {new Date().getFullYear()}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
