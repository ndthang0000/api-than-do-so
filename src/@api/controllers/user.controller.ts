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
import { UserService } from '@service/user.service';
import { PaginateUserDto } from '@dto/user/paginate-user.dto';
import { UpdateUserDto } from '@dto/user/update-user.dto';
import { responseData, responseMessage } from '@share/interfaces/response-face';
import { ConvertSortBy, validateSortBy } from '@share/utils/sortby';
import omitKey from '@share/interfaces/omit-key.type';
import { USER_SORT_ENUM } from '../constants/user.constants';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../@guard/roles.decorator';
import { ADMIN_ROLE_ENUM, getRoles, USER_ROLE_ENUM } from '../@guard/role.constant';
import { AuthGuard } from '../@guard/auth.guard';
import { RolesGuard } from '../@guard/role.guard';
import { RequestWithUser } from '@share/interfaces/i.custom-request';
import { RegisterUserDto } from '@dto/user/register-user.dto';

@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	//For USER
	@Patch()
	@ApiBearerAuth()
	@UseGuards(AuthGuard, RolesGuard)
	@Roles(getRoles(USER_ROLE_ENUM))
	async updateUser(@Body() dto: UpdateUserDto, @Request() req: RequestWithUser) {
		const id = req.user.id;
		const newUser = await this.userService.updateUser(id, dto as any);
		return responseData(newUser, 'Cập nhật thông tin thành công');
	}

	@Post('/register-user')
	async registerUser(@Body() dto: RegisterUserDto) {
		const user = await this.userService.createUser(dto);
		return responseData(user, `Đăng ký thành công`);
	}

	// For ADMIN Below

	@Get('/paginate')
	@ApiBearerAuth()
	@UseGuards(AuthGuard, RolesGuard)
	@Roles([ADMIN_ROLE_ENUM.ADMIN])
	async paginate(@Query() dto: PaginateUserDto) {
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

		const data = await this.userService.paginateUser({
			page: dto.page,
			limit: dto.limit,
			filter,
			order: orderBy,
		});
		return responseData(data);
	}

	@Get('/:id')
	@ApiBearerAuth()
	@UseGuards(AuthGuard, RolesGuard)
	@Roles([ADMIN_ROLE_ENUM.ADMIN])
	async get(@Param('id') id: string) {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException('Invalid ID');
		}

		const data = await this.userService.getUser(id);
		return responseData(data);
	}

	@Delete('/:id')
	@ApiBearerAuth()
	@UseGuards(AuthGuard, RolesGuard)
	@Roles([ADMIN_ROLE_ENUM.ADMIN])
	async delete(@Param('id') id: string) {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException('Invalid ID');
		}

		const deleted = await this.userService.deleteUser(id);
		return responseMessage(deleted ? 'Deleted User successfully' : `Error! Can't delete User`, deleted, 204);
	}

	@Patch('/admin/:id')
	@ApiBearerAuth()
	@UseGuards(AuthGuard, RolesGuard)
	@Roles([ADMIN_ROLE_ENUM.ADMIN])
	async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException('Invalid ID');
		}

		const updated = await this.userService.updateUser(id, dto);
		return responseData(updated, 'User updated successfully');
	}
}
