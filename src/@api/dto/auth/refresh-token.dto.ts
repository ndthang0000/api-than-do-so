import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: 'token' })
	refreshToken: string;
}
