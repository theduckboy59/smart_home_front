export function getApiBaseUrl(): string {

  const hostname =
    window.location.hostname;

  const frontendLocalEnWindows =
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (frontendLocalEnWindows) {

    return 'https://thehome.aeropuertolosprimos.me/api';
  }

  return '/api';
}

export const API_BASE_URL =
  getApiBaseUrl();
