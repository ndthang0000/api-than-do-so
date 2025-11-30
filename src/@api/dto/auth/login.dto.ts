import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
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
