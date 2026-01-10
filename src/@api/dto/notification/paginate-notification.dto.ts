import { PartialType, IntersectionType } from '@nestjs/swagger';
import { PaginationParams } from '@share/interfaces/paginate-params.dto';
import { GetAllNotificationDto } from './all-notification.dto';

export class PaginateNotificationDto extends IntersectionType(
	PartialType(PaginationParams),
	PartialType(GetAllNotificationDto),
) {}
