import { Box } from '@mui/material';

export default function PageSurface({ children, sx = {} }) {
  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 1.75 },
        borderRadius: 5,
        bgcolor: 'rgba(255,255,255,0.62)',
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
