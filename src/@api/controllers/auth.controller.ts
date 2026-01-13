import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '@service/auth.service';
import { responseData } from '@share/interfaces/response-face';
import { FirebaseService } from '@core/infrastructure/firebase-admin.service';
import { DeviceLoginDto, LoginDto, SocialDto } from '@dto/auth/login.dto';
import { RefreshTokenDto } from '@dto/auth/refresh-token.dto';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly firebaseService: FirebaseService,
	) {}

	@Post('/login-social')
	async loginSocial(@Body() dto: SocialDto) {
		const { token } = dto;
		const userData = await this.firebaseService.verifyToken(token);
		const data = await this.authService.loginSocial(userData);
		return responseData(data, 'Đăng nhập thành công');
	}

	@Post('/login')
	async loginEmail(@Body() dto: LoginDto) {
		const { email, password } = dto;
		const token = await this.authService.login(email, password);
		return responseData(token, 'Đăng nhập thành công');
	}

	@Post('/device-login')
	async deviceLogin(@Body() dto: DeviceLoginDto) {
		const token = await this.authService.deviceLogin(dto);
		return responseData(token, 'Đăng nhập thiết bị thành công');
	}

	@Post('/refresh-token')
	async refreshToken(@Body() dto: RefreshTokenDto) {
		const token = await this.authService.refreshToken(dto.refreshToken);
		return responseData(token);
	}
}
