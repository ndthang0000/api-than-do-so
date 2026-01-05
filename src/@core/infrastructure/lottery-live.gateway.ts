import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { LotteryUpdatePayload } from '@share/interfaces/lottery-realtime';

@WebSocketGateway({
	cors: { origin: '*' },
	namespace: '/lottery', // Tách namespace để dễ quản lý nếu sau này có chat, thông báo khác
})
export class LotteryLiveGateway {
	@WebSocketServer() server: Server;

	/**
	 * Client gửi event 'joinRegion' kèm theo tên miền muốn lắng nghe
	 * Ví dụ: socket.emit('joinRegion', 'south')
	 */
	@SubscribeMessage('joinRegion')
	handleJoinRegion(@MessageBody() region: string, @ConnectedSocket() client: Socket) {
		// Rời khỏi các room cũ nếu có để tránh nhận trùng lặp
		const regions = ['north', 'central', 'south'];
		regions.forEach(r => client.leave(r));

		// Gia nhập room mới
		client.join(region);
		console.log(`Client ${client.id} joined room: ${region}`);

		return { status: 'success', joined: region };
	}

	/**
	 * Lắng nghe event từ ScraperService
	 */
	@OnEvent('lottery.result.updated')
	handleLotteryUpdate(payload: LotteryUpdatePayload) {
		// Chỉ gửi dữ liệu đến những Client nằm trong room của region đó
		// Event name: 'onLotteryChange'
		this.server.to(payload.region).emit('onLotteryChange', payload);
	}
}
