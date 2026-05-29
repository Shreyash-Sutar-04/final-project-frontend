import React from 'react';
import { Paper, Stack, Typography, Box, Divider } from '@mui/material';
import { panelSectionSx } from '../../styles/panelUi';

/**
 * Polished content section for role panels (tables, forms, lists).
 */
const PanelSection = ({
  title,
  subtitle,
  action,
  children,
  sx = {},
  contentSx = {},
  disableHover = false,
  noDivider = false,
}) => (
  <Paper
    elevation={0}
    sx={(theme) => ({
      ...panelSectionSx(theme),
      ...(disableHover
        ? {
            '&:hover': {
              boxShadow: panelSectionSx(theme).boxShadow,
            },
          }
        : {}),
      ...sx,
    })}
  >
    {(title || action) && (
      <>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.5}
          sx={{ mb: noDivider ? 2 : 2.5 }}
        >
          <Box>
            {title && (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.1rem', md: '1.2rem' },
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.55 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
        </Stack>
        {!noDivider && (
          <Divider
            sx={{
              mb: 2.5,
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(46,125,50,0.12)',
            }}
          />
        )}
      </>
    )}
    <Box sx={contentSx}>{children}</Box>
  </Paper>
);

export default PanelSection;
