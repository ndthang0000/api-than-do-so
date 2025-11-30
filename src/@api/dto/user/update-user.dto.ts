import { ApiPropertyOptional } from '@nestjs/swagger';
import { genEnumDes } from '@share/interfaces/des-enum';
import { IsOptional, IsString } from 'class-validator';
import { GENDER_ENUM } from '../../constants/user.constants';

export class UpdateUserDto {
	@ApiPropertyOptional({ required: false, example: 'https://example.com/image.png' })
	@IsString()
	@IsOptional()
	avatar: string;

	@ApiPropertyOptional({ required: false, example: '2001-12-20' })
	@IsString()
	@IsOptional()
	birthdate: string;

	@ApiPropertyOptional({ required: false, example: 'John Doe' })
	@IsString()
	@IsOptional()
	name: string;

	@ApiPropertyOptional({ required: false, example: 'John Doe' })
	@IsString()
	@IsOptional()
	password: string;

	@ApiPropertyOptional({ required: false, example: genEnumDes(GENDER_ENUM) })
	@IsString()
	@IsOptional()
	gender: string;
}
