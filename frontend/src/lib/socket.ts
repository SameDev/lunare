import { io, type Socket } from 'socket.io-client';
import { authStorage } from './authStorage';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function createSocket(): Socket {
  return io(API_URL, {
    auth: { token: authStorage.getAccessToken() },
    autoConnect: true,
  });
}
