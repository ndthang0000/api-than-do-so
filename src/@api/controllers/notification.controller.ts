import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationService } from '@service/notification.service';
import { CreateNotificationDto } from '@dto/notification/create-notification.dto';
import { PaginateNotificationDto } from '@dto/notification/paginate-notification.dto';
import { UpdateNotificationDto } from '@dto/notification/update-notification.dto';
import { GetAllNotificationDto } from '@dto/notification/all-notification.dto';
import { responseData, responseMessage } from '@share/interfaces/response-face';
import { ConvertSortBy, validateSortBy } from '@share/utils/sortby';
import omitKey from '@share/interfaces/omit-key.type';
import { USER_SORT_ENUM } from '../constants/user.constants';
import { RequestWithUser } from '@share/interfaces/i.custom-request';
import { SubscribeTopicDto } from '@dto/notification/subscribe-topic.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../@guard/auth.guard';

@Controller('notifications')
export class NotificationController {
	constructor(private readonly notificationService: NotificationService) {}

	@Post('/subscribe-topic')
	@ApiBearerAuth()
	@UseGuards(AuthGuard)
	async subscribeTopic(@Body() dto: SubscribeTopicDto, @Request() req: RequestWithUser) {
		await this.notificationService.updateSubscription(dto, req.user.id);
		return responseMessage('Subscribe Topic Successfully', true);
	}
	@Post()
	async create(@Body() dto: CreateNotificationDto) {
		const data = await this.notificationService.createNotification(dto);
		return responseData(data, 'Notification created successfully');
	}

	@Get('/paginate')
	async paginate(@Query() dto: PaginateNotificationDto) {
		const enumSort = Object.values(USER_SORT_ENUM);
		const { sortBy = 'createdAt:asc', dateFrom, dateTo } = dto;

		let filter = {};

		if (dateFrom || dateTo) {
			filter['createdAt'] = {
				...(dateFrom && { $gte: new Date(dateFrom) }),
				...(dateTo && { $lte: new Date(dateTo) }),
			};
		}

		const where = omitKey(dto, ['dateFrom', 'dateTo', 'sortBy', 'page', 'limit']);
		filter = Object.assign(filter, where);

		if (!validateSortBy(enumSort, sortBy)) {
			throw new HttpException('Invalid sortBy', HttpStatus.BAD_REQUEST);
		}
		const orderBy = ConvertSortBy(sortBy);

		const data = await this.notificationService.paginateNotification({
			page: dto.page,
			limit: dto.limit,
			filter,
			order: orderBy,
		});
		return responseData(data);
	}

	@Get('/:id')
	async get(@Param('id') id: string) {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException('Invalid ID');
		}

		const data = await this.notificationService.getNotification(id);
		return responseData(data);
	}

	@Get()
	async getAll(@Query() dto: GetAllNotificationDto) {
		const enumSort = Object.values(USER_SORT_ENUM);
		const { sortBy = 'createdAt:asc', dateFrom, dateTo } = dto;

		let filter = {};

		if (dateFrom || dateTo) {
			filter['createdAt'] = {
				...(dateFrom && { $gte: new Date(dateFrom) }),
				...(dateTo && { $lte: new Date(dateTo) }),
			};
		}

		const where = omitKey(dto, ['dateFrom', 'dateTo', 'sortBy']);
		filter = Object.assign(filter, where);

		if (!validateSortBy(enumSort, sortBy)) {
			throw new HttpException('Invalid sortBy', HttpStatus.BAD_REQUEST);
		}
		const orderBy = ConvertSortBy(sortBy);

		const data = await this.notificationService.getAllNotification({
			filter: filter,
			order: orderBy,
		});
		return responseData(data);
	}

	@Delete('/:id')
	async delete(@Param('id') id: string) {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException('Invalid ID');
		}

		const deleted = await this.notificationService.deleteNotification(id);
		return responseMessage(
			deleted ? 'Deleted Notification successfully' : `Error! Can't delete Notification`,
			deleted,
			204,
		);
	}

	@Patch('/:id')
	async update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException('Invalid ID');
		}

		const updated = await this.notificationService.updateNotification(id, dto);
		return responseData(updated, 'Notification updated successfully');
	}
}
