import { TicketRepository } from '@core/mongodb/repository/ticket.repository';
import { Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LotteryUpdatePayload } from '@share/interfaces/lottery-realtime';
import { WIN_STATUS_ENUM } from '@share/interfaces/lottery-ticket';
import { TicketService } from './ticket.service';
import { PRIZE_MONEY } from '@share/constants/lottery-enum';
import { NotificationRepository } from '@core/mongodb/repository/notification.repository'; // Giả định
import { UserRepository } from '@core/mongodb/repository/user.repository'; // Giả định
import { FirebaseService } from '@core/infrastructure/firebase-admin.service';

export class LotteryScheduleService {
	private readonly logger = new Logger(LotteryScheduleService.name);

	constructor(
		@Inject() private readonly ticketRepo: TicketRepository,
		@Inject() private readonly ticketService: TicketService,
		@Inject() private readonly notificationRepo: NotificationRepository,
		@Inject() private readonly userRepo: UserRepository,
		@Inject() private readonly firebaseService: FirebaseService,
	) {}

	@OnEvent('lottery.result.updated')
	async handleLotteryUpdate(payload: LotteryUpdatePayload) {
		if (!payload.isFinished) {
			return;
		}

		this.logger.log(`Processing notifications for ${payload.station} on ${payload.date}`);

		// 1. Tìm tất cả vé đang chờ của đài này, ngày này
		const pendingTickets = await this.ticketRepo.findAll({
			date: payload.date,
			station: payload.station,
			region: payload.region,
			winStatus: WIN_STATUS_ENUM.PENDING,
		});

		for (const ticket of pendingTickets) {
			try {
				// 2. Tính toán kết quả
				const winDetails = this.ticketService.calculateWinning(
					ticket.code,
					payload.prizes,
					ticket.region,
					ticket.specialCode || '', // Đảm bảo truyền specialCode cho Miền Bắc
				);

				const status = winDetails.length > 0 ? WIN_STATUS_ENUM.WIN : WIN_STATUS_ENUM.LOSE;
				let totalWinAmount = 0;

				if (status === WIN_STATUS_ENUM.WIN) {
					const regionPrize = PRIZE_MONEY[ticket.region];
					totalWinAmount = winDetails.reduce((sum, prizeName) => {
						return sum + (regionPrize[prizeName] || 0);
					}, 0);
				}

				// 3. Cập nhật Ticket vào DB
				await this.ticketRepo.findOneAndUpdate(
					{ _id: ticket._id },
					{
						winStatus: status,
						winDetails,
						prizeMoney: totalWinAmount,
						message: this.ticketService.getRandomMessage(status),
					},
				);

				// 4. Lấy thông tin User để gửi Noti
				const user = await this.userRepo.findOneById(String(ticket.userId));
				const userData = user?.toObject();
				if (!user) continue;

				// Nội dung thông báo
				const title =
					status === WIN_STATUS_ENUM.WIN
						? 'Chúc mừng! Bạn đã trúng giải 🎉'
						: 'Kết quả xổ số đài ' + ticket.station;
				const body =
					status === WIN_STATUS_ENUM.WIN
						? `Vé số ${ticket.code} của bạn đã trúng ${totalWinAmount.toLocaleString()}đ. Nhấn để xem chi tiết!`
						: `Rất tiếc, vé số ${ticket.code} của bạn không trúng thưởng lần này. Chúc bạn may mắn lần sau!`;

				// 5. Lưu vào Collection Notification (Lịch sử thông báo trong App)
				await this.notificationRepo.add({
					userId: ticket.userId,
					title,
					body,
					type: 'TICKET_RESULT',
					data: { ticketId: ticket._id.toString(), screen: 'TicketDetail' },
					isRead: false,
				});

				// 6. Gửi Push Notification qua Firebase nếu user có bật settings và có token
				if (userData?.settingNotifications?.ticketResult && userData.fcmToken) {
					const messagePayload = {
						notification: { title, body },
						data: {
							type: 'TICKET_RESULT',
							ticketId: ticket._id.toString(),
							screen: 'TicketDetail',
						},
					};

					// Gửi đến tất cả thiết bị của User đó
					// this.firebaseService.sendNotification(token, messagePayload)

					// await Promise.all(sendPromises);
				}
			} catch (error) {
				this.logger.error(`Error processing ticket ${ticket._id}: ${error.message}`);
			}
		}
	}
}
