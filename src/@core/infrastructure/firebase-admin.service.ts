import * as admin from 'firebase-admin';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as _ from 'lodash';
import { BaseMessage } from 'firebase-admin/messaging';
import { DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FirebaseService {
	private readonly eventEmitter: EventEmitter2;
	constructor() {
		// Initialize Firebase Admin SDK
		if (admin.apps.length === 0) {
			admin.initializeApp({
				credential: admin.credential.cert(require('../config/firebase.json')),
			});
		}
	}

	private logger = new Logger(FirebaseService.name);

	async verifyToken(token: string): Promise<DecodedIdToken> {
		try {
			return await admin.auth().verifyIdToken(token);
		} catch (error) {
			this.logger.error('Token verification error:', error);
			throw new BadRequestException('Invalid token');
		}
	}

	async getUser(uid: string): Promise<UserRecord> {
		return await admin.auth().getUser(uid);
	}

	async subscribeTopic(tokens: string[], topic: string) {
		return await admin.messaging().subscribeToTopic(tokens, topic);
	}

	async unSubscribeTopic(tokens: string[], topic: string) {
		return await admin.messaging().unsubscribeFromTopic(tokens, topic);
	}

	async sendNotificationTopicFCM(topic: string, message: BaseMessage) {
		try {
			message.data = _.omitBy(message.data, _.isNil);
			message.notification = _.omitBy(message.notification, _.isNil);
			const result = await admin.messaging().send({
				topic,
				...message,
			});
			this.logger.log(`sendNotificationTopicFCM ${topic}: ${result}`);
			return result;
		} catch (e) {
			this.logger.error(`ERR sendNotificationTopicFCM ${topic}:`, e.message);
			return null;
		}
	}
	/**
	 * Gửi thông báo đến một thiết bị cụ thể qua Token
	 * @param token FCM Token của thiết bị
	 * @param message Nội dung bao gồm notification và data
	 * @returns boolean trả về true nếu gửi thành công
	 */
	async sendNotification(token: string, message: BaseMessage): Promise<boolean> {
		try {
			// Làm sạch dữ liệu trước khi gửi (giống hàm gửi qua Topic của bạn)
			const cleanData = _.omitBy(message.data, _.isNil);
			const cleanNotification = _.omitBy(message.notification, _.isNil);

			const payload = {
				token,
				notification: cleanNotification,
				data: cleanData,
			};

			const result = await admin.messaging().send(payload);
			this.logger.log(`Successfully sent message to token: ${token.substring(0, 10)}... Result: ${result}`);
			return true;
		} catch (error) {
			this.logger.error(`Error sending message to token: ${token.substring(0, 10)}...`, error.message);

			// XỬ LÝ TOKEN CHẾT (Cleanup logic)
			// Nếu lỗi là NotRegistered hoặc InvalidRegistration, nghĩa là token không còn hiệu lực
			if (
				error.code === 'messaging/registration-token-not-registered' ||
				error.code === 'messaging/invalid-registration-token'
			) {
				this.logger.warn(`Token is no longer valid. You should remove it from your DB: ${token}`);
				// Tại đây bạn có thể emit một event để Repository xóa token này đi
				this.eventEmitter.emit('fcm.token.expired', token);
			}

			return false;
		}
	}

	/**
	 * Gửi thông báo đến nhiều Token (Multicast)
	 * Phù hợp khi một User có nhiều thiết bị (iPhone, iPad...)
	 */
	async sendMulticastNotification(tokens: string[], message: BaseMessage) {
		if (!tokens || tokens.length === 0) return;

		try {
			const payload = {
				tokens,
				notification: _.omitBy(message.notification, _.isNil),
				data: _.omitBy(message.data, _.isNil),
			};

			const response = await admin.messaging().sendEachForMulticast(payload);

			this.logger.log(`Multicast success: ${response.successCount}, failure: ${response.failureCount}`);

			// Nếu có lỗi, bạn có thể duyệt response.responses để tìm ra chính xác token nào bị lỗi
			if (response.failureCount > 0) {
				response.responses.forEach((resp, idx) => {
					if (!resp.success) {
						this.logger.warn(`Token at index ${idx} failed with error: ${resp.error?.code}`);
					}
				});
			}

			return response;
		} catch (error) {
			this.logger.error('Error in sendMulticastNotification:', error);
			return null;
		}
	}
}
