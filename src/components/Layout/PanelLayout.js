import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Stack,
  Button,
  Chip,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ShareBiteHelpChat from '../Common/ShareBiteHelpChat';
import ShareBiteBrand from '../Common/ShareBiteBrand';
import { BRAND, panelPageBg } from '../../styles/panelUi';

const PanelLayout = ({ title, subtitle, actions, children, darkMode, setDarkMode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleDarkMode = () => {
    if (setDarkMode) {
      setDarkMode(!darkMode);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        background: panelPageBg(isDark),
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          top: -120,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(BRAND.cyan, 0.15)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          bottom: -100,
          left: -60,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(BRAND.green, 0.12)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : alpha(BRAND.green, 0.12),
          background: isDark
            ? 'rgba(30,30,30,0.92)'
            : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 24px rgba(46,125,50,0.08)',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: BRAND.gradient,
            opacity: 0.85,
          },
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            py: { xs: 1.5, md: 2 },
            px: { xs: 1.5, sm: 2, md: 3 },
            flexWrap: { xs: 'wrap', md: 'nowrap' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
            <Box
              component="img"
              src={`${process.env.PUBLIC_URL || ''}/sharebite-logo.svg`}
              alt="ShareBite"
              sx={{
                width: { xs: 40, sm: 44 },
                height: { xs: 40, sm: 44 },
                borderRadius: 2,
                boxShadow: `0 4px 14px ${alpha(BRAND.green, 0.25)}`,
                flexShrink: 0,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <ShareBiteBrand variant="h5" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
              <Typography
                variant="subtitle1"
                fontWeight={700}
                noWrap
                sx={{ fontFamily: 'Poppins', mt: 0.25, fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontFamily: 'Poppins',
                    display: { xs: 'none', sm: 'block' },
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 1.5 }}
            alignItems="center"
            sx={{ flexShrink: 0, ml: 'auto' }}
          >
            {setDarkMode && (
              <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                <IconButton
                  onClick={toggleDarkMode}
                  color="inherit"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(46,125,50,0.06)',
                  }}
                >
                  {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>
            )}
            <Chip
              label={user?.userType}
              size="small"
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 800,
                display: { xs: 'none', sm: 'flex' },
                background: BRAND.gradient,
                color: '#fff',
                border: 'none',
              }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: 'Poppins', display: { xs: 'none', md: 'block' }, fontWeight: 600 }}
            >
              {user?.username}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                borderRadius: 999,
                fontFamily: 'Poppins',
                fontWeight: 700,
                px: { xs: 1.5, sm: 2 },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Logout
              </Box>
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2.5, md: 4 },
          px: { xs: 2, sm: 3 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        {actions && (
          <Box
            sx={{
              mb: 3,
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : alpha(BRAND.green, 0.12),
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {actions}
          </Box>
        )}
        <Box
          sx={{
            animation: 'panelFadeIn 0.45s ease-out',
            '@keyframes panelFadeIn': {
              from: { opacity: 0, transform: 'translateY(10px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {children}
        </Box>
      </Container>
      <ShareBiteHelpChat />
    </Box>
  );
};

export default PanelLayout;
