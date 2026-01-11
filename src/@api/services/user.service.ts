import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UpdateUserDto } from '@dto/user/update-user.dto';
import { User, UserDocument } from '@core/mongodb/schemas/user.schema';
import { UserRepository } from '@core/mongodb/repository/user.repository';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '@dto/user/register-user.dto';
import moment from 'moment';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
	constructor(@Inject() private readonly userRepo: UserRepository) {}

	generateCodeUser() {
		const code = 100000000 + Math.floor(Math.random() * 100000000);
		return code;
	}

	async createUser(createDto: RegisterUserDto): Promise<User> {
		const existingUser = await this.userRepo.findOne({ email: createDto.email });
		if (existingUser) {
			throw new BadRequestException('Email đã được sử dụng, vui lòng chọn email khác');
		}
		const hashedPassword = await bcrypt.hash(createDto.password, 10);
		const birthdate = createDto.birthdate ? moment(createDto.birthdate).format('YYYY-MM-DD') : undefined;
		const entity = this.userRepo.add({
			...createDto,
			password: hashedPassword,
			birthdate: birthdate,
			isVerifyEmail: false,
			code: this.generateCodeUser(),
		});
		return entity;
	}

	async getUser(id: string): Promise<User | null> {
		return this.userRepo.findOne({ _id: new Types.ObjectId(id) });
	}

	async updateUser(id: string, updateDto: UpdateUserDto): Promise<User | null> {
		const findUser = await this.userRepo.findOne({ _id: new Types.ObjectId(id) });

		if (!findUser) {
			throw new BadRequestException('User not found');
		}
		if (updateDto.password) {
			updateDto.password = await bcrypt.hash(updateDto.password, 10);
		}

		updateDto.settingApp = {
			...(findUser.settingApp || {}),
			...(updateDto.settingApp as any),
		};
		return await this.userRepo.findOneAndUpdate({ _id: new Types.ObjectId(id) }, updateDto);
	}

	async deleteUser(id: string): Promise<boolean> {
		const data = await this.userRepo.deleteOne({ _id: new Types.ObjectId(id) });
		if (data.deletedCount === 0) {
			return false;
		}
		return true;
	}

	async paginateUser(query: any): Promise<any> {
		return this.userRepo.paginate({
			page: query.page,
			limit: query.limit,
			filter: query.filter,
			sortBy: query.sortBy,
			populate: query.populate,
		});
	}

	async getUserByEmail(email: string): Promise<UserDocument | null> {
		return this.userRepo.findOne({ email });
	}

	async updateNotificationSettings(userId: string, fcmToken: string, settings: any): Promise<UserDocument | null> {
		await this.userRepo.updateOne(
			{ _id: new Types.ObjectId(userId) },
			{
				$set: {
					settingNotifications: settings,
					fcmToken: fcmToken,
				},
			},
		);
		return this.userRepo.findOne({ _id: new Types.ObjectId(userId) });
	}

	@OnEvent('fcm.token.expired')
	async handleFcmTokenExpired(fcmToken: string) {
		await this.userRepo.updateMultiple(
			{ fcmToken: fcmToken },
			{
				$set: {
					fcmToken: null,
				},
			},
		);
	}
}
