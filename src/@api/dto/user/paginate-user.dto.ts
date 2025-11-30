import { PartialType, IntersectionType } from '@nestjs/swagger';
import { PaginationParams } from '@share/interfaces/paginate-params.dto';
import { GetAllUserDto } from './all-user.dto';

export class PaginateUserDto extends IntersectionType(PartialType(PaginationParams), PartialType(GetAllUserDto)) {}
