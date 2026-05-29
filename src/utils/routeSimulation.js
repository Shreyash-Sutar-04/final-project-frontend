/**
 * Interpolate position along a route polyline (Swiggy-style rider animation when GPS is unavailable).
 */
export const interpolateAlongRoute = (routePoints, progress) => {
  if (!routePoints?.length) return null;
  if (routePoints.length === 1) return routePoints[0];
  const clamped = Math.max(0, Math.min(1, progress));
  const totalSegments = routePoints.length - 1;
  const scaled = clamped * totalSegments;
  const segmentIndex = Math.min(Math.floor(scaled), totalSegments - 1);
  const segmentProgress = scaled - segmentIndex;
  const from = routePoints[segmentIndex];
  const to = routePoints[segmentIndex + 1];
  return [
    from[0] + (to[0] - from[0]) * segmentProgress,
    from[1] + (to[1] - from[1]) * segmentProgress,
  ];
};

export const haversineMeters = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
