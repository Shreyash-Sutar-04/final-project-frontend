import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  TextField,
  keyframes,
  alpha,
  Divider,
} from '@mui/material';
import {
  Mic,
  GraphicEq,
  Replay,
  WarningAmber,
  MyLocation,
  LocalShipping,
  Restaurant,
  RecordVoiceOver,
  CheckCircle,
  TouchApp,
  Language,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  VOICE_LANG_OPTIONS,
  VOICE_EXAMPLE_PHRASES,
  isSpeechRecognitionSupported,
} from '../../utils/voiceFoodKeywords';
import {
  requestMicrophonePermission,
  getCurrentLocation,
  listenForSpeech,
  submitVoiceFoodRequest,
} from '../../utils/voiceRequestFlow';

const THEME_GREEN = '#2E7D32';
const THEME_CYAN = '#00ACC1';
const THEME_GREEN_LIGHT = '#4CAF50';

const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.5); transform: scale(1); }
  50% { box-shadow: 0 0 0 14px rgba(0, 172, 193, 0); transform: scale(1.01); }
  100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); transform: scale(1); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const barBounce = keyframes`
  0%, 100% { transform: scaleY(0.35); opacity: 0.5; }
  50% { transform: scaleY(1); opacity: 1; }
`;

const floatOrb = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(8px, -12px) scale(1.05); }
`;

function ListeningBars() {
  return (
    <Stack direction="row" spacing={0.6} alignItems="flex-end" sx={{ height: 28, mx: 'auto' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          sx={{
            width: 5,
            height: 24,
            borderRadius: 2,
            bgcolor: 'error.main',
            animation: `${barBounce} 0.9s ease-in-out infinite`,
            animationDelay: `${i * 0.12}s`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </Stack>
  );
}

function StatusRow({ icon, text, accent }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (theme) => alpha(accent, theme.palette.mode === 'dark' ? 0.22 : 0.12),
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
        {text}
      </Typography>
    </Stack>
  );
}

/**
 * Voice-assisted food request for needy / non-technical users (no login).
 */
const VoiceFoodRequestCard = ({ darkMode, onBrowseFood }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [voiceLanguage, setVoiceLanguage] = useState('mr-IN');
  const [phase, setPhase] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [locationWarning, setLocationWarning] = useState('');
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const coordsRef = useRef({ latitude: null, longitude: null });
  const speechSupported = isSpeechRecognitionSupported();

  const resetSession = useCallback(() => {
    setPhase('idle');
    setTranscript('');
    setLocationWarning('');
    setLocationCaptured(false);
    setManualLocation('');
    coordsRef.current = { latitude: null, longitude: null };
  }, []);

  const preparePermissions = async () => {
    await requestMicrophonePermission();
    const coords = await getCurrentLocation();
    coordsRef.current = { latitude: coords.latitude, longitude: coords.longitude };
    setLocationCaptured(coords.latitude != null && coords.longitude != null);
    setLocationWarning(coords.warning || '');
    return coords;
  };

  const finalizeRequest = async (spokenText) => {
    setPhase('submitting');
    setTranscript(spokenText);
    try {
      await submitVoiceFoodRequest({
        text: spokenText,
        latitude: coordsRef.current.latitude,
        longitude: coordsRef.current.longitude,
        manualLocation: manualLocation.trim() ? manualLocation.trim() : null,
      });
      setPhase('success');
      enqueueSnackbar('Request submitted successfully.', { variant: 'success' });
    } catch (err) {
      setPhase('idle');
      if (err.message === 'FOOD_KEYWORD_NOT_DETECTED') {
        enqueueSnackbar(err.userMessage, { variant: 'warning', autoHideDuration: 9000 });
      } else {
        enqueueSnackbar(
          err.response?.data?.message || err.userMessage || 'Unable to submit request right now.',
          { variant: 'error' }
        );
      }
    }
  };

  const handleSpeakAndRequest = async () => {
    resetSession();
    if (!speechSupported) {
      enqueueSnackbar('Voice is not supported here. Use Request Food below.', { variant: 'info' });
      return;
    }
    try {
      await preparePermissions();
    } catch {
      setPhase('mic-denied');
      enqueueSnackbar('Microphone permission is required. Allow mic access and tap Retry.', {
        variant: 'error',
        autoHideDuration: 8000,
      });
      return;
    }
    setPhase('listening');
    try {
      const { transcript: heard } = await listenForSpeech(voiceLanguage);
      if (!heard) {
        setPhase('idle');
        enqueueSnackbar('No speech heard. Please try again and speak clearly.', { variant: 'warning' });
        return;
      }
      await finalizeRequest(heard);
    } catch (err) {
      const code = err.message || '';
      if (code === 'not-allowed') {
        setPhase('mic-denied');
        enqueueSnackbar('Microphone access denied. Please allow and retry.', { variant: 'error' });
      } else if (code === 'no-speech') {
        setPhase('idle');
        enqueueSnackbar('No speech heard. Please try again and speak clearly.', { variant: 'warning' });
      } else {
        setPhase('idle');
        enqueueSnackbar('Could not capture voice. Please try again.', { variant: 'warning' });
      }
    }
  };

  const handleFallbackRequest = async () => {
    resetSession();
    setPhase('submitting');
    try {
      try {
        await requestMicrophonePermission();
      } catch {
        // mic optional for fallback
      }
      const coords = await getCurrentLocation();
      coordsRef.current = { latitude: coords.latitude, longitude: coords.longitude };
      setLocationCaptured(coords.latitude != null && coords.longitude != null);
      if (coords.warning) setLocationWarning(coords.warning);
      await submitVoiceFoodRequest({
        text: 'I need food help',
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setTranscript('I need food help');
      setPhase('success');
      enqueueSnackbar('Food request submitted.', { variant: 'success' });
    } catch (err) {
      setPhase('idle');
      enqueueSnackbar(err.response?.data?.message || 'Unable to submit request.', { variant: 'error' });
    }
  };

  const isBusy = phase === 'listening' || phase === 'submitting';

  const cardBg = darkMode
    ? `linear-gradient(145deg, ${alpha(THEME_GREEN, 0.2)} 0%, ${alpha(THEME_CYAN, 0.12)} 45%, rgba(18,18,18,0.95) 100%)`
    : `linear-gradient(145deg, ${alpha(THEME_GREEN_LIGHT, 0.14)} 0%, ${alpha(THEME_CYAN, 0.1)} 50%, #ffffff 100%)`;

  const ctaPanelBg = darkMode
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(255,255,255,0.72)';

  const buttonLabel =
    phase === 'listening'
      ? 'Listening…'
      : phase === 'submitting'
        ? 'Submitting…'
        : speechSupported
          ? 'Speak & Request Food'
          : 'Request Food';

  return (
    <Box
      sx={{
        py: { xs: 4, md: 6 },
        px: { xs: 0, sm: 1 },
        bgcolor: darkMode ? '#0f1112' : '#f2f8f4',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* soft background orbs */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(THEME_CYAN, 0.25)} 0%, transparent 70%)`,
          animation: `${floatOrb} 8s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -40,
          left: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(THEME_GREEN, 0.2)} 0%, transparent 70%)`,
          animation: `${floatOrb} 10s ease-in-out infinite reverse`,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: 3, sm: 4, md: 5 },
            p: 0,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: darkMode ? alpha('#fff', 0.1) : alpha(THEME_GREEN, 0.18),
            background: cardBg,
            backdropFilter: 'blur(12px)',
            boxShadow: darkMode
              ? '0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 24px 48px rgba(46,125,50,0.12), 0 8px 24px rgba(0,172,193,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
            animation: `${fadeInUp} 0.55s cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        >
          {/* top accent bar */}
          <Box
            sx={{
              height: 4,
              background: `linear-gradient(90deg, ${THEME_GREEN}, ${THEME_CYAN}, ${THEME_GREEN_LIGHT})`,
              backgroundSize: '200% auto',
              animation: `${shimmer} 4s linear infinite`,
            }}
          />

          <Box sx={{ p: { xs: 2.5, sm: 3.5, md: 4.5 } }}>
            <Grid container spacing={{ xs: 3, md: 4 }} alignItems="stretch">
              {/* Left: copy — order 2 on mobile so CTA shows first */}
              <Grid item xs={12} md={7} sx={{ order: { xs: 2, md: 1 } }}>
                <Chip
                  icon={<RecordVoiceOver sx={{ fontSize: 18 }} />}
                  label="Voice help · No login"
                  size="small"
                  sx={{
                    mb: 2,
                    fontWeight: 700,
                    bgcolor: darkMode ? alpha(THEME_GREEN_LIGHT, 0.2) : alpha(THEME_GREEN, 0.1),
                    color: darkMode ? THEME_GREEN_LIGHT : THEME_GREEN,
                    border: '1px solid',
                    borderColor: alpha(THEME_GREEN, 0.25),
                  }}
                />

                <Typography
                  component="h2"
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.15,
                    fontSize: { xs: '1.75rem', sm: '2.1rem', md: '2.35rem' },
                    letterSpacing: '-0.02em',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'block',
                      background: `linear-gradient(45deg, ${THEME_GREEN}, ${THEME_CYAN})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Need Food Help?
                  </Box>
                  <Box component="span" sx={{ display: 'block', mt: 0.5, color: 'text.primary' }}>
                    अन्न हवे आहे?
                  </Box>
                </Typography>

                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 2 }}>
                  <Language sx={{ fontSize: 20, color: 'secondary.main' }} />
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.95rem' }}>
                    मराठी • हिंदी • English
                  </Typography>
                </Stack>

                <Typography
                  variant="body1"
                  sx={{ mt: 1.5, color: 'text.secondary', lineHeight: 1.75, maxWidth: 520 }}
                >
                  Tap the button, allow microphone &amp; location, then say you need food. Simple, fast, and free —
                  no account required.
                </Typography>

                <Typography
                  variant="overline"
                  sx={{ display: 'block', mt: 3, mb: 1, fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary' }}
                >
                  Try saying
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {VOICE_EXAMPLE_PHRASES.map((example) => (
                    <Chip
                      key={example}
                      label={example}
                      size="medium"
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        borderColor: alpha(THEME_CYAN, 0.45),
                        bgcolor: darkMode ? alpha('#fff', 0.04) : alpha(THEME_CYAN, 0.06),
                        '&:hover': { bgcolor: alpha(THEME_CYAN, 0.12) },
                      }}
                    />
                  ))}
                </Stack>

                <Typography
                  variant="overline"
                  sx={{ display: 'block', mt: 2.5, mb: 1, fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary' }}
                >
                  Your language
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {VOICE_LANG_OPTIONS.map(({ code, label }) => {
                    const selected = voiceLanguage === code;
                    return (
                      <Chip
                        key={code}
                        label={label}
                        disabled={isBusy}
                        onClick={() => setVoiceLanguage(code)}
                        sx={{
                          fontWeight: 700,
                          borderRadius: 2,
                          px: 0.5,
                          transition: 'all 0.2s ease',
                          ...(selected
                            ? {
                                background: `linear-gradient(135deg, ${THEME_GREEN}, ${THEME_CYAN})`,
                                color: '#fff',
                                boxShadow: `0 4px 14px ${alpha(THEME_CYAN, 0.4)}`,
                                '&:hover': { background: `linear-gradient(135deg, ${THEME_GREEN}, ${THEME_CYAN})` },
                              }
                            : {
                                border: '1px solid',
                                borderColor: alpha(THEME_GREEN, 0.3),
                              }),
                        }}
                      />
                    );
                  })}
                </Stack>

                {/* steps — hidden on xs to reduce clutter, visible sm+ */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ mt: 3, display: { xs: 'none', sm: 'flex' } }}
                >
                  {[
                    { icon: <TouchApp fontSize="small" />, text: '1. Tap & allow mic' },
                    { icon: <Mic fontSize="small" />, text: '2. Speak your need' },
                    { icon: <CheckCircle fontSize="small" />, text: '3. Help is on the way' },
                  ].map((step) => (
                    <Stack key={step.text} direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(THEME_GREEN, darkMode ? 0.2 : 0.1),
                          color: THEME_GREEN,
                        }}
                      >
                        {step.icon}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {step.text}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>

              {/* Right: CTA panel — first on mobile */}
              <Grid item xs={12} md={5} sx={{ order: { xs: 1, md: 2 } }}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: { xs: 2.5, sm: 3 },
                    borderRadius: { xs: 3, sm: 4 },
                    bgcolor: ctaPanelBg,
                    backdropFilter: 'blur(16px)',
                    border: '1px solid',
                    borderColor: darkMode ? alpha('#fff', 0.08) : alpha(THEME_GREEN, 0.12),
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: darkMode
                      ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
                      : 'inset 0 1px 0 rgba(255,255,255,1)',
                  }}
                >
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={isBusy}
                    onClick={speechSupported ? handleSpeakAndRequest : handleFallbackRequest}
                    startIcon={
                      isBusy ? (
                        <CircularProgress size={22} color="inherit" />
                      ) : (
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: alpha('#fff', 0.2),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ml: -0.5,
                          }}
                        >
                          <Mic sx={{ fontSize: 24 }} />
                        </Box>
                      )
                    }
                    sx={{
                      py: 2.5,
                      minHeight: { xs: 72, sm: 76 },
                      borderRadius: 999,
                      fontWeight: 800,
                      fontSize: { xs: '1.05rem', sm: '1.12rem' },
                      letterSpacing: 0.2,
                      background: `linear-gradient(135deg, ${THEME_GREEN} 0%, ${THEME_CYAN} 100%)`,
                      boxShadow: `0 14px 32px ${alpha(THEME_CYAN, 0.38)}`,
                      animation: phase === 'listening' ? `${pulseRing} 1.5s ease-out infinite` : 'none',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${THEME_GREEN} 0%, ${THEME_CYAN} 100%)`,
                        transform: isBusy ? 'none' : 'translateY(-3px)',
                        boxShadow: `0 18px 40px ${alpha(THEME_CYAN, 0.45)}`,
                      },
                      '&.Mui-disabled': {
                        background: `linear-gradient(135deg, ${alpha(THEME_GREEN, 0.5)}, ${alpha(THEME_CYAN, 0.5)})`,
                        color: alpha('#fff', 0.9),
                      },
                    }}
                  >
                    {phase === 'listening' ? '🎤 ' : ''}
                    {buttonLabel}
                  </Button>

                  {!speechSupported && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 2, textAlign: 'center', color: 'text.secondary', lineHeight: 1.6 }}
                    >
                      Voice is not supported in this browser. Tap above to send a food request with your location.
                    </Typography>
                  )}

                  {phase === 'listening' && (
                    <Box sx={{ mt: 3, textAlign: 'center', animation: `${fadeInUp} 0.35s ease` }}>
                      <ListeningBars />
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 1.5 }}>
                        <GraphicEq color="error" />
                        <Typography sx={{ fontWeight: 800, color: 'error.main' }}>
                          Listening… speak now
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  {phase === 'submitting' && (
                    <Stack alignItems="center" spacing={1} sx={{ mt: 3 }}>
                      <CircularProgress size={32} sx={{ color: THEME_CYAN }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Sending your request…
                      </Typography>
                    </Stack>
                  )}

                  {transcript && phase !== 'idle' && phase !== 'listening' && (
                    <Paper
                      elevation={0}
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: darkMode ? alpha('#fff', 0.05) : alpha(THEME_CYAN, 0.06),
                        border: '1px dashed',
                        borderColor: alpha(THEME_CYAN, 0.35),
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        HEARD
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.25 }}>
                        &ldquo;{transcript}&rdquo;
                      </Typography>
                    </Paper>
                  )}

                  {locationWarning && (
                    <Paper
                      elevation={0}
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha('#ff9800', darkMode ? 0.12 : 0.08),
                        border: '1px solid',
                        borderColor: alpha('#ff9800', 0.35),
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <WarningAmber fontSize="small" color="warning" sx={{ mt: 0.2 }} />
                        <Typography variant="body2" color="warning.main" lineHeight={1.5}>
                          {locationWarning}
                        </Typography>
                      </Stack>
                    </Paper>
                  )}

                {locationWarning && !locationCaptured && (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(THEME_CYAN, darkMode ? 0.06 : 0.04),
                      border: '1px solid',
                      borderColor: alpha(THEME_CYAN, 0.35),
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, mb: 1, color: 'text.secondary' }}>
                      Add your area (manual location)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, lineHeight: 1.5 }}>
                      Type city/area/landmark so routing can still work without GPS.
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      placeholder="Example: Andheri West, Mumbai"
                      inputProps={{ 'aria-label': 'Manual location' }}
                    />
                  </Paper>
                )}

                  {phase === 'mic-denied' && (
                    <Paper
                      elevation={0}
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 3,
                        bgcolor: alpha('#ff9800', darkMode ? 0.14 : 0.08),
                        border: '1px solid',
                        borderColor: alpha('#ff9800', 0.4),
                        animation: `${fadeInUp} 0.35s ease`,
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Typography variant="body2" color="warning.main" fontWeight={700}>
                          Microphone blocked
                        </Typography>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.55}>
                          Open browser settings → Site permissions → Allow microphone, then retry.
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<Replay />}
                          onClick={handleSpeakAndRequest}
                          sx={{ alignSelf: 'flex-start', borderRadius: 999 }}
                        >
                          Retry microphone
                        </Button>
                      </Stack>
                    </Paper>
                  )}

                  {phase === 'success' && (
                    <Paper
                      elevation={0}
                      sx={{
                        mt: 2.5,
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: darkMode ? alpha(THEME_GREEN_LIGHT, 0.18) : alpha(THEME_GREEN, 0.08),
                        border: '1px solid',
                        borderColor: alpha(THEME_GREEN_LIGHT, 0.45),
                        animation: `${fadeInUp} 0.45s cubic-bezier(0.22, 1, 0.36, 1)`,
                      }}
                    >
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />
                          <Typography sx={{ fontWeight: 800, color: 'success.main', fontSize: '1.05rem' }}>
                            Request submitted
                          </Typography>
                        </Stack>
                        <Divider sx={{ borderColor: alpha(THEME_GREEN, 0.2) }} />
                        <StatusRow
                          icon={<MyLocation fontSize="small" />}
                          accent={THEME_GREEN}
                          text={
                            locationCaptured
                              ? 'Location detected and shared'
                              : 'Location not shared — request still sent'
                          }
                        />
                        <StatusRow
                          icon={<LocalShipping fontSize="small" />}
                          accent={THEME_CYAN}
                          text="Nearby volunteers have been notified"
                        />
                        <Button
                          size="small"
                          variant="text"
                          color="success"
                          onClick={resetSession}
                          sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                        >
                          Make another request
                        </Button>
                      </Stack>
                    </Paper>
                  )}

                  {!speechSupported && onBrowseFood && (
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{
                        mt: 2,
                        borderRadius: 999,
                        py: 1.3,
                        fontWeight: 700,
                        borderColor: alpha(THEME_CYAN, 0.6),
                        color: 'secondary.main',
                        '&:hover': {
                          borderColor: THEME_CYAN,
                          bgcolor: alpha(THEME_CYAN, 0.08),
                        },
                      }}
                      startIcon={<Restaurant />}
                      onClick={onBrowseFood}
                    >
                      Browse available food
                    </Button>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default VoiceFoodRequestCard;
