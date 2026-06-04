import { createTheme } from '@mui/material/styles';

const WHATSAPP_GREEN = '#25D366';
const WHATSAPP_DARK = '#111b21';
const WHATSAPP_SOFT = '#e7fef1';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: WHATSAPP_GREEN, dark: '#128C7E', light: '#dcf8e7', contrastText: '#0b141a' },
    secondary: { main: '#128C7E' },
    background: { default: '#f0f2f5', paper: '#ffffff' },
    text: { primary: WHATSAPP_DARK, secondary: '#667781' },
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    divider: '#d8e1e7'
  },
  shape: { borderRadius: 20 },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800 },
    subtitle1: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(180deg, #eaf7f1 0px, #f4f6f8 170px, #edf1f5 100%)',
          color: WHATSAPP_DARK
        },
        '*::-webkit-scrollbar': { width: '10px', height: '10px' },
        '*::-webkit-scrollbar-thumb': { backgroundColor: '#c1c9cf', borderRadius: '999px' },
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: '1px solid #dfe7ec',
          boxShadow: '0 14px 36px rgba(17, 27, 33, 0.06)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 14px 36px rgba(17, 27, 33, 0.06)'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 16, minHeight: 40, paddingInline: 16 },
        contained: { boxShadow: 'none' }
      }
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 700, borderRadius: 999 } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiFormControl: { defaultProps: { size: 'small', fullWidth: true } },
    MuiDialog: { styleOverrides: { paper: { margin: 12, width: 'calc(100% - 24px)' } } },
    MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 999 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 800, color: WHATSAPP_DARK } } }
  }
});

export default theme;
