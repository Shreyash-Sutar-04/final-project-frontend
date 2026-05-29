import React, { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Stack,
  Chip,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import api from '../../utils/api';
import { resolveServerUrl } from '../../utils/appConfig';
import PanelLayout from '../Layout/PanelLayout';
import StatCard from '../Common/StatCard';
import PanelSection from '../Common/PanelSection';
import ChainOfCustodyTimeline from '../Common/ChainOfCustodyTimeline';
import VolunteerLiveMap from '../Common/VolunteerLiveMap';
import { useAuth } from '../../context/AuthContext';

const NeedyPanel = ({ darkMode, setDarkMode }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [availableDonations, setAvailableDonations] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [freshnessRatings, setFreshnessRatings] = useState({});
  const [ratingDialog, setRatingDialog] = useState({ open: false, donationId: null, rating: 3, comment: '' });
  const [timelineRequestId, setTimelineRequestId] = useState(null);
  const [liveMapRequest, setLiveMapRequest] = useState(null);
  const [smsHelpline, setSmsHelpline] = useState(process.env.REACT_APP_SMS_HELPLINE || '');
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  useEffect(() => {
    if (user && user.userId) {
      loadAvailableDonations();
      loadMyRequests();
      api.get('/public/config').then((res) => {
        if (res.data?.smsHelpline) setSmsHelpline(res.data.smsHelpline);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!liveMapRequest?.id) return undefined;
    const interval = setInterval(loadMyRequests, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMapRequest?.id]);

  useEffect(() => {
    if (!liveMapRequest?.id || myRequests.length === 0) return;
    const updatedRequest = myRequests.find((request) => request.id === liveMapRequest.id);
    if (updatedRequest && updatedRequest !== liveMapRequest) {
      setLiveMapRequest(updatedRequest);
    }
  }, [liveMapRequest?.id, myRequests]);

  useEffect(() => {
    // Load freshness ratings for all donations
    availableDonations.forEach(donation => {
      loadFreshnessRating(donation.id);
    });
  }, [availableDonations]);

  const loadAvailableDonations = async () => {
    try {
      const response = await api.get('/donations/available/HUMAN');
      const sorted = [...(response.data || [])].sort((a, b) => {
        const ta = dayjs(a.createdAt).valueOf();
        const tb = dayjs(b.createdAt).valueOf();
        return sortNewestFirst ? tb - ta : ta - tb;
      });
      setAvailableDonations(sorted);
    } catch (err) {
      console.error('Error loading donations:', err);
      const errorMessage = err.response?.data?.message || 'Unable to fetch meals near you.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setAvailableDonations([]);
    }
  };

  const loadMyRequests = async () => {
    try {
      const response = await api.get(`/requests/requester/${user?.userId}`);
      const sorted = [...(response.data || [])].sort((a, b) => {
        const ta = dayjs(a.createdAt).valueOf();
        const tb = dayjs(b.createdAt).valueOf();
        return sortNewestFirst ? tb - ta : ta - tb;
      });
      setMyRequests(sorted);
    } catch (err) {
      console.error('Error loading requests:', err);
      const errorMessage = err.response?.data?.message || 'Unable to load your requests.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setMyRequests([]);
    }
  };

  const loadFreshnessRating = async (donationId) => {
    try {
      const response = await api.get(`/freshness/donation/${donationId}/summary`);
      setFreshnessRatings(prev => ({
        ...prev,
        [donationId]: response.data
      }));
    } catch (err) {
      console.error('Error loading freshness rating:', err);
      // Don't show error, just leave it empty
    }
  };

  const handleRateFreshness = (donationId) => {
    setRatingDialog({ open: true, donationId, rating: 3, comment: '' });
  };

  const handleSubmitRating = async () => {
    try {
      await api.post('/freshness', null, {
        params: {
          donationId: ratingDialog.donationId,
          userId: user?.userId,
          rating: ratingDialog.rating,
          comment: ratingDialog.comment || null,
        }
      });
      enqueueSnackbar('Thank you for rating the freshness!', { variant: 'success' });
      loadFreshnessRating(ratingDialog.donationId);
      setRatingDialog({ open: false, donationId: null, rating: 3, comment: '' });
    } catch (err) {
      console.error('Error rating freshness:', err);
      const errorMessage = err.response?.data?.message || 'Failed to submit rating.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleRequestDonation = async (donationId) => {
    try {
      await api.post(
        `/requests?donationId=${donationId}&requesterId=${user.userId}&requesterType=NEEDY`
      );
      enqueueSnackbar('Request recorded. A volunteer will contact you.', { variant: 'success' });
      loadAvailableDonations();
      loadMyRequests();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Sorry, this donation may already be taken.', { variant: 'warning' });
    }
  };

  const stats = useMemo(
    () => [
      { label: 'Open requests', value: myRequests.filter((r) => r.status !== 'DELIVERED').length },
      { label: 'Delivered meals', value: myRequests.filter((r) => r.status === 'DELIVERED').length },
      { label: 'Meals nearby', value: availableDonations.length },
    ],
    [availableDonations.length, myRequests]
  );

  const statusColor = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'PENDING':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    return resolveServerUrl(photoUrl);
  };

  return (
    <PanelLayout
      title="Meal Request Center"
      subtitle="Find verified donations and follow your delivery status."
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    >
      {/* SMS Helpline Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #2E7D32 0%, #00ACC1 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
          <Box sx={{ textAlign: { xs: 'center', md: 'left' }, flex: 1 }}>
            <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'Poppins' }}>
              📱 No Internet? Text for Food!
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, fontFamily: 'Poppins' }}>
              Send <strong>FOOD</strong>, <strong>HELP</strong>, or <strong>HUNGRY</strong> via SMS to our Twilio helpline.
              We'll auto-create a request and deliver food to you.
            </Typography>
          </Box>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              px: 4,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center',
              minWidth: 200,
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8, fontFamily: 'Poppins' }}>
              SMS HELPLINE
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
              {smsHelpline || 'Configure TWILIO_PHONE_NUMBER'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: 'Poppins' }}>
              Available 24/7 · No app needed
            </Typography>
          </Paper>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          {['1. Text FOOD to helpline', '2. Request registered (max 2/day)', '3. NGO accepts & assigns meal', '4. Volunteer delivers — SMS alert when on the way'].map((step, i) => (
            <Chip
              key={i}
              label={step}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontFamily: 'Poppins',
                fontWeight: 500,
                mb: 0.5,
              }}
            />
          ))}
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard label="Open requests" value={stats[0].value} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Delivered meals" value={stats[1].value} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Meals nearby" value={stats[2].value} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <PanelSection
            title="Available meals"
            subtitle="Tap request to reserve a pickup. Volunteers will handle delivery."
            action={
              <Button size="small" variant="outlined" onClick={loadAvailableDonations}>
                Refresh
              </Button>
            }
          >
            <Grid container spacing={2}>
              {availableDonations.map((donation) => {
                const freshness = freshnessRatings[donation.id];
                const imageUrl = getImageUrl(donation.photoUrl);
                return (
                  <Grid item xs={12} key={donation.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          {imageUrl && (
                            <Grid item xs={12} sm={4}>
                              <Box
                                component="img"
                                src={imageUrl}
                                alt={donation.foodName}
                                sx={{
                                  width: '100%',
                                  height: '150px',
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                }}
                              />
                            </Grid>
                          )}
                          <Grid item xs={12} sm={imageUrl ? 8 : 12}>
                            <Typography variant="h6">{donation.foodName}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {donation.description || 'No extra details provided.'}
                            </Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 1 }}>
                              <Chip label={`${donation.quantity} meals`} size="small" />
                              <Chip
                                label={`Expires ${dayjs(donation.expiryDate).format('MMM DD, HH:mm')}`}
                                size="small"
                                color="warning"
                              />
                            </Stack>
                            {freshness && freshness.totalRatings > 0 && (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <Rating
                                  value={freshness.averageRating}
                                  readOnly
                                  size="small"
                                  precision={0.1}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {freshness.averageRating.toFixed(1)} ({freshness.totalRatings} ratings)
                                </Typography>
                              </Stack>
                            )}
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                        <Button
                          size="small"
                          onClick={() => handleRateFreshness(donation.id)}
                          disabled={!imageUrl}
                        >
                          Rate Freshness
                        </Button>
                        <Button variant="contained" onClick={() => handleRequestDonation(donation.id)}>
                          Request this meal
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
              {availableDonations.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    No meals available right now. Please try again soon.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </PanelSection>
        </Grid>

        <Grid item xs={12} md={5}>
          <PanelSection
            title="My requests"
            subtitle="Watch the status and assigned volunteer for each meal."
            action={
              <Button size="small" variant="outlined" onClick={loadMyRequests}>
                Refresh
              </Button>
            }
            sx={{ height: '100%' }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Meal</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Volunteer</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{request.donation?.foodName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(request.createdAt).format('MMM DD, HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={request.status} size="small" color={statusColor(request.status)} />
                    </TableCell>
                    <TableCell>
                      {request.assignedVolunteer?.fullName || (
                        <Chip label="Pending assignment" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {request.assignedVolunteer && request.status !== 'DELIVERED' && (
                          <Button size="small" color="primary" onClick={() => setLiveMapRequest(request)}>
                            Live map
                          </Button>
                        )}
                        <Button size="small" onClick={() => setTimelineRequestId(request.id)}>
                          Journey
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PanelSection>
        </Grid>
      </Grid>

      <Dialog open={Boolean(liveMapRequest)} onClose={() => setLiveMapRequest(null)} maxWidth="md" fullWidth>
        <DialogTitle>Volunteer on the way</DialogTitle>
        <DialogContent dividers>
          <VolunteerLiveMap request={liveMapRequest} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLiveMapRequest(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(timelineRequestId)} onClose={() => setTimelineRequestId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Meal journey — chain of custody</DialogTitle>
        <DialogContent dividers>
          <ChainOfCustodyTimeline requestId={timelineRequestId} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineRequestId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ratingDialog.open} onClose={() => setRatingDialog({ ...ratingDialog, open: false })}>
        <DialogTitle>Rate Food Freshness</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <Typography variant="body2" color="text.secondary">
              Based on the uploaded image, how fresh does the food look?
            </Typography>
            <Rating
              value={ratingDialog.rating}
              onChange={(event, newValue) => {
                setRatingDialog({ ...ratingDialog, rating: newValue || 3 });
              }}
              size="large"
              icon={<Star fontSize="inherit" />}
              emptyIcon={<StarBorder fontSize="inherit" />}
            />
            <TextField
              label="Comment (optional)"
              multiline
              rows={3}
              value={ratingDialog.comment}
              onChange={(e) => setRatingDialog({ ...ratingDialog, comment: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialog({ ...ratingDialog, open: false })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmitRating}>
            Submit Rating
          </Button>
        </DialogActions>
      </Dialog>
    </PanelLayout>
  );
};

export default NeedyPanel;

