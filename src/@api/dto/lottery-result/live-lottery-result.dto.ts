import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { genEnumDes } from '@share/interfaces/des-enum';
import { Region, REGION_ENUM } from '@share/interfaces/lottery-ticket';
import { IsEmpty, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LiveLotteryResultDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: genEnumDes(REGION_ENUM) })
	@IsEnum(REGION_ENUM)
	region: Region;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({ required: true, example: '03-01-2026' })
	date: string;

	@IsString()
	@IsOptional()
	@ApiPropertyOptional()
	station: string;
}
