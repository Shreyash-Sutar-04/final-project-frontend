/** ShareBite brand accents — do not change palette, only reuse for UI polish */
export const BRAND = {
  green: '#2E7D32',
  greenLight: '#4CAF50',
  cyan: '#00ACC1',
  gradient: 'linear-gradient(135deg, #2E7D32 0%, #00ACC1 100%)',
  gradientSoft: 'linear-gradient(135deg, rgba(46,125,50,0.12) 0%, rgba(0,172,193,0.1) 100%)',
  gradientText: 'linear-gradient(45deg, #2E7D32, #00ACC1)',
};

export const panelPageBg = (dark) =>
  dark
    ? 'radial-gradient(ellipse 80% 50% at 100% 0%, rgba(0,172,193,0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(46,125,50,0.1) 0%, transparent 50%), #121212'
    : 'radial-gradient(ellipse 80% 50% at 100% 0%, rgba(0,172,193,0.07) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(76,175,80,0.1) 0%, transparent 50%), #f0fdf4';

export const panelSectionSx = (theme) => ({
  p: { xs: 2, sm: 2.5, md: 3 },
  height: '100%',
  borderRadius: { xs: 2.5, md: 3 },
  border: '1px solid',
  borderColor:
    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(46,125,50,0.12)',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(160deg, rgba(30,30,30,0.95) 0%, rgba(24,28,26,0.98) 100%)'
      : 'linear-gradient(160deg, #ffffff 0%, #f8fcf9 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
      : '0 12px 32px rgba(46,125,50,0.08), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
  transition: 'box-shadow 0.25s ease, transform 0.25s ease',
  '&:hover': {
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 16px 48px rgba(0,0,0,0.45)'
        : '0 16px 40px rgba(46,125,50,0.12), 0 6px 16px rgba(0,172,193,0.06)',
  },
});

export const panelTableHeadSx = (theme) => ({
  '& .MuiTableCell-head': {
    fontWeight: 800,
    fontSize: '0.8rem',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.85)' : BRAND.green,
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(90deg, rgba(46,125,50,0.2), rgba(0,172,193,0.12))'
        : 'linear-gradient(90deg, rgba(46,125,50,0.08), rgba(0,172,193,0.06))',
    borderBottom: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.35)' : 'rgba(46,125,50,0.2)'}`,
  },
});
