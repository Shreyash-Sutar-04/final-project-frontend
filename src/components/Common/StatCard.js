import React from 'react';
import { Paper, Stack, Typography, Box, alpha, useTheme } from '@mui/material';
import { ShareBiteBrandMark } from './ShareBiteBrand';
import { BRAND } from '../../styles/panelUi';

const ACCENTS = {
  primary: BRAND.green,
  secondary: BRAND.cyan,
  success: BRAND.greenLight,
  warning: '#FF9800',
  info: BRAND.cyan,
};

const StatCard = ({ label, value, icon, color = 'primary', useBrand = true }) => {
  const theme = useTheme();
  const accent = ACCENTS[color] || ACCENTS.primary;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: { xs: 2.5, md: 3 },
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : alpha(accent, 0.2),
        background: isDark
          ? `linear-gradient(145deg, ${alpha(accent, 0.14)} 0%, rgba(30,30,30,0.95) 55%)`
          : `linear-gradient(145deg, ${alpha(accent, 0.08)} 0%, #ffffff 60%)`,
        boxShadow: isDark
          ? '0 10px 28px rgba(0,0,0,0.35)'
          : `0 10px 28px ${alpha(accent, 0.12)}`,
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: `linear-gradient(180deg, ${accent}, ${BRAND.cyan})`,
          borderRadius: '4px 0 0 4px',
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isDark
            ? '0 16px 40px rgba(0,0,0,0.45)'
            : `0 16px 36px ${alpha(accent, 0.2)}`,
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ pl: 0.5 }}>
        <Box
          sx={{
            width: { xs: 48, md: 56 },
            height: { xs: 48, md: 56 },
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: alpha(accent, isDark ? 0.22 : 0.12),
            color: accent,
            '& .MuiSvgIcon-root': { fontSize: { xs: 26, md: 30 } },
          }}
        >
          {icon || (useBrand ? <ShareBiteBrandMark size={44} /> : null)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.8rem' }}
          >
            {label}
          </Typography>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{
              fontFamily: 'Poppins',
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.35rem', md: '1.5rem' },
              background: BRAND.gradientText,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

export default StatCard;
