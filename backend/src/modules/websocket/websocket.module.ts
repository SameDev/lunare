import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebSocketController } from './websocket.controller';
import { WebSocketService } from './websocket.service';
import { WebSocketRepository } from './websocket.repository';
import { WebSocketGateway } from './websocket.gateway';

@Module({
  imports: [JwtModule.register({})],
  controllers: [WebSocketController],
  providers: [WebSocketService, WebSocketRepository, WebSocketGateway],
  exports: [WebSocketService],
})
export class WebSocketModule {}
