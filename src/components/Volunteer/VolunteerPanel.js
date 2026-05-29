import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Input,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useSnackbar } from 'notistack';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import PanelLayout from '../Layout/PanelLayout';
import StatCard from '../Common/StatCard';
import PanelSection from '../Common/PanelSection';
import api from '../../utils/api';
import { WS_SOCKJS_URL, resolveServerUrl } from '../../utils/appConfig';
import { useAuth } from '../../context/AuthContext';
import { resolvePickupLocation, resolveRequestDestination } from '../../utils/location';
import L from 'leaflet';
import { formatDistance, formatDuration, getRoute } from '../../utils/routing';
import { interpolateAlongRoute } from '../../utils/routeSimulation';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCodeScanner } from '@mui/icons-material';
import { bearingDeg } from '../../utils/geo';
import dayjs from 'dayjs';
import QrScannerDialog from '../Common/QrScannerDialog';

const mapContainerStyle = { width: '100%', height: 360, borderRadius: 12 };

const MapAutoCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center?.[0] && center?.[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

const VolunteerPanel = ({ darkMode, setDarkMode }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [animatedPosition, setAnimatedPosition] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [points, setPoints] = useState(null);
  const clientRef = useRef(null);
  const trackingSubRef = useRef(null);
  const pendingSubscriptionRequestId = useRef(null);
  const geoWatchRef = useRef(null);
  const [client, setClient] = useState(null);
  const animationFrameRef = useRef(null);
  const [deliveryDialog, setDeliveryDialog] = useState({
    open: false,
    request: null,
    note: '',
    imageFile: null,
    imagePreview: null,
    uploading: false,
  });
  const [badges, setBadges] = useState([]);
  const [qrVerificationToken, setQrVerificationToken] = useState('');
  const [qrScanner, setQrScanner] = useState({ open: false, stage: 'PICKUP' });
  const [riderBearing, setRiderBearing] = useState(0);
  const routeDebounceRef = useRef(null);
  const lastTrackingErrorRef = useRef(0);
  const routeSimRef = useRef(null);
  const [useAddressTracking, setUseAddressTracking] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const isPickedUp = selectedRequest?.status === 'PICKED_UP';
  const targetLocation = isPickedUp ? destinationLocation : pickupLocation;
  const targetLabel = isPickedUp ? 'Destination' : 'Pickup';

  const bikeIcon = useMemo(
    () =>
      L.divIcon({
        html: `<div style="font-size:28px;line-height:28px;transform:rotate(${riderBearing}deg);transition:transform 0.45s ease-out;">🏍️</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    [riderBearing],
  );

  useEffect(() => {
    if (user && user.userId && user.token) {
      loadRequests();
      loadMyRequests();
      loadPoints();
      loadBadges();
      const stomp = connectWebSocket();
      return () => {
        stomp?.deactivate();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.userId) {
      loadRequests();
      loadMyRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortNewestFirst]);

  const connectWebSocket = () => {
    const stomp = new Client({
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(WS_SOCKJS_URL),
    });
    stomp.onConnect = () => {
      clientRef.current = stomp;
      setClient(stomp);
      stomp.subscribe('/topic/role/volunteer', (message) => {
        try {
          const payload = JSON.parse(message.body);
          if (payload?.message) {
            const variant =
              payload.type === 'RESCUE_RADAR' || payload.type === 'URGENT_DONATION'
                ? 'warning'
                : 'info';
            enqueueSnackbar(payload.message, { variant, autoHideDuration: 8000 });
            if (payload.type === 'RESCUE_RADAR' || payload.type === 'URGENT_DONATION') {
              loadRequests();
            }
          }
        } catch {
          // ignore
        }
      });
      if (pendingSubscriptionRequestId.current) {
        const requestId = pendingSubscriptionRequestId.current;
        pendingSubscriptionRequestId.current = null;
        subscribeToRequest(requestId);
      }
    };
    stomp.activate();
    return stomp;
  };

  const subscribeToRequest = (requestId) => {
    if (!clientRef.current) {
      pendingSubscriptionRequestId.current = requestId;
      return;
    }
    if (trackingSubRef.current) {
      trackingSubRef.current.unsubscribe();
      trackingSubRef.current = null;
    }
    trackingSubRef.current = clientRef.current.subscribe(`/topic/tracking/${requestId}`, (message) => {
      const data = JSON.parse(message.body);
      setTracking(data);
    });
  };

  const sortByDate = (list) => {
    const sorted = [...(list || [])].sort((a, b) => {
      const ta = dayjs(a.createdAt).valueOf();
      const tb = dayjs(b.createdAt).valueOf();
      return sortNewestFirst ? tb - ta : ta - tb;
    });
    return sorted;
  };

  const loadRequests = async () => {
    if (!user || !user.token) return;
    try {
      const response = await api.get('/requests/claimable');
      setRequests(sortByDate(response.data || []));
    } catch (err) {
      console.error('Error loading requests:', err);
      // Don't show error for 401/403 - might be user not approved yet
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        const errorMessage = err.response?.data?.message || 'Unable to load open pickups.';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      }
      setRequests([]);
    }
  };

  const loadMyRequests = async () => {
    if (!user || !user.token || !user.userId) return;
    try {
      const response = await api.get(`/requests/volunteer/${user.userId}`);
      const active = (response.data || []).filter(
        (r) => !['DELIVERED', 'COMPLETED', 'COMPOSTED', 'CANCELLED'].includes(r.status),
      );
      setMyRequests(sortByDate(active));
    } catch (err) {
      console.error('Error loading my requests:', err);
      // Don't show error for 401/403 - might be user not approved yet
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        const errorMessage = err.response?.data?.message || 'Unable to load your deliveries.';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      }
      setMyRequests([]);
    }
  };

  const loadPoints = async () => {
    try {
      const response = await api.get(`/gamification/points/${user?.userId}`);
      setPoints(response.data);
    } catch (err) {
      console.error('Error loading points:', err);
      // Don't show error for points, just leave it empty
      setPoints(null);
    }
  };

  const loadBadges = async () => {
    try {
      const response = await api.get(`/gamification/badges/${user?.userId}`);
      setBadges(response.data || []);
    } catch {
      setBadges([]);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await api.put(`/requests/${requestId}/assign?volunteerId=${user.userId}`);
      enqueueSnackbar('Pickup claimed! Tap Track to share your live location.', { variant: 'success' });
      loadRequests();
      loadMyRequests();
      if (res.data) {
        setSelectedRequest(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Claim failed. NGO must accept the request first.';
      enqueueSnackbar(msg, { variant: 'warning' });
    }
  };

  const handleStartTracking = async (request) => {
    setSelectedRequest(request);
    setPickupLocation(null);
    setDestinationLocation(null);
    subscribeToRequest(request.id);
    const [pickup, destination] = await Promise.all([
      resolvePickupLocation(request),
      resolveRequestDestination(request),
    ]);
    setPickupLocation(pickup);
    setDestinationLocation(destination);
  };

  const pushLocation = async (req, latitude, longitude, address) => {
    if (!req || !user?.userId) return;
    try {
      const params = { requestId: req.id };
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        params.latitude = latitude;
        params.longitude = longitude;
      } else if (address) {
        params.address = address;
      } else {
        return;
      }
      setTracking({ latitude: params.latitude, longitude: params.longitude });
      await api.post('/tracking', null, { params });
    } catch {
      const now = Date.now();
      if (now - lastTrackingErrorRef.current > 8000) {
        enqueueSnackbar('Live tracking is reconnecting. Your location will retry automatically.', { variant: 'warning' });
        lastTrackingErrorRef.current = now;
      }
    }
  };

  useEffect(() => {
    if (!tracking?.latitude || !tracking?.longitude) return;
    const target = [tracking.latitude, tracking.longitude];
    if (!animatedPosition) {
      setAnimatedPosition(target);
      return;
    }
    setRiderBearing(bearingDeg(animatedPosition[0], animatedPosition[1], target[0], target[1]));

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const start = performance.now();
    const durationMs = 900;
    const from = animatedPosition;

    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const lat = from[0] + (target[0] - from[0]) * progress;
      const lng = from[1] + (target[1] - from[1]) * progress;
      setAnimatedPosition([lat, lng]);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking]);

  useEffect(() => {
    if (routeDebounceRef.current) {
      clearTimeout(routeDebounceRef.current);
    }
    routeDebounceRef.current = setTimeout(async () => {
      if (!animatedPosition || !targetLocation) {
        setRoutePath([]);
        setEtaSeconds(null);
        setDistanceMeters(null);
        return;
      }
      try {
        const route = await getRoute(animatedPosition, targetLocation);
        if (route) {
          setRoutePath(route.points);
          setEtaSeconds(route.durationSeconds);
          setDistanceMeters(route.distanceMeters);
        }
      } catch {
        setRoutePath([]);
      }
    }, 350);
    return () => {
      if (routeDebounceRef.current) {
        clearTimeout(routeDebounceRef.current);
      }
    };
  }, [animatedPosition, targetLocation]);

  useEffect(() => {
    if (!selectedRequest) {
      return undefined;
    }

    const startRouteSimulation = () => {
      if (!routePath?.length || routePath.length < 2) return;
      let progress = 0;
      routeSimRef.current = setInterval(() => {
        progress += 0.012;
        if (progress > 1) progress = 0;
        const pos = interpolateAlongRoute(routePath, progress);
        if (pos) {
          setTracking({ latitude: pos[0], longitude: pos[1] });
          pushLocation(selectedRequest, pos[0], pos[1]);
        }
      }, 2500);
    };

    if (navigator.geolocation && !useAddressTracking) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          pushLocation(
            selectedRequest,
            position.coords.latitude,
            position.coords.longitude,
          );
        },
        () => {
          setUseAddressTracking(true);
          enqueueSnackbar('Using address-based route tracking (no GPS required).', { variant: 'info' });
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
      );
    } else if (useAddressTracking && routePath?.length > 1) {
      startRouteSimulation();
    } else if (selectedRequest.deliveryAddress || selectedRequest.pickupAddress) {
      const addr = selectedRequest.deliveryAddress || selectedRequest.pickupAddress;
      pushLocation(selectedRequest, null, null, addr);
      const interval = setInterval(() => pushLocation(selectedRequest, null, null, addr), 5000);
      return () => clearInterval(interval);
    }

    return () => {
      if (geoWatchRef.current != null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      if (routeSimRef.current) {
        clearInterval(routeSimRef.current);
        routeSimRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest, routePath, useAddressTracking]);

  useEffect(() => {
    if (useAddressTracking && selectedRequest && routePath?.length > 1 && !routeSimRef.current) {
      let progress = 0;
      routeSimRef.current = setInterval(() => {
        progress += 0.012;
        if (progress > 1) progress = 0;
        const pos = interpolateAlongRoute(routePath, progress);
        if (pos) {
          setTracking({ latitude: pos[0], longitude: pos[1] });
          pushLocation(selectedRequest, pos[0], pos[1]);
        }
      }, 2500);
      return () => {
        if (routeSimRef.current) {
          clearInterval(routeSimRef.current);
          routeSimRef.current = null;
        }
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAddressTracking, routePath, selectedRequest]);

  const handleOpenDeliveredDialog = (request) => {
    if (request.status !== 'PICKED_UP') {
      enqueueSnackbar('Scan pickup QR or mark picked up before delivery.', { variant: 'warning' });
      return;
    }
    if (!request.deliveryQrVerified) {
      enqueueSnackbar('Scan delivery QR at the recipient before confirming delivery.', { variant: 'warning' });
      return;
    }
    setDeliveryDialog({
      open: true,
      request,
      note: '',
      imageFile: null,
      imagePreview: null,
      uploading: false,
    });
  };

  const handleProofFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Please select a valid image file for delivery proof.', { variant: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDeliveryDialog((prev) => ({ ...prev, imagePreview: reader.result, imageFile: file }));
    };
    reader.readAsDataURL(file);
  };

  const uploadProofImage = async (file) => {
    const payload = new FormData();
    payload.append('file', file);
    const response = await api.post('/files/upload', payload);
    const url = response.data?.url;
    return resolveServerUrl(url);
  };

  const handleConfirmDelivered = async () => {
    const request = deliveryDialog.request;
    if (!request) return;
    if (!deliveryDialog.imageFile) {
      enqueueSnackbar('Delivery proof image is required.', { variant: 'warning' });
      return;
    }

    setDeliveryDialog((prev) => ({ ...prev, uploading: true }));
    try {
      const proofUrl = await uploadProofImage(deliveryDialog.imageFile);
      await api.put(`/requests/${request.id}/status`, null, {
        params: {
          status: 'DELIVERED',
          deliveryProofUrl: proofUrl,
          deliveryProofNote: deliveryDialog.note || null,
        },
      });
      enqueueSnackbar('Delivery confirmed. Thank you!', { variant: 'success' });
      loadMyRequests();
      setSelectedRequest(null);
      setTracking(null);
      setAnimatedPosition(null);
      setPickupLocation(null);
      setDestinationLocation(null);
      setRoutePath([]);
      setEtaSeconds(null);
      setDistanceMeters(null);
      setDeliveryDialog({
        open: false,
        request: null,
        note: '',
        imageFile: null,
        imagePreview: null,
        uploading: false,
      });
    } catch {
      enqueueSnackbar('Could not mark as delivered.', { variant: 'error' });
    } finally {
      setDeliveryDialog((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleVerifyQrWithToken = async (requestId, stage, token) => {
    try {
      const res = await api.post(`/requests/${requestId}/verify-qr`, null, {
        params: { token: (token || '').trim(), stage },
      });
      enqueueSnackbar(`${stage} QR verified successfully.`, { variant: 'success' });
      setQrVerificationToken('');
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(res.data);
      }
      loadMyRequests();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'QR verification failed.', { variant: 'error' });
    }
  };

  const stats = useMemo(
    () => [
      { label: 'Open pickups', value: requests.length },
      { label: 'My assignments', value: myRequests.filter((r) => r.status !== 'DELIVERED').length },
      { label: 'Points', value: points?.totalPoints ?? 0 },
    ],
    [requests.length, myRequests, points]
  );

  return (
    <PanelLayout
      title="Volunteer Live Ops"
      subtitle="Claim pickups, stream your GPS, and close deliveries in real-time."
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <StatCard {...item} />
          </Grid>
        ))}
      </Grid>
      <PanelSection title="Volunteer reputation badges" sx={{ mb: 3 }} disableHover>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {badges.map((b) => (
            <Chip key={b.id} label={b.badge?.name || 'Badge'} color="secondary" sx={{ mb: 1 }} />
          ))}
          {badges.length === 0 && <Chip label="Complete deliveries to earn badges" variant="outlined" />}
        </Stack>
      </PanelSection>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PanelSection
            title="Available pickups"
            subtitle="Accept a request to lock it and begin navigation."
            action={
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => setSortNewestFirst((v) => !v)}>
                  {sortNewestFirst ? 'Newest' : 'Oldest'}
                </Button>
                <Button size="small" variant="outlined" onClick={loadRequests}>
                  Refresh
                </Button>
              </Stack>
            }
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Meal</TableCell>
                  <TableCell>Pickup address</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.donation?.foodName}</TableCell>
                    <TableCell>{request.pickupAddress || request.donation?.address}</TableCell>
                    <TableCell>
                      <Chip label={request.status} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right">
                      {!request.assignedVolunteer && (
                        <Button size="small" variant="contained" onClick={() => handleAcceptRequest(request.id)}>
                          Accept
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PanelSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <PanelSection
            title="My active deliveries"
            subtitle="Tap track to broadcast your live location."
            action={
              <Button size="small" variant="outlined" onClick={loadMyRequests}>
                Refresh
              </Button>
            }
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Meal</TableCell>
                  <TableCell>Drop location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myRequests
                  .filter((r) => r.status !== 'DELIVERED')
                  .map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.donation?.foodName}</TableCell>
                      <TableCell>{request.deliveryAddress}</TableCell>
                      <TableCell>
                        <Chip label={request.status} size="small" color="info" />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={() => handleStartTracking(request)}>
                            Track
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<QrCodeScanner />}
                            onClick={() => setQrScanner({ open: true, stage: 'PICKUP', requestId: request.id })}
                          >
                            Scan Pickup QR
                          </Button>
                          <Button
                            size="small"
                            color="success"
                            variant="contained"
                            disabled={!request.pickupQrVerified || !request.deliveryQrVerified}
                            onClick={() => handleOpenDeliveredDialog(request)}
                          >
                            Delivered
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

      {selectedRequest && (
        <PanelSection
          title={`Live tracking — ${selectedRequest.donation?.foodName}`}
          sx={{ mt: 3 }}
        >
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
            <Chip
              color="primary"
              label={`ETA ${formatDuration(etaSeconds)}`}
            />
            <Chip
              color="secondary"
              label={`Distance ${formatDistance(distanceMeters)}`}
            />
          </Stack>
          <MapContainer
            center={
              animatedPosition
                ? animatedPosition
                : destinationLocation || pickupLocation || [20.5937, 78.9629]
            }
            zoom={14}
            style={mapContainerStyle}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {animatedPosition && (
              <Marker position={animatedPosition} icon={bikeIcon}>
                <Popup>Volunteer live location</Popup>
              </Marker>
            )}
              {pickupLocation && (
              <Marker position={pickupLocation}>
                <Popup>Pickup point</Popup>
              </Marker>
            )}
            {destinationLocation && (
              <Marker position={destinationLocation}>
                <Popup>Destination</Popup>
              </Marker>
            )}
            {routePath.length > 1 && (
              <Polyline
                positions={routePath}
                pathOptions={{ color: '#2e7d32', weight: 5 }}
              />
            )}
            {!routePath.length && animatedPosition && targetLocation && (
              <Polyline
                positions={[animatedPosition, targetLocation]}
                pathOptions={{ color: '#2e7d32', weight: 4, dashArray: '6,8' }}
              />
            )}
            {pickupLocation && destinationLocation && (
              <Polyline
                positions={[pickupLocation, destinationLocation]}
                pathOptions={{ color: '#1976d2', weight: 4, dashArray: '10,10' }}
              />
            )}
            <MapAutoCenter center={animatedPosition || pickupLocation || destinationLocation || null} />
          </MapContainer>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2} alignItems="center">
            <Box>
              <Typography variant="subtitle2">Pickup/Delivery QR</Typography>
              <QRCodeCanvas value={selectedRequest.qrToken || 'pending-qr'} size={120} />
            </Box>
            <Button
              variant="outlined"
              startIcon={<QrCodeScanner />}
              onClick={() => setQrScanner({ open: true, stage: 'DELIVERY', requestId: selectedRequest.id })}
            >
              Scan Delivery QR
            </Button>
            <Button variant="text" onClick={() => setUseAddressTracking((v) => !v)}>
              {useAddressTracking ? 'GPS mode' : 'Address route mode'}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Flow: Verify Pickup QR → ride to destination (live bike on map) → Verify Delivery QR → upload proof → Delivered.
          </Typography>
        </PanelSection>
      )}

      <QrScannerDialog
        open={qrScanner.open}
        onClose={() => setQrScanner({ open: false, stage: 'PICKUP' })}
        title={qrScanner.stage === 'PICKUP' ? 'Scan pickup QR at hotel' : 'Scan delivery QR at recipient'}
        onScan={(token) => {
          setQrVerificationToken(token);
          const reqId = qrScanner.requestId || selectedRequest?.id;
          if (reqId) {
            handleVerifyQrWithToken(reqId, qrScanner.stage, token);
          }
        }}
      />

      <Dialog
        open={deliveryDialog.open}
        onClose={() => !deliveryDialog.uploading && setDeliveryDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm delivery with proof</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <Input type="file" inputProps={{ accept: 'image/*' }} onChange={handleProofFileChange} fullWidth />
            <TextField
              label="Delivery note (optional)"
              multiline
              minRows={3}
              value={deliveryDialog.note}
              onChange={(e) => setDeliveryDialog((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Receiver name, landmark, or handover details..."
              fullWidth
            />
            {deliveryDialog.imagePreview && (
              <Box
                component="img"
                src={deliveryDialog.imagePreview}
                alt="Delivery proof preview"
                sx={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 1 }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialog((prev) => ({ ...prev, open: false }))} disabled={deliveryDialog.uploading}>
            Cancel
          </Button>
          <Button variant="contained" color="success" onClick={handleConfirmDelivered} disabled={deliveryDialog.uploading}>
            Confirm Delivered
          </Button>
        </DialogActions>
      </Dialog>
    </PanelLayout>
  );
};

export default VolunteerPanel;

