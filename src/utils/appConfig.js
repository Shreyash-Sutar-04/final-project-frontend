/**
 * Central URLs for the React app. Override with CRA env vars when not using localhost.
 * REACT_APP_API_URL — e.g. http://52.66.200.211:8081/api
 * REACT_APP_WS_URL  — optional full SockJS endpoint, e.g. http://52.66.200.211:8081/ws
 */

const trimSlash = (s) => s.replace(/\/+$/, '');

// UPDATED: Defaulting to your EC2 IP and Port 8081
const rawApi = trimSlash(process.env.REACT_APP_API_URL || 'http://52.66.200.211:8081/api');

export const API_BASE_URL = rawApi.endsWith('/api') ? rawApi : `${rawApi}/api`;

export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

// WebSockets for real-time updates (Hotel/NGO/Volunteer)
export const WS_SOCKJS_URL = trimSlash(process.env.REACT_APP_WS_URL || `${SERVER_ORIGIN}/ws`);

export const SMS_HELPLINE = process.env.REACT_APP_SMS_HELPLINE || '';

export function resolveServerUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SERVER_ORIGIN}${p}`;
}
