import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { USER_ROLE_ENUM } from '../../../@api/@guard/role.constant';
import { ACCOUNT_STATUS_ENUM, GENDER_ENUM } from '../../../@api/constants/user.constants';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
	@Prop({ required: false })
	name?: string;

	@Prop({ required: false })
	password?: string;

	@Prop({ required: false })
	email?: string;

	@Prop({ required: false })
	birthdate?: string;
	@Prop({ required: false })
	avatar?: string;

	@Prop({ enum: USER_ROLE_ENUM, default: USER_ROLE_ENUM.USER })
	role: string;

	@Prop({ enum: ACCOUNT_STATUS_ENUM, default: ACCOUNT_STATUS_ENUM.ENABLE })
	status: string;

	@Prop({ default: false })
	isPremium?: boolean;

	@Prop()
	isVerifyEmail: boolean;

	@Prop({ enum: GENDER_ENUM, default: GENDER_ENUM.NOT_SET })
	gender: string;

	@Prop({ required: false })
	lastScanDate?: Date;

	@Prop()
	code?: number;

	@Prop({ required: true, unique: true })
	deviceId: string;

	@Prop({ required: false })
	fcmToken?: string;

	@Prop({ required: false, type: Object })
	settingNotifications?: {
		ticketResult?: boolean;
		northResult?: boolean;
		southResult?: boolean;
		centralResult?: boolean;
		system?: boolean;
	};

	@Prop({ required: false, type: Object })
	settingApp: {
		theme?: string;
		language?: string;
		showLotoTable?: boolean;
		isVoiceEnabled?: boolean;
		isMusicEnabled?: boolean;
		fontSize?: string;
		highlightHead: string[];
		highlightTail: string[];
	};
}

export const UserSchema = SchemaFactory.createForClass(User);
