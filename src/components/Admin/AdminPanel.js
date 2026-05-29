import React, { useState, useEffect, useMemo } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Button,
  Box,
  Tabs,
  Tab,
  TextField,
} from '@mui/material';
import dayjs from 'dayjs';
import {
  CheckCircle,
  HighlightOff,
  Refresh,
  PeopleAltRounded,
  VolunteerActivismRounded,
  AssignmentRounded,
  HourglassTopRounded,
  Download,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../utils/api';
import { downloadAnalyticsPdf } from '../../utils/downloadAnalyticsReport';
import { downloadAnalyticsCsv } from '../../utils/downloadAnalyticsCsv';
import PanelLayout from '../Layout/PanelLayout';
import StatCard from '../Common/StatCard';
import PanelSection from '../Common/PanelSection';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { panelSectionSx } from '../../styles/panelUi';
import AdminLiveFleetMap from './AdminLiveFleetMap';
import FoodRescueRadar from './FoodRescueRadar';

const AdminPanel = ({ darkMode, setDarkMode }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonations: 0,
    totalRequests: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [demandForecast, setDemandForecast] = useState(null);
  const [wasteAnalytics, setWasteAnalytics] = useState(null);
  const [communityImpact, setCommunityImpact] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [allDonations, setAllDonations] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [opsDateFilter, setOpsDateFilter] = useState('');
  const [opsSortNewest, setOpsSortNewest] = useState(true);
  const [liveMapConnected, setLiveMapConnected] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  useEffect(() => {
    // Only load data if user is authenticated
    if (user && user.token) {
      loadData();
    }
  }, [user]);

  const handlePdf = async (path, filename) => {
    try {
      await downloadAnalyticsPdf(path, filename);
      enqueueSnackbar('Report downloaded.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e.message || 'Download failed', { variant: 'error' });
    }
  };

  const filteredOpsDonations = useMemo(() => {
    let list = [...allDonations];
    if (opsDateFilter) {
      list = list.filter((d) => dayjs(d.createdAt).format('YYYY-MM-DD') === opsDateFilter);
    }
    list.sort((a, b) => {
      const ta = dayjs(a.createdAt).valueOf();
      const tb = dayjs(b.createdAt).valueOf();
      return opsSortNewest ? tb - ta : ta - tb;
    });
    return list.slice(0, 50);
  }, [allDonations, opsDateFilter, opsSortNewest]);

  const filteredOpsRequests = useMemo(() => {
    let list = [...allRequests];
    if (opsDateFilter) {
      list = list.filter((r) => dayjs(r.createdAt).format('YYYY-MM-DD') === opsDateFilter);
    }
    list.sort((a, b) => {
      const ta = dayjs(a.createdAt).valueOf();
      const tb = dayjs(b.createdAt).valueOf();
      return opsSortNewest ? tb - ta : ta - tb;
    });
    return list.slice(0, 50);
  }, [allRequests, opsDateFilter, opsSortNewest]);

  const handleCsv = async (path, filename) => {
    try {
      await downloadAnalyticsCsv(path, filename);
      enqueueSnackbar('CSV downloaded.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e.message || 'Download failed', { variant: 'error' });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, pendingRes, donationsRes, requestsRes, flaggedRes, heatmapRes, forecastRes, wasteRes, impactRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/pending'),
        api.get('/donations'),
        api.get('/requests'),
        api.get('/admin/flagged-users').catch(() => ({ data: [] })),
        api.get('/analytics/hunger-heatmap').catch(() => ({ data: [] })),
        api.get('/analytics/demand-forecast').catch(() => ({ data: null })),
        api.get('/analytics/waste-analytics').catch(() => ({ data: null })),
        api.get('/analytics/community-impact').catch(() => ({ data: null })),
      ]);

      setAllUsers(usersRes.data || []);
      setAllDonations(donationsRes.data || []);
      setAllRequests(requestsRes.data || []);
      setPendingUsers(pendingRes.data || []);
      setStats({
        totalUsers: usersRes.data?.length || 0,
        totalDonations: donationsRes.data?.length || 0,
        totalRequests: requestsRes.data?.length || 0,
        pendingApprovals: pendingRes.data?.length || 0,
      });
      setFlaggedUsers(flaggedRes.data || []);
      setHeatmapPoints(heatmapRes.data || []);
      setDemandForecast(forecastRes.data || null);
      setWasteAnalytics(wasteRes.data || null);
      setCommunityImpact(impactRes.data || null);
    } catch (err) {
      console.error('Error loading admin data:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Unable to load admin data. Please check your connection and try again.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      
      // Set empty arrays on error to prevent UI issues
      setAllUsers([]);
      setPendingUsers([]);
      setFlaggedUsers([]);
      setHeatmapPoints([]);
      setDemandForecast(null);
      setStats({
        totalUsers: 0,
        totalDonations: 0,
        totalRequests: 0,
        pendingApprovals: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, status) => {
    if (!userId || !status) {
      enqueueSnackbar('Invalid user ID or status. Please refresh the page.', { variant: 'error' });
      return;
    }

    setUpdatingUserId(userId);
    try {
      console.log(`Updating user ${userId} status to ${status}`);
      const url = `/users/${userId}/status?status=${status}`;
      console.log('API URL:', url);
      
      const response = await api.put(url);
      console.log('Update response:', response.data);
      
      const successMessage = status === 'APPROVED' 
        ? 'User approved successfully! They can now log in.' 
        : `User ${status.toLowerCase()} successfully.`;
      enqueueSnackbar(successMessage, { variant: 'success' });
      
      // Update local state immediately for better UX
      if (status === 'APPROVED' || status === 'REJECTED') {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        setAllUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, status: status } : u
        ));
        setStats(prev => ({
          ...prev,
          pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
        }));
      }
      
      // Reload data to ensure consistency
      await loadData();
    } catch (err) {
      console.error('Error updating user status:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      
      const errorData = err.response?.data;
      let errorMessage = 'Failed to update user status. Please try again.';
      
      if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please ensure the backend server is running and try again.';
        if (errorData?.message) {
          errorMessage += ` Details: ${errorData.message}`;
        }
      } else if (errorData) {
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error === 'USER_NOT_FOUND') {
          errorMessage = 'User not found. It may have been deleted.';
        } else if (errorData.error === 'INVALID_STATUS') {
          errorMessage = 'Invalid status value. Please refresh and try again.';
        } else if (errorData.error === 'DATABASE_ERROR') {
          errorMessage = 'Database connection error. Please try again later.';
        } else if (errorData.error) {
          errorMessage = `Error: ${errorData.error}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const statItems = useMemo(
    () => [
      { label: 'Total Users', value: stats.totalUsers },
      { label: 'Donations Posted', value: stats.totalDonations },
      { label: 'Requests Created', value: stats.totalRequests },
      { label: 'Pending Approvals', value: stats.pendingApprovals },
      { label: 'Flagged Users', value: flaggedUsers.length },
    ],
    [stats, flaggedUsers.length]
  );

  return (
    <PanelLayout
      title="Admin Command Center"
      subtitle="Manage user registrations, monitor system activity, and drive impact."
      actions={
        <Button
          startIcon={<Refresh />}
          variant="outlined"
          size="small"
          onClick={loadData}
          disabled={loading}
          sx={{ fontFamily: 'Poppins' }}
        >
          Refresh data
        </Button>
      }
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statItems.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <StatCard {...item} />
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={(theme) => ({
          ...panelSectionSx(theme),
          overflow: 'hidden',
          p: 0,
        })}
      >
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: { xs: 1, sm: 2 },
            pt: 1,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontFamily: 'Poppins',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 52,
            },
          }}
        >
          <Tab label="User Management" />
          <Tab label="Analytics Dashboard" />
          <Tab label="Live Tracking" />
          <Tab label="Reports & Downloads" />
          <Tab label="System Monitoring" />
          <Tab label="SMS Management" />
          <Tab label="Operations Log" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    backgroundColor: 'background.paper',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
                    }
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <div>
                      <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                        Pending Approvals
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                        Review accounts awaiting manual verification
                      </Typography>
                    </div>
                    <Chip
                      label={`${pendingUsers.length} waiting`}
                      color="warning"
                      sx={{ fontFamily: 'Poppins', fontWeight: 600 }}
                    />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>User</TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>Role</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading && pendingUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ fontFamily: 'Poppins' }}>
                              Loading pending users...
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : pendingUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ fontFamily: 'Poppins' }}>
                              All caught up! No pending requests.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingUsers.map((account) => (
                          <TableRow
                            key={account.id}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                                {account.fullName || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                                {account.email || 'No email'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={account.userType}
                                sx={{ fontFamily: 'Poppins', fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Approve User">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleStatusChange(account.id, 'APPROVED')}
                                    disabled={updatingUserId === account.id}
                                    sx={{
                                      '&:hover': {
                                        backgroundColor: 'success.light',
                                        color: 'success.contrastText',
                                      },
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject User">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleStatusChange(account.id, 'REJECTED')}
                                    disabled={updatingUserId === account.id}
                                    sx={{
                                      '&:hover': {
                                        backgroundColor: 'error.light',
                                        color: 'error.contrastText',
                                      },
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <HighlightOff fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
             </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    backgroundColor: 'background.paper',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
                    }
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <div>
                      <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                        Partner Directory
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                        Full visibility into all registered users
                      </Typography>
                    </div>
                    <Chip
                      label={`${allUsers.length} total`}
                      color="primary"
                      sx={{ fontFamily: 'Poppins', fontWeight: 600 }}
                    />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>Role</TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading && allUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ fontFamily: 'Poppins' }}>
                              Loading users...
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : allUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ fontFamily: 'Poppins' }}>
                              No users found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        allUsers.map((account) => (
                          <TableRow
                            key={account.id}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                                {account.fullName || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                                {account.email || 'No email'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={account.userType}
                                variant="outlined"
                                sx={{ fontFamily: 'Poppins', fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={account.status || 'PENDING'}
                                color={
                                  account.status === 'APPROVED'
                                    ? 'success'
                                    : account.status === 'PENDING'
                                    ? 'warning'
                                    : 'error'
                                }
                                variant="outlined"
                                sx={{ fontFamily: 'Poppins', fontWeight: 500 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
               </Paper>
              </Grid>

              <Grid item xs={12}>
                <PanelSection title="Fraud watchlist">
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Users auto-flagged for unusual cancellation or proof behavior.
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {flaggedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.fullName || u.username}</TableCell>
                          <TableCell>{u.userType}</TableCell>
                        </TableRow>
                      ))}
                      {flaggedUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2}>No flagged users currently.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </PanelSection>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <PanelSection title="Hunger heatmap" noDivider>
                  <Box sx={{ height: 280, borderRadius: 2, overflow: 'hidden' }}>
                    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ width: '100%', height: '100%' }}>
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {heatmapPoints.map((point, idx) => (
                        <CircleMarker
                          key={`${point.latitude}-${point.longitude}-${idx}`}
                          center={[point.latitude, point.longitude]}
                          radius={point.demandLevel === 'HIGH' ? 14 : point.demandLevel === 'MEDIUM' ? 10 : 7}
                          pathOptions={{
                            color: point.demandLevel === 'HIGH' ? '#d32f2f' : point.demandLevel === 'MEDIUM' ? '#f9a825' : '#2e7d32',
                            fillOpacity: 0.45,
                          }}
                        >
                          <Popup>{point.requestCount} requests ({point.demandLevel})</Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </Box>
                </PanelSection>
              </Grid>
              <Grid item xs={12} md={5}>
                <PanelSection title="Demand prediction" noDivider>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {demandForecast?.prediction || 'Forecast unavailable'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Last 7 days requests: {demandForecast?.last7DaysRequests ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Peak window: {demandForecast?.peakWindow || '18:00 - 22:00'}
                  </Typography>
                </PanelSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <PanelSection title="Food waste analytics">
                  {wasteAnalytics ? (
                    <Box>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        Donations analyzed (7 days): {wasteAnalytics.totalDonationsAnalyzed ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        High-risk (expiring &lt; 4h): {wasteAnalytics.highRiskDonationsCount ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Waste prevention rate: {Math.round((wasteAnalytics.wastePreventionRate ?? 0) * 100)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Food types wasted: {Object.keys(wasteAnalytics.wasteByFoodType || {}).length}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Waste analytics data not available
                    </Typography>
                  )}
                </PanelSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <PanelSection title="Community impact">
                  {communityImpact ? (
                    <Box>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        People fed: {communityImpact.peopleFed || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Meals distributed: {communityImpact.mealsDistributed || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Active volunteers: {communityImpact.activeVolunteers || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Partner organizations: {communityImpact.partnerOrganizations || 0}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Community impact data not available
                    </Typography>
                  )}
                </PanelSection>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <PanelSection title="Live volunteer fleet map">
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Real-time positions for all assigned and in-transit deliveries (WebSocket + REST).
                  </Typography>
                  <AdminLiveFleetMap onConnectionChange={setLiveMapConnected} />
                </PanelSection>
              </Grid>
              <Grid item xs={12}>
                <FoodRescueRadar />
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <PanelSection title="Downloadable reports">
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ fontFamily: 'Poppins', justifyContent: 'flex-start', p: 2 }}
                        onClick={() => handlePdf('/analytics/user-report', 'user-report.pdf')}
                      >
                        User Activity Report (PDF)
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ fontFamily: 'Poppins', justifyContent: 'flex-start', p: 2 }}
                        onClick={() => handlePdf('/analytics/donation-report', 'donation-report.pdf')}
                      >
                        Donation Analytics Report (PDF)
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ fontFamily: 'Poppins', justifyContent: 'flex-start', p: 2 }}
                        onClick={() => handlePdf('/analytics/impact-report', 'impact-report.pdf')}
                      >
                        Community Impact Report (PDF)
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ fontFamily: 'Poppins', justifyContent: 'flex-start', p: 2 }}
                        onClick={() => handlePdf('/analytics/waste-report', 'waste-report.pdf')}
                      >
                        Food Waste Report (PDF)
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ fontFamily: 'Poppins', justifyContent: 'flex-start', p: 2 }}
                        onClick={() => handlePdf('/analytics/export-data', 'export-data.pdf')}
                      >
                        Export All Data (PDF)
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ fontFamily: 'Poppins', justifyContent: 'flex-start', p: 2 }}
                        onClick={() => handleCsv('/analytics/export-data', 'export-data.csv')}
                      >
                        Export All Data (CSV)
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ fontFamily: 'Poppins', justifyContent: 'flex-start', p: 2 }}
                        onClick={() => handlePdf('/analytics/monthly-summary', 'monthly-summary.pdf')}
                      >
                        Monthly Summary Report (PDF)
                      </Button>
                    </Grid>
                  </Grid>
                </PanelSection>
              </Grid>
            </Grid>
          )}

          {activeTab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <PanelSection title="System health">
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'success.main', mr: 1 }} />
                    <Typography variant="body2">Database: Connected</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: liveMapConnected ? 'success.main' : 'warning.main',
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">
                      WebSocket fleet feed: {liveMapConnected ? 'Connected (open Live Tracking tab)' : 'Open Live Tracking tab to connect'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'warning.main', mr: 1 }} />
                    <Typography variant="body2">Cache: Warming up</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Last system check: {new Date().toLocaleString()}
                  </Typography>
                </PanelSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <PanelSection title="Recent activity">
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • User registration spike detected
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • High demand in Mumbai region
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • Emergency mode activated in Delhi
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • New volunteer onboarded
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      • Compost pickup completed
                    </Typography>
                  </Box>
                </PanelSection>
              </Grid>
            </Grid>
          )}

          {activeTab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, #2E7D32 0%, #00ACC1 100%)',
                    color: 'white',
                    borderRadius: 3,
                    mb: 3,
                  }}
                >
                  <Typography variant="h5" sx={{ fontFamily: 'Poppins', fontWeight: 700, mb: 1 }}>
                    📱 Twilio SMS Food Request System
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Poppins' }}>
                    Needy people without internet can text FOOD, HELP, or HUNGRY to automatically request meals.
                    The system auto-creates a user, matches the nearest donation, assigns a volunteer, and sends a confirmation SMS.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <PanelSection title="SMS pipeline flow">
                  {[
                    { step: '1', icon: '📱', text: 'Needy person texts FOOD / HELP / HUNGRY to Twilio number' },
                    { step: '2', icon: '🔗', text: 'Twilio webhook hits POST /api/sms/webhook endpoint' },
                    { step: '3', icon: '⚡', text: 'SmsIntakeService auto-creates user + food request' },
                    { step: '4', icon: '🎯', text: 'System matches nearest available donation' },
                    { step: '5', icon: '🛵', text: 'Volunteer auto-assigned for pickup & delivery' },
                    { step: '6', icon: '✅', text: 'Confirmation SMS sent back via TwiML response' },
                  ].map((item) => (
                    <Stack key={item.step} direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                      <Chip
                        label={item.step}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700, minWidth: 28 }}
                      />
                      <Typography variant="body2" sx={{ fontFamily: 'Poppins' }}>
                        {item.icon} {item.text}
                      </Typography>
                    </Stack>
                  ))}
                </PanelSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <PanelSection title="SMS configuration">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Webhook URL</TableCell>
                        <TableCell><code>/api/sms/webhook</code></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>HTTP Method</TableCell>
                        <TableCell>POST (form-urlencoded)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Keywords</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Chip label="FOOD" size="small" color="success" />
                            <Chip label="HELP" size="small" color="warning" />
                            <Chip label="HUNGRY" size="small" color="info" />
                          </Stack>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Daily Limit</TableCell>
                        <TableCell>2 requests per phone number</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Response</TableCell>
                        <TableCell>TwiML XML auto-reply</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Flow</TableCell>
                        <TableCell>Creates PENDING needy request → NGOs notified → volunteer assigned → SMS alert sent</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell>
                          <Chip label="Active" size="small" color="success" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </PanelSection>
              </Grid>

              <Grid item xs={12}>
                <PanelSection title="SMS-originated requests">
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Requests that were created via the Twilio SMS webhook.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SMS requests will appear here once the Twilio webhook is configured and users begin texting.
                    Configure your Twilio number's webhook URL to: <code>https://your-server/api/sms/webhook</code>
                  </Typography>
                </PanelSection>
              </Grid>
            </Grid>
          )}

          {activeTab === 6 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
                  <TextField
                    type="date"
                    label="Filter by date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={opsDateFilter}
                    onChange={(e) => setOpsDateFilter(e.target.value)}
                  />
                  <Button size="small" onClick={() => setOpsSortNewest((v) => !v)}>
                    Sort: {opsSortNewest ? 'Newest first' : 'Oldest first'}
                  </Button>
                  <Button size="small" onClick={() => setOpsDateFilter('')}>
                    Clear filter
                  </Button>
                  <Chip label={`Showing up to 50 of ${allDonations.length} donations`} size="small" />
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <PanelSection title="Donations">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Food</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredOpsDonations.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.foodName}</TableCell>
                          <TableCell><Chip label={d.status} size="small" /></TableCell>
                          <TableCell>{dayjs(d.createdAt).format('MMM DD, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </PanelSection>
              </Grid>
              <Grid item xs={12} md={6}>
                <PanelSection title="Requests">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredOpsRequests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>#{r.id}</TableCell>
                          <TableCell><Chip label={r.status} size="small" /></TableCell>
                          <TableCell>{dayjs(r.createdAt).format('MMM DD, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </PanelSection>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </PanelLayout>
  );
};

export default AdminPanel;

