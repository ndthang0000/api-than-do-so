import { TicketRepository } from '@core/mongodb/repository/ticket.repository';
import { Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WIN_STATUS_ENUM } from '@share/interfaces/lottery-ticket';
import { TicketService } from './ticket.service';
import { PRIZE_MONEY } from '@share/constants/lottery-enum';
import { NotificationRepository } from '@core/mongodb/repository/notification.repository';
import { UserRepository } from '@core/mongodb/repository/user.repository';
import { FirebaseService } from '@core/infrastructure/firebase-admin.service';
import { TOPIC_NAME_ENUM } from '@share/constants/notification-enum';
import { LotteryResult } from '@core/mongodb/schemas/lottery-result.schema';
import { Cron } from '@nestjs/schedule'; // Import thêm Cron
import { BaseMessage } from 'firebase-admin/messaging';

export class LotteryScheduleService {
	private readonly logger = new Logger(LotteryScheduleService.name);

	constructor(
		@Inject() private readonly ticketRepo: TicketRepository,
		@Inject() private readonly ticketService: TicketService,
		@Inject() private readonly notificationRepo: NotificationRepository,
		@Inject() private readonly userRepo: UserRepository,
		@Inject() private readonly firebaseService: FirebaseService,
	) {}

	// --- 1. JOBS ĐỊNH KỲ BẮN NOTI THEO TOPIC ---

	@Cron('0 15 16 * * *') // 16:15 hàng ngày
	async notifySouthStart() {
		this.logger.log('Sending start notification for LOTTERY_SOUTH');
		await this.firebaseService.sendNotificationTopicFCM(TOPIC_NAME_ENUM.LOTTERY_SOUTH, {
			notification: {
				title: 'Xổ số Miền Nam sắp bắt đầu! 🕒',
				body: 'Đã đến giờ quay thưởng miền Nam hôm nay. Chúc bạn may mắn cùng với Thần dò số nhé!',
			},
			android: {
				priority: 'high',
				notification: {
					channelId: 'default_channel_id',
					priority: 'max',
					visibility: 'public', // Hiển thị nội dung ngay cả khi khóa màn hình
					clickAction: 'fcm.ACTION_EVENT', // Cần thiết nếu dùng Flutter/một số thư viện RN cũ
				},
			},
			apns: {
				payload: {
					aps: {
						contentAvailable: true,
						sound: 'default',
						badge: 1, // Hiện số 1 ở icon app cho tò mò
						alert: {
							title: 'Xổ số Miền Nam sắp bắt đầu! 🕒',
							body: '...',
						},
					},
				},
				headers: {
					'apns-priority': '10',
					'apns-push-type': 'alert', // Chỉ định rõ đây là loại cảnh báo
				},
			},
			data: { screen: 'Result', region: 'south', tabIndex: '2' },
		});
	}

	@Cron('0 15 17 * * *') // 17:15 hàng ngày
	async notifyCentralStart() {
		this.logger.log('Sending start notification for LOTTERY_CENTRAL');
		await this.firebaseService.sendNotificationTopicFCM(TOPIC_NAME_ENUM.LOTTERY_CENTRAL, {
			notification: {
				title: 'Xổ số Miền Trung sắp bắt đầu! 🕒',
				body: 'Đã đến giờ quay thưởng miền Trung hôm nay. Chúc bạn may mắn cùng với Thần dò số nhé!',
			},
			data: { screen: 'Result', region: 'central', tabIndex: '1' },
			android: {
				priority: 'high',
				notification: {
					channelId: 'default_channel_id',
					priority: 'max',
					visibility: 'public', // Hiển thị nội dung ngay cả khi khóa màn hình
					clickAction: 'fcm.ACTION_EVENT', // Cần thiết nếu dùng Flutter/một số thư viện RN cũ
				},
			},
			apns: {
				payload: {
					aps: {
						contentAvailable: true,
						sound: 'default',
					},
				},
				headers: {
					'apns-priority': '10',
				},
			},
		});
	}

	@Cron('0 15 18 * * *') // 18:15 hàng ngày (Giờ MB thường quay lúc 18h15)
	async notifyNorthStart() {
		this.logger.log('Sending start notification for LOTTERY_NORTH');
		await this.firebaseService.sendNotificationTopicFCM(TOPIC_NAME_ENUM.LOTTERY_NORTH, {
			notification: {
				title: 'Xổ số Miền Bắc sắp bắt đầu! 🕒',
				body: 'Đã đến giờ quay thưởng miền Bắc hôm nay. Chúc bạn may mắn!',
			},
			data: { screen: 'Result', region: 'north', tabIndex: '0' },
			android: {
				priority: 'high',
				notification: {
					channelId: 'default_channel_id',
					priority: 'max',
					visibility: 'public', // Hiển thị nội dung ngay cả khi khóa màn hình
					clickAction: 'fcm.ACTION_EVENT', // Cần thiết nếu dùng Flutter/một số thư viện RN cũ
				},
			},
			apns: {
				payload: {
					aps: {
						contentAvailable: true,
						sound: 'default',
					},
				},
				headers: {
					'apns-priority': '10',
				},
			},
		});
	}

