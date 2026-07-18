import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { WebSocketRepository } from './websocket.repository';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server?: Server;

  constructor(private readonly websocketRepository: WebSocketRepository) {}

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`Cannot emit "${event}" — gateway server not bound yet`);
      return;
    }
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
