import { Inject, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from '@dto/notification/create-notification.dto';
import { UpdateNotificationDto } from '@dto/notification/update-notification.dto';
import { Notification, NotificationDocument } from '@core/mongodb/schemas/notification.schema';
import { NotificationRepository } from '@core/mongodb/repository/notification.repository';
import { Types } from 'mongoose';
import { SubscribeTopicDto } from '@dto/notification/subscribe-topic.dto';
import { FirebaseService } from '@core/infrastructure/firebase-admin.service';
import { UserService } from './user.service';
import { mapToTopic } from '@share/constants/notification-enum';

@Injectable()
export class NotificationService {
	constructor(
		@Inject() private readonly notificationRepo: NotificationRepository,
		@Inject() private readonly firebaseService: FirebaseService,
		@Inject() private readonly userService: UserService,
	) {}

	async updateSubscription(dto: SubscribeTopicDto, userId: string) {
		const { fcmToken, ...settings } = dto;

		const promises = Object.keys(settings).map(async key => {
			const topicName = mapToTopic[key];
			if (settings[key] === true) {
				console.log([fcmToken], topicName);
				return this.firebaseService.subscribeTopic([fcmToken], topicName);
			} else if (settings[key] === false) {
				return this.firebaseService.unSubscribeTopic([fcmToken], topicName);
			}
		});

		await Promise.all(promises);
		await this.userService.updateNotificationSettings(userId, fcmToken, settings);
		return { success: true, message: 'Cập nhật đăng ký thông báo thành công' };
	}

	async createNotification(createDto: CreateNotificationDto): Promise<Notification> {
		const entity = this.notificationRepo.add(createDto);
		return entity;
	}

	async getNotification(id: string): Promise<Notification | null> {
		return this.notificationRepo.findOne({ _id: new Types.ObjectId(id) });
	}

	async updateNotification(id: string, updateDto: UpdateNotificationDto): Promise<Notification | null> {
		await this.notificationRepo.updateOne({ _id: new Types.ObjectId(id) }, updateDto);
		return this.getNotification(id);
	}

	async deleteNotification(id: string): Promise<boolean> {
		const data = await this.notificationRepo.deleteOne({ _id: new Types.ObjectId(id) });
		if (data.deletedCount === 0) {
			return false;
		}
		return true;
	}

	async paginateNotification(query: any): Promise<any> {
		return this.notificationRepo.paginate({
			page: query.page,
			limit: query.limit,
			filter: query.filter,
			sortBy: query.sortBy,
			populate: query.populate,
		});
	}

	async getAllNotification(query: any): Promise<NotificationDocument[]> {
		return this.notificationRepo.findAll(query.filter, query.populate, query.order);
	}
}
