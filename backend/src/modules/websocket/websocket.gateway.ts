import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway as WSGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { WebSocketService } from './websocket.service';

@WSGateway({ cors: true })
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(WebSocketGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly websocketService: WebSocketService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server): void {
    this.websocketService.bindServer(server);
  }

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      void client.join(`user:${payload.sub}`);
    } catch {
      this.logger.warn(`Rejected websocket connection: invalid token`);
      client.disconnect(true);
    }
  }
}
