import { createTheme, alpha } from '@mui/material/styles';

const BRAND_GREEN = '#2E7D32';
const BRAND_CYAN = '#00ACC1';

const sharedComponents = (mode) => {
  const isDark = mode === 'dark';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: isDark ? '#444 #1e1e1e' : '#c8e6c9 #f0fdf4',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 700,
          fontFamily: 'Poppins, sans-serif',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        },
        contained: {
          boxShadow: isDark
            ? '0 6px 16px rgba(0,0,0,0.35)'
            : `0 6px 16px ${alpha(BRAND_GREEN, 0.25)}`,
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: isDark
              ? '0 8px 20px rgba(0,0,0,0.45)'
              : `0 8px 22px ${alpha(BRAND_CYAN, 0.3)}`,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
        elevation0: {
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : alpha(BRAND_GREEN, 0.1),
          boxShadow: isDark
            ? '0 8px 28px rgba(0,0,0,0.32)'
            : '0 8px 24px rgba(46,125,50,0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : alpha(BRAND_GREEN, 0.12),
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: isDark
              ? '0 12px 32px rgba(0,0,0,0.4)'
              : '0 12px 28px rgba(46,125,50,0.1)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontFamily: 'Poppins, sans-serif',
          borderRadius: 10,
        },
        colorPrimary: {
          fontWeight: 800,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 800,
            fontSize: '0.78rem',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: isDark ? 'rgba(255,255,255,0.9)' : BRAND_GREEN,
            background: isDark
              ? `linear-gradient(90deg, ${alpha(BRAND_GREEN, 0.22)}, ${alpha(BRAND_CYAN, 0.14)})`
              : `linear-gradient(90deg, ${alpha(BRAND_GREEN, 0.08)}, ${alpha(BRAND_CYAN, 0.06)})`,
            borderBottom: `2px solid ${isDark ? alpha(BRAND_GREEN, 0.35) : alpha(BRAND_GREEN, 0.2)}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : alpha(BRAND_GREEN, 0.04),
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : alpha(BRAND_GREEN, 0.08),
          fontFamily: 'Poppins, sans-serif',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: 3,
          background: `linear-gradient(90deg, ${BRAND_GREEN}, ${BRAND_CYAN})`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontFamily: 'Poppins, sans-serif',
          textTransform: 'none',
          minHeight: 48,
          '&.Mui-selected': {
            color: isDark ? BRAND_GREEN : BRAND_GREEN,
            fontWeight: 800,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : alpha(BRAND_GREEN, 0.12),
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.55)'
            : '0 24px 56px rgba(46,125,50,0.15)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 800,
          fontFamily: 'Poppins, sans-serif',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'box-shadow 0.2s ease',
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(BRAND_CYAN, 0.2)}`,
            },
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: 10,
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${alpha(BRAND_GREEN, 0.2)}, ${alpha(BRAND_CYAN, 0.15)})`,
            color: BRAND_GREEN,
            fontWeight: 800,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
        },
        bar: {
          borderRadius: 8,
          background: `linear-gradient(90deg, ${BRAND_GREEN}, ${BRAND_CYAN})`,
        },
      },
    },
  };
};

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#15803d',
      light: '#22c55e',
      dark: '#14532d',
    },
    secondary: {
      main: '#00ACC1',
      light: '#26C6DA',
      dark: '#00838F',
    },
    background: {
      default: '#f0fdf4',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Segoe UI", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: sharedComponents('light'),
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4CAF50',
      light: '#66BB6A',
      dark: '#388E3C',
    },
    secondary: {
      main: '#00ACC1',
      light: '#26C6DA',
      dark: '#00838F',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Segoe UI", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    ...sharedComponents('dark'),
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
  },
});

export const getTheme = (mode = 'light') => (mode === 'dark' ? darkTheme : lightTheme);

export default lightTheme;
