import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '@core/mongodb/repository/user.repository';
import { FirebaseService } from '@core/infrastructure/firebase-admin.service';
import { v4 as uuidv4 } from 'uuid';
import { getSecretKey } from '../@guard/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { envData } from '@core/config/core.config';
import * as bcrypt from 'bcrypt';
import { ACCOUNT_STATUS_ENUM } from '../constants/user.constants';
import { UserService } from './user.service';
import { DeviceLoginDto } from '@dto/auth/login.dto';
import crypto from 'crypto';
import { USER_ROLE_ENUM } from '../@guard/role.constant';

@Injectable()
export class AuthService {
	constructor(
		private readonly jwtService: JwtService,
		@Inject() private readonly userRepository: UserRepository,
		@Inject() private readonly userService: UserService,
		@Inject() private readonly firebaseService: FirebaseService,
	) {}

	preparePayload(user: any, session: string) {
		return {
			role: user.role,
			id: user.id,
			session: session,
			avatar: user.avatar,
			deviceId: user.deviceId,
		};
	}

	async loginSocial(userData: any) {
		if (!userData.email || !userData.uid) {
			const user = await this.firebaseService.getUser(userData.uid);
			userData.email = user.providerData[0]?.email;
		}
		if (!userData.email) {
			throw new BadRequestException(
				`Không thể xác thực email của bạn từ tài khoản ${userData?.firebase?.sign_in_provider} của bạn`,
			);
		}
		let existingUser = await this.userRepository.findOne({ email: userData.email });

		if (!existingUser) {
			existingUser = await this.userRepository.add({
				email: userData.email,
				name: userData.name,
				avatar: userData.picture,
				isVerifyEmail: true,
				code: this.userService.generateCodeUser(),
			});
		}

		if (existingUser.status === ACCOUNT_STATUS_ENUM.LOCKED) {
			throw new UnauthorizedException('🔒Tài khoản của bạn đã bị khoá');
		}

		if (!existingUser.isVerifyEmail) {
			await this.userRepository.updateOne(existingUser._id, { isVerifyEmail: true });
		}
		const session = uuidv4();

		const payload = this.preparePayload(existingUser, session);
		const secretKey = getSecretKey(payload.role, 'access');
		const refreshSecretKey = getSecretKey(payload.role, 'refresh');
		const accessToken = this.jwtService.sign(payload, {
			secret: secretKey,
		});
		const refreshToken = this.jwtService.sign(payload, {
			secret: refreshSecretKey,
		});
		return { accessToken, refreshToken, user: existingUser };
	}

	async login(email: string, password: string) {
		const user = await this.userRepository.findOne({ email });
		if (!user) {
			throw new UnauthorizedException('⛔Email không tồn tại trong hệ thống, vui lòng kiểm tra lại !!!');
		}

		if (user.status === ACCOUNT_STATUS_ENUM.LOCKED) {
			throw new UnauthorizedException('🔒Tài khoản của bạn đã bị khoá');
		}

		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) throw new UnauthorizedException('⛔Mật khẩu không chính xác, vui lòng thử lại !!!');

		const session = uuidv4();

		const payload = this.preparePayload(user, session);

		const secretKey = getSecretKey(user.role, 'access');
		const refreshSecretKey = getSecretKey(user.role, 'refresh');

		const accessToken = this.jwtService.sign(payload, {
			secret: secretKey,
			expiresIn: envData.jwt.jwtExpiresTime as any, // Use the configured JWT expiration time
		});
		const refreshToken = this.jwtService.sign(payload, {
			secret: refreshSecretKey,
			expiresIn: envData.jwt.refreshJwtExpiresTime as any, // Use the configured JWT expiration time
		});
		return { accessToken, refreshToken, user };
	}

	async deviceLogin(dto: DeviceLoginDto) {
		const { deviceId, signature, timestamp } = dto;
		const APP_CRYPTO_KEY = envData.cryptoKey;
		const now = Date.now();
		if (now - timestamp > 3 * 60 * 1000) {
			throw new UnauthorizedException('Expired request');
		}

		const message = `${deviceId}|${timestamp}`;
		const expectedSignature = crypto.createHmac('sha256', APP_CRYPTO_KEY).update(message).digest('hex');
		if (signature !== expectedSignature) {
			throw new UnauthorizedException('Invalid signature');
		}

		let user = await this.userRepository.findOne({ deviceId });
		if (!user) {
			//create new user
			user = await this.userRepository.add({
				isVerifyEmail: false,
				code: this.userService.generateCodeUser(),
				deviceId: deviceId,
				role: USER_ROLE_ENUM.GUEST,
				settingNotifications: {
					ticketResult: false,
					northResult: false,
					southResult: false,
					centralResult: false,
					system: false,
				},
				settingApp: {
					showLotoTable: true,
					fontSize: 'MEDIUM',
					isMusicEnabled: true,
					isVoiceEnabled: true,
				},
			});
		}
		const session = uuidv4();

		const payload = this.preparePayload(user, session);

		const secretKey = getSecretKey(user.role, 'access');
		const refreshSecretKey = getSecretKey(user.role, 'refresh');

		const accessToken = this.jwtService.sign(payload, {
			secret: secretKey,
			expiresIn: envData.jwt.jwtExpiresTime as any, // Use the configured JWT expiration time
		});
		const refreshToken = this.jwtService.sign(payload, {
			secret: refreshSecretKey,
			expiresIn: envData.jwt.refreshJwtExpiresTime as any, // Use the configured JWT expiration time
		});
		return { accessToken, refreshToken, user };
	}

	async refreshToken(refreshToken: string) {
		try {
			console.log('refreshToken:', refreshToken);
			const decoded = this.jwtService.decode(refreshToken);
			console.log(decoded);
			const role = decoded['role'];
			const secretKey = getSecretKey(role, 'refresh');
			const verified = this.jwtService.verify(refreshToken, { secret: secretKey });
			const session = uuidv4();
			const payload = this.preparePayload(verified, session);
			const accessSecretKey = getSecretKey(role, 'access');
			const newAccessToken = this.jwtService.sign(payload, {
				secret: accessSecretKey,
				expiresIn: envData.jwt.jwtExpiresTime as any,
			});
			const newRefreshToken = this.jwtService.sign(payload, {
				secret: secretKey,
				expiresIn: envData.jwt.refreshJwtExpiresTime as any,
			});
			return { accessToken: newAccessToken, refreshToken: newRefreshToken };
		} catch (e) {
			throw new UnauthorizedException('Invalid refresh token');
		}
	}
}
