import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	userId: Types.ObjectId;

	@Prop()
	title: string;

	@Prop()
	body: string;

	@Prop({ type: Object })
	data?: object;

	@Prop({ default: false })
	isRead: boolean;

	@Prop({ required: false })
	type?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
