import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({ cors: true })
export class LotteryLiveGateway {
	@WebSocketServer() server: Server;

	@OnEvent('lottery.result.updated')
	handleLotteryUpdate(payload: any) {
		// Gửi cho tất cả client hoặc gửi theo room (ví dụ room miền Nam)
		this.server.emit('onLotteryChange', payload);

		// Nếu muốn chuyên nghiệp hơn, dùng room:
		// this.server.to(payload.region).emit('update', payload);
	}
}