	// --- 2. XỬ LÝ KHI CÓ KẾT QUẢ (EVENT) ---

	@OnEvent('lottery.finished')
	async handleLotteryUpdate(payload: LotteryResult) {
		if (!payload.isFinished) return;

		this.logger.log(`Processing notifications for ${payload.station} on ${payload.date}`);

		// A. BẮN THÔNG BÁO CHUNG CHO TOPIC CỦA ĐÀI/MIỀN (Cho những người không có vé nhưng muốn hóng kết quả)
		// Giả sử TOPIC được đặt tên theo Region: LOTTERY_SOUTH, LOTTERY_NORTH...
		const regionTopic = `LOTTERY_${payload.region.toUpperCase()}`;
		await this.firebaseService.sendNotificationTopicFCM(regionTopic, {
			notification: {
				title: `Đã có kết quả đài ${payload.station}! 🏆`,
				body: `Kết quả xổ số đài ${payload.station} ngày ${payload.date} đã được cập nhật đầy đủ. Bấm để xem ngay!`,
			},
			data: {
				screen: 'Result',
				date: payload.date,
				station: payload.station,
				tabIndex: payload.region === 'north' ? '0' : payload.region === 'central' ? '1' : '2',
			},
			android: {
				priority: 'high',
				notification: {
					channelId: 'default_channel_id',
					priority: 'max',
					visibility: 'public', // Hiển thị nội dung ngay cả khi khóa màn hình
					clickAction: 'fcm.ACTION_EVENT', // Cần thiết nếu dùng Flutter/một số thư viện RN cũ
				},
			},
			apns: {
				payload: {
					aps: {
						contentAvailable: true,
						sound: 'default',
					},
				},
				headers: {
					'apns-priority': '10',
				},
			},
		});

		// B. XỬ LÝ VÉ CÁ NHÂN (Giữ nguyên logic cũ của bạn)
		const pendingTickets = await this.ticketRepo.findAll({
			date: payload.date,
			station: payload.station,
			region: payload.region,
			winStatus: WIN_STATUS_ENUM.PENDING,
		});

		for (const ticket of pendingTickets) {
			try {
				const winDetails = this.ticketService.calculateWinning(
					ticket.code,
					payload.prizes,
					ticket.region,
					ticket.specialCode || '',
				);

				const status = winDetails.length > 0 ? WIN_STATUS_ENUM.WIN : WIN_STATUS_ENUM.LOSE;
				let totalWinAmount = 0;

				if (status === WIN_STATUS_ENUM.WIN) {
					const regionPrize = PRIZE_MONEY[ticket.region];
					totalWinAmount = winDetails.reduce((sum, prizeName) => {
						return sum + (regionPrize[prizeName] || 0);
					}, 0);
				}
				const message = this.ticketService.getRandomMessage(status);
				await this.ticketRepo.findOneAndUpdate(
					{ _id: ticket._id },
					{
						winStatus: status,
						winDetails,
						prizeMoney: totalWinAmount,
						message: message,
					},
				);

				const user = await this.userRepo.findOneById(String(ticket.userId));
				if (!user) continue;

				const title =
					status === WIN_STATUS_ENUM.WIN
						? `🎉🎉🎉Bất ngờ lớn...${ticket.code}`
						: `Kết quả xổ của vé ${ticket.code} đã có!`;
				const body = message;

				await this.notificationRepo.add({
					userId: ticket.userId,
					title,
					body,
					type: TOPIC_NAME_ENUM.TICKET_RESULT,
					data: { ticketId: ticket._id.toString(), screen: 'TicketDetail' },
					isRead: false,
				});

				if (user?.settingNotifications?.ticketResult && user.fcmToken) {
					const messagePayload: BaseMessage = {
						notification: { title, body },
						data: {
							type: TOPIC_NAME_ENUM.TICKET_RESULT,
							ticketId: ticket._id.toString(),
							screen: 'TicketDetail',
						},
						android: {
							priority: 'high',
							notification: {
								channelId: 'default_channel_id',
								priority: 'max',
								visibility: 'public', // Hiển thị nội dung ngay cả khi khóa màn hình
								clickAction: 'fcm.ACTION_EVENT',
							},
						},
					};
					// Không await để vòng lặp chạy nhanh hơn
					this.firebaseService.sendNotification(user.fcmToken, messagePayload);
				}
			} catch (error) {
				this.logger.error(`Error processing ticket ${ticket._id}: ${error.message}`);
			}
		}
	}
}
