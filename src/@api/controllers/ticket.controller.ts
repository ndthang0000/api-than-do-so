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
import { TicketService } from '@service/ticket.service';
import { PaginateTicketDto } from '@dto/ticket/paginate-ticket.dto';
import { responseData, responseMessage } from '@share/interfaces/response-face';
import { ConvertSortBy, validateSortBy } from '@share/utils/sortby';
import omitKey from '@share/interfaces/omit-key.type';
import { USER_SORT_ENUM } from '../constants/user.constants';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../@guard/auth.guard';
import { CheckTicketDto } from '@dto/ticket/check-ticket.dto';
import { RequestWithUser } from '@share/interfaces/i.custom-request';
import { TICKET_SORT_ENUM } from '../constants/ticket.constants';

@Controller('tickets')
export class TicketController {
	constructor(private readonly ticketService: TicketService) {}

	@Get('/paginate')
	async paginate(@Query() dto: PaginateTicketDto) {
		const enumSort = Object.values(TICKET_SORT_ENUM);
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

		const data = await this.ticketService.paginateTicket({
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

		const data = await this.ticketService.getTicket(id);
		return responseData(data);
	}

	@Delete('/:id')
	async delete(@Param('id') id: string) {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException('Invalid ID');
		}

		const deleted = await this.ticketService.deleteTicket(id);
		return responseMessage(deleted ? 'Deleted Ticket successfully' : `Error! Can't delete Ticket`, deleted, 204);
	}

	@Post('/check-and-save')
	@ApiBearerAuth()
	@UseGuards(AuthGuard)
	async checkAndSaveTicket(@Body() dto: CheckTicketDto, @Request() req: RequestWithUser) {
		//validate data
		this.ticketService.validateLotteryInputStrict(dto);

		const result = await this.ticketService.processTicket(dto, req.user.id);

		return responseData(result);
	}
}
