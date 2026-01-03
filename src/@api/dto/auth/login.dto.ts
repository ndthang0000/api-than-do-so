import { IsString, IsNotEmpty, IsEmail, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: 'admin@oktravel.com' })
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: 'fsd1232sf343F12' })
	password: string;
}

export class SocialDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: 'token-social' })
	token: string;
}

export class DeviceLoginDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: 'device-unique-id' })
	deviceId: string;

	@IsNumber()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: '1700000000' })
	timestamp: number;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: 'generated-signature' })
	signature: string;
}
