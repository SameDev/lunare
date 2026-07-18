import { io, type Socket } from 'socket.io-client';
import { authStorage } from './authStorage';
import { getApiUrl } from './apiUrl';

export function createSocket(): Socket {
  return io(getApiUrl(), {
    auth: { token: authStorage.getAccessToken() },
    autoConnect: true,
  });
}
