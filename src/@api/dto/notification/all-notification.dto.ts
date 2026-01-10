import { IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';
import { ApiProperty, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetAllNotificationDto extends PartialType(CreateNotificationDto) {
	@IsNumber()
	@IsOptional()
	@ApiProperty({ example: 1 })
	@ApiPropertyOptional()
	@Type(() => Number)
	id: number;

	@IsString()
	@IsOptional()
	@ApiProperty({ example: '2021-01-31' })
	@ApiPropertyOptional()
	dateFrom!: string;

	@IsString()
	@IsOptional()
	@ApiProperty({ example: '2025-12-31' })
	@ApiPropertyOptional()
	dateTo!: string;

	@ApiProperty({ example: 'createdAt:asc' })
	@IsOptional()
	@ApiPropertyOptional()
	sortBy: string;
}
