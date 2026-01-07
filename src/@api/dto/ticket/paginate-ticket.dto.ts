import { PartialType, IntersectionType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from '@share/interfaces/paginate-params.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TICKET_SORT_ENUM } from '../../constants/ticket.constants';
import { genEnumDes } from '@share/interfaces/des-enum';
import { REGION_ENUM, WIN_STATUS_ENUM } from '@share/interfaces/lottery-ticket';

export class PaginateTicketDto extends IntersectionType(PartialType(PaginationParams)) {
	@IsString()
	@IsOptional()
	@ApiProperty({ example: '2021-01-31' })
	@ApiPropertyOptional()
	dateFrom!: string;

	@IsString()
	@IsOptional()
	@ApiPropertyOptional()
	dateTo!: string;

	@ApiProperty({
		example: genEnumDes(TICKET_SORT_ENUM),
	})
	@IsOptional()
	@ApiPropertyOptional()
	sortBy: string;

	@IsString()
	@IsOptional()
	@ApiPropertyOptional({ required: true, example: genEnumDes(REGION_ENUM) })
	@IsEnum(REGION_ENUM)
	region: REGION_ENUM;

	@IsString()
	@IsOptional()
	@ApiPropertyOptional({ required: true, example: genEnumDes(WIN_STATUS_ENUM) })
	@IsEnum(WIN_STATUS_ENUM)
	winStatus: WIN_STATUS_ENUM;
}
