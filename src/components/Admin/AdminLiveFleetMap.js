import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../utils/api';
import { WS_SOCKJS_URL } from '../../utils/appConfig';

dayjs.extend(relativeTime);

const mapStyle = { width: '100%', height: 480, borderRadius: 12 };

const statusColor = (status) => {
  if (status === 'PICKED_UP') return '#ff9800';
  if (status === 'ASSIGNED') return '#2196f3';
  return '#4caf50';
};

const FitFleetBounds = ({ deliveries }) => {
  const map = useMap();
  useEffect(() => {
    const points = deliveries
      .filter((d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude))
      .map((d) => [d.latitude, d.longitude]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
  }, [deliveries, map]);
  return null;
};

/**
 * Admin command-center map: all in-progress deliveries with live WebSocket positions.
 */
const AdminLiveFleetMap = ({ onConnectionChange }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const stompRef = useRef(null);

  const mergeDelivery = useCallback((update) => {
    if (!update?.requestId) return;
    setDeliveries((prev) => {
      const idx = prev.findIndex((d) => d.requestId === update.requestId);
      const merged = {
        requestId: update.requestId,
        donationId: prev[idx]?.donationId,
        volunteerId: update.volunteerId ?? prev[idx]?.volunteerId,
        volunteerName: update.volunteerName ?? prev[idx]?.volunteerName,
        requestStatus: update.requestStatus ?? prev[idx]?.requestStatus,
        foodName: update.foodName ?? prev[idx]?.foodName,
        latitude: update.latitude ?? prev[idx]?.latitude,
        longitude: update.longitude ?? prev[idx]?.longitude,
        lastUpdated: update.timestamp ?? prev[idx]?.lastUpdated,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...merged };
        return next;
      }
      return [...prev, merged];
    });
  }, []);

  const loadActiveDeliveries = useCallback(async () => {
    try {
      const res = await api.get('/admin/active-deliveries');
      setDeliveries(res.data || []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveDeliveries();
    const poll = setInterval(loadActiveDeliveries, 45000);
    return () => clearInterval(poll);
  }, [loadActiveDeliveries]);

  useEffect(() => {
    const stomp = new Client({
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(WS_SOCKJS_URL),
    });
    stomp.onConnect = () => {
      setWsConnected(true);
      onConnectionChange?.(true);
      stomp.subscribe('/topic/admin/live-tracking', (message) => {
        try {
          mergeDelivery(JSON.parse(message.body));
        } catch {
          // ignore malformed payloads
        }
      });
    };
    stomp.onDisconnect = () => {
      setWsConnected(false);
      onConnectionChange?.(false);
    };
    stomp.activate();
    stompRef.current = stomp;
    return () => {
      stomp.deactivate();
      onConnectionChange?.(false);
    };
  }, [mergeDelivery, onConnectionChange]);

  const mapCenter = useMemo(() => {
    const withCoords = deliveries.filter(
      (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude),
    );
    if (withCoords.length === 0) return [20.5937, 78.9629];
    const lat =
      withCoords.reduce((s, d) => s + d.latitude, 0) / withCoords.length;
    const lng =
      withCoords.reduce((s, d) => s + d.longitude, 0) / withCoords.length;
    return [lat, lng];
  }, [deliveries]);

  const markerIcon = (color) =>
    L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);"></div>`,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <Chip
          size="small"
          label={wsConnected ? 'Live feed connected' : 'Reconnecting…'}
          color={wsConnected ? 'success' : 'warning'}
        />
        <Chip size="small" label={`${deliveries.length} active deliveries`} />
        <Typography variant="caption" color="text.secondary">
          Updates via WebSocket + refresh every 45s
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ height: 480, borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            <MapContainer center={mapCenter} zoom={6} style={mapStyle}>
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitFleetBounds deliveries={deliveries} />
              {deliveries
                .filter((d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude))
                .map((d) => (
                  <Marker
                    key={d.requestId}
                    position={[d.latitude, d.longitude]}
                    icon={markerIcon(statusColor(d.requestStatus))}
                  >
                    <Popup>
                      <strong>{d.volunteerName || 'Volunteer'}</strong>
                      <br />
                      {d.foodName} — {d.requestStatus}
                      <br />
                      Updated {d.lastUpdated ? dayjs(d.lastUpdated).fromNow() : '—'}
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </Box>

          {deliveries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              No active deliveries right now. When a volunteer is assigned and sharing location, they appear here.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Volunteer</TableCell>
                  <TableCell>Meal</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last ping</TableCell>
                  <TableCell>Coordinates</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.requestId}>
                    <TableCell>{d.volunteerName || '—'}</TableCell>
                    <TableCell>{d.foodName || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={d.requestStatus || '—'}
                        sx={{
                          bgcolor: statusColor(d.requestStatus),
                          color: '#fff',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {d.lastUpdated ? dayjs(d.lastUpdated).fromNow() : 'Waiting for GPS'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {Number.isFinite(d.latitude)
                        ? `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </Box>
  );
};

export default AdminLiveFleetMap;
