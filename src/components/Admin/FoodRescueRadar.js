import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Radar, Campaign } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import api from '../../utils/api';
import PanelSection from '../Common/PanelSection';

const riskChipColor = (risk) => {
  if (risk === 'HIGH') return 'error';
  if (risk === 'MEDIUM') return 'warning';
  return 'success';
};

const formatCountdown = (minutes) => {
  if (minutes <= 0) return 'Expired';
  if (minutes < 60) return `${minutes}m left`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m left`;
};

/**
 * Food Rescue Radar — surfaces donations expiring soon and lets admin blast volunteers/NGOs.
 */
const FoodRescueRadar = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blastingId, setBlastingId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadRadar = useCallback(async () => {
    try {
      const res = await api.get('/admin/rescue-radar');
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRadar();
    const timer = setInterval(loadRadar, 60000);
    return () => clearInterval(timer);
  }, [loadRadar]);

  const handleBlast = async (donationId) => {
    setBlastingId(donationId);
    try {
      await api.post(`/admin/rescue-radar/${donationId}/broadcast`);
      enqueueSnackbar('Rescue alert sent to all volunteers and NGOs.', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || 'Could not send rescue alert',
        { variant: 'error' },
      );
    } finally {
      setBlastingId(null);
    }
  };

  const maxWindow = 180;

  return (
    <PanelSection
      title="Food Rescue Radar"
      subtitle="Meals expiring within 3 hours — one-click volunteer blast before food is wasted"
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Radar color="error" />
        <Typography variant="body2" color="text.secondary">
          Auto-refreshes every minute. Alerts are rate-limited to once per donation every 15 minutes.
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
          No high-risk donations right now. Great job keeping food moving!
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => {
            const urgencyPct = Math.min(
              100,
              Math.max(5, ((maxWindow - item.remainingMinutes) / maxWindow) * 100),
            );
            return (
              <Grid item xs={12} md={6} key={item.donationId}>
                <Box
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${
                      item.riskLevel === 'HIGH'
                        ? theme.palette.error.light
                        : theme.palette.warning.light
                    }`,
                    background:
                      item.riskLevel === 'HIGH'
                        ? 'linear-gradient(135deg, rgba(211,47,47,0.06), rgba(255,255,255,0.9))'
                        : 'linear-gradient(135deg, rgba(249,168,37,0.08), rgba(255,255,255,0.9))',
                  })}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {item.foodName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.donorName} · {item.quantity} portions · {item.donationType}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Expires {dayjs(item.expiryDate).format('MMM D, h:mm A')}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={item.riskLevel}
                      color={riskChipColor(item.riskLevel)}
                    />
                  </Stack>

                  <Typography variant="h6" color="error.main" sx={{ mt: 1.5, fontWeight: 700 }}>
                    {formatCountdown(item.remainingMinutes)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={urgencyPct}
                    color={item.riskLevel === 'HIGH' ? 'error' : 'warning'}
                    sx={{ mt: 1, mb: 1.5, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    {item.address || 'Address not set'}
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<Campaign />}
                    disabled={blastingId === item.donationId}
                    onClick={() => handleBlast(item.donationId)}
                  >
                    {blastingId === item.donationId ? 'Sending…' : 'Blast rescue alert'}
                  </Button>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </PanelSection>
  );
};

export default FoodRescueRadar;
