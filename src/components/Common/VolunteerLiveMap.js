import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { WS_SOCKJS_URL } from '../../utils/appConfig';
import api from '../../utils/api';
import { resolvePickupLocation, resolveRequestDestination } from '../../utils/location';
import { formatDistance, formatDuration, getRoute } from '../../utils/routing';
import { bearingDeg } from '../../utils/geo';

const mapStyle = { width: '100%', height: 360, borderRadius: 12 };

const MapAutoCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center?.[0] && center?.[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

/**
 * Real-time volunteer bike map for observers (needy, hotel, NGO).
 */
const VolunteerLiveMap = ({ request, title }) => {
  const [tracking, setTracking] = useState(null);
  const [animatedPosition, setAnimatedPosition] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const targetLocation = useMemo(
    () => {
      const isPickedUp = request?.status?.toLowerCase()?.includes('picked');
      return isPickedUp ? destinationLocation : pickupLocation;
    },
    [request?.status, pickupLocation, destinationLocation],
  );

  const showBikeFallback = useMemo(
    () => !animatedPosition && pickupLocation && request?.assignedVolunteer,
    [animatedPosition, pickupLocation, request?.assignedVolunteer],
  );
  const [routePath, setRoutePath] = useState([]);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [riderBearing, setRiderBearing] = useState(0);
  const clientRef = useRef(null);
  const subRef = useRef(null);
  const animationFrameRef = useRef(null);

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
    if (!request?.id) return undefined;

    let cancelled = false;
    (async () => {
      const [pickup, destination] = await Promise.all([
        resolvePickupLocation(request),
        resolveRequestDestination(request),
      ]);
      if (!cancelled) {
        setPickupLocation(pickup);
        setDestinationLocation(destination);
      }
      try {
        const res = await api.get(`/tracking/request/${request.id}/latest`);
        if (!cancelled && res.data?.latitude) {
          setTracking(res.data);
        }
      } catch {
        // no point yet
      }
    })();

    const stomp = new Client({
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(WS_SOCKJS_URL),
    });
    stomp.onConnect = () => {
      clientRef.current = stomp;
      subRef.current = stomp.subscribe(`/topic/tracking/${request.id}`, (message) => {
        setTracking(JSON.parse(message.body));
      });
    };
    stomp.activate();

    return () => {
      cancelled = true;
      subRef.current?.unsubscribe();
      stomp.deactivate();
    };
  }, [request]);

  useEffect(() => {
    if (!tracking?.latitude || !tracking?.longitude) return;
    const target = [tracking.latitude, tracking.longitude];
    if (!animatedPosition) {
      setAnimatedPosition(target);
      return;
    }
    setRiderBearing(bearingDeg(animatedPosition[0], animatedPosition[1], target[0], target[1]));
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const start = performance.now();
    const durationMs = 900;
    const from = animatedPosition;
    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const lat = from[0] + (target[0] - from[0]) * progress;
      const lng = from[1] + (target[1] - from[1]) * progress;
      setAnimatedPosition([lat, lng]);
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking]);

  useEffect(() => {
    if (!animatedPosition || !targetLocation) {
      setRoutePath([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const route = await getRoute(animatedPosition, targetLocation);
        if (!cancelled && route) {
          setRoutePath(route.points);
          setEtaSeconds(route.durationSeconds);
          setDistanceMeters(route.distanceMeters);
        }
      } catch {
        if (!cancelled) setRoutePath([]);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [animatedPosition, targetLocation]);

  if (!request) return null;

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        {title || `Live delivery — ${request.donation?.foodName || 'your meal'}`}
      </Typography>
      {request.assignedVolunteer && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Volunteer: {request.assignedVolunteer.fullName}
        </Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip color="primary" label={`ETA ${formatDuration(etaSeconds)}`} size="small" />
        <Chip color="secondary" label={`Distance ${formatDistance(distanceMeters)}`} size="small" />
        <Chip label={request.status} size="small" />
      </Stack>
      <MapContainer
        center={animatedPosition || destinationLocation || pickupLocation || [20.5937, 78.9629]}
        zoom={14}
        style={mapStyle}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {animatedPosition && (
          <Marker position={animatedPosition} icon={bikeIcon}>
            <Popup>Volunteer on the way</Popup>
          </Marker>
        )}
        {showBikeFallback && (
          <Marker position={pickupLocation} icon={bikeIcon}>
            <Popup>Volunteer assigned</Popup>
          </Marker>
        )}
        {pickupLocation && (
          <Marker position={pickupLocation}>
            <Popup>Pickup</Popup>
          </Marker>
        )}
        {destinationLocation && (
          <Marker position={destinationLocation}>
            <Popup>Drop-off</Popup>
          </Marker>
        )}
        {routePath.length > 1 ? (
          <Polyline positions={routePath} pathOptions={{ color: '#2e7d32', weight: 5 }} />
        ) : animatedPosition && targetLocation ? (
          <Polyline
            positions={[animatedPosition, targetLocation]}
            pathOptions={{ color: '#2e7d32', weight: 4, dashArray: '6,8' }}
          />
        ) : null}
        {pickupLocation && destinationLocation && (
          <Polyline
            positions={[pickupLocation, destinationLocation]}
            pathOptions={{ color: '#1976d2', weight: 4, dashArray: '10,10' }}
          />
        )}
        <MapAutoCenter center={animatedPosition || targetLocation || pickupLocation || destinationLocation} />
      </MapContainer>
    </Box>
  );
};

export default VolunteerLiveMap;
