import React from 'react';
import { Typography, Box } from '@mui/material';

const gradientSx = {
  fontWeight: 900,
  fontFamily: 'Poppins, sans-serif',
  background: 'linear-gradient(45deg,#2E7D32,#00ACC1)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

/**
 * Colorful ShareBite wordmark matching the home page hero.
 */
const ShareBiteBrand = ({ variant = 'h5', compact = false, sx = {} }) => (
  <Typography variant={variant} component="span" sx={{ ...gradientSx, ...sx }}>
    {compact ? 'SB' : 'ShareBite'}
  </Typography>
);

export const ShareBiteBrandMark = ({ size = 56 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg,#d7f5dd,#e7f1f1)',
      boxShadow: (t) => `0 2px 8px ${t.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(46,125,50,0.2)'}`,
    }}
  >
    <ShareBiteBrand variant="body1" compact sx={{ fontSize: size * 0.28 }} />
  </Box>
);

export default ShareBiteBrand;
