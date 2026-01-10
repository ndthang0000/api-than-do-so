import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SubscribeTopicDto {
	@IsString()
	@ApiProperty()
	fcmToken: string;

	@IsBoolean()
	@IsOptional()
	@ApiProperty({ example: true })
	@Transform(({ value }) => {
		return value === 'true' || value == true;
	})
	ticketResult?: boolean;

	@IsBoolean()
	@IsOptional()
	@ApiProperty({ example: true })
	@Transform(({ value }) => {
		return value === 'true' || value == true;
	})
	centralResult?: boolean;

	@IsBoolean()
	@IsOptional()
	@ApiProperty({ example: true })
	@Transform(({ value }) => {
		return value === 'true' || value == true;
	})
	southResult?: boolean;

	@IsBoolean()
	@IsOptional()
	@ApiProperty({ example: true })
	@Transform(({ value }) => {
		return value === 'true' || value == true;
	})
	northResult?: boolean;

	@IsBoolean()
	@IsOptional()
	@ApiProperty({ example: true })
	@Transform(({ value }) => {
		return value === 'true' || value == true;
	})
	system?: boolean;
}
