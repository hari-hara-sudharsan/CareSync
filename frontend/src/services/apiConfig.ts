/**
 * CareSync API Configuration Utility
 * 
 * Provides unified base URL resolution for same-origin CloudFront CDN deployment (/api/v1),
 * custom environment override (VITE_API_BASE_URL), and local development fallback (http://localhost:8000/api/v1).
 */
export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};
