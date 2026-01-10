import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base-repo';
import { NotificationDocument, Notification } from '../schemas/notification.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationDocument> {
	constructor(@InjectModel(Notification.name) model: Model<NotificationDocument>) {
		super(model);
	}
}
