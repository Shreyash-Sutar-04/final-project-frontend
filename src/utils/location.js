const geocodeCache = new Map();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const hasCoordinates = (latitude, longitude) => {
  return Number.isFinite(toNumberOrNull(latitude)) && Number.isFinite(toNumberOrNull(longitude));
};

export const toLatLng = (latitude, longitude) => {
  const lat = toNumberOrNull(latitude);
  const lng = toNumberOrNull(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return [lat, lng];
};

export const parseCoordsFromDeliveryAddress = (address) => {
  if (!address) return null;
  const match = String(address).match(/lat=([-\d.]+)\s*,\s*lng=([-\d.]+)/i);
  if (!match) return null;
  return toLatLng(match[1], match[2]);
};

/**
 * Voice requests are stored like: SOURCE|spokenText|<coords OR manual location query>
 * We only want to geocode the last part, otherwise Nominatim gets noisy text.
 */
const extractVoiceLocationPart = (deliveryAddress) => {
  if (!deliveryAddress) return null;
  const parts = String(deliveryAddress).split('|');
  if (parts.length < 3) return null;
  const locationPart = (parts[parts.length - 1] || '').trim();
  if (!locationPart || locationPart === 'location-unavailable') return null;
  // If it's already coords, parseCoordsFromDeliveryAddress will have handled it earlier.
  if (locationPart.toLowerCase().startsWith('lat=')) return null;
  return locationPart;
};

export const geocodeAddress = async (address) => {
  const cleaned = (address || '').trim();
  if (!cleaned) return null;

  const key = cleaned.toLowerCase();
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  const queryText = cleaned.includes(',') ? cleaned : `${cleaned}, India`;
  const query = encodeURIComponent(queryText);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ShareBite/1.0',
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const first = payload?.[0];
  if (!first) {
    return null;
  }

  const latLng = toLatLng(first.lat, first.lon);
  if (latLng) {
    geocodeCache.set(key, latLng);
  }
  return latLng;
};

export const geocodeViaBackend = async (address) => {
  const cleaned = (address || '').trim();
  if (!cleaned) return null;
  try {
    const api = (await import('./api')).default;
    const res = await api.post('/tracking/geocode', null, { params: { address: cleaned } });
    return toLatLng(res.data?.latitude, res.data?.longitude);
  } catch {
    return geocodeAddress(cleaned);
  }
};

export const resolveRequestDestination = async (request) => {
  if (!request) return null;

  const voiceLatLng = parseCoordsFromDeliveryAddress(request.deliveryAddress);
  if (voiceLatLng) return voiceLatLng;

  const voiceLocationPart = extractVoiceLocationPart(request.deliveryAddress);
  if (voiceLocationPart) {
    const voiceLocation = await geocodeViaBackend(voiceLocationPart);
    if (voiceLocation) return voiceLocation;
  }

  const deliveryLatLng = toLatLng(request.deliveryLatitude, request.deliveryLongitude);
  if (deliveryLatLng) return deliveryLatLng;

  const requesterLatLng = toLatLng(request.requester?.latitude, request.requester?.longitude);
  if (requesterLatLng) return requesterLatLng;

  const deliveryFromAddress = await geocodeViaBackend(request.deliveryAddress);
  if (deliveryFromAddress) return deliveryFromAddress;

  const requesterAddressLocation = await geocodeViaBackend(request.requester?.address);
  if (requesterAddressLocation) return requesterAddressLocation;

  const donationLatLng = toLatLng(request.donation?.latitude, request.donation?.longitude);
  if (donationLatLng) return donationLatLng;

  return geocodeViaBackend(request.pickupAddress || request.donation?.address);
};

export const resolvePickupLocation = async (request) => {
  if (!request) return null;

  const donationLatLng = toLatLng(request.donation?.latitude, request.donation?.longitude);
  if (donationLatLng) return donationLatLng;

  return geocodeViaBackend(request.pickupAddress || request.donation?.address);
};
