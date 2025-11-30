import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { USER_ROLE_ENUM } from '../../../@api/@guard/role.constant';
import { ACCOUNT_STATUS_ENUM, GENDER_ENUM } from '../../../@api/constants/user.constants';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
	@Prop()
	name: string;

	@Prop()
	password: string;

	@Prop({ required: true, unique: true })
	email: string;

	@Prop()
	birthdate: string;

	@Prop()
	avatar: string;

	@Prop({ enum: USER_ROLE_ENUM, default: USER_ROLE_ENUM.USER })
	role: string;

	@Prop({ enum: ACCOUNT_STATUS_ENUM, default: ACCOUNT_STATUS_ENUM.ENABLE })
	status: string;

	@Prop({ default: false })
	isPremium: boolean;

	@Prop()
	isVerifyEmail: boolean;

	@Prop({ enum: GENDER_ENUM, default: GENDER_ENUM.NOT_SET })
	gender: string;

	@Prop()
	lastScanDate: Date;

	@Prop({ default: 0 })
	scanCountToday: number;

	@Prop()
	code: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
