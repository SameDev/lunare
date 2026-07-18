import { io, type Socket } from 'socket.io-client';
import { authStorage } from './authStorage';
import { getApiUrl } from './apiUrl';

export function createSocket(): Socket {
  const apiUrl = getApiUrl();
  const options = { auth: { token: authStorage.getAccessToken() }, autoConnect: true };
  // socket.io-client auto-detects same-origin when given no URL — an empty string isn't
  // guaranteed to parse the same way, so omit the argument entirely rather than pass ''.
  return apiUrl ? io(apiUrl, options) : io(options);
}
