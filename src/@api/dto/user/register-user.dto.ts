import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { genEnumDes } from '@share/interfaces/des-enum';
import { GENDER_ENUM } from '../../constants/user.constants';

export class RegisterUserDto {
	@IsString()
	@ApiProperty({ required: true })
	@IsOptional()
	name: string;

	@IsString()
	@IsOptional()
	@ApiPropertyOptional({ required: true, default: 'test@gmail.com' })
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	@Matches(/^.{8,}$/, {
		message: 'password must be at least 8 characters long',
	})
	@ApiProperty({ required: true })
	password: string;

	@IsDateString()
	@IsOptional()
	@ApiProperty({ required: false, default: '' })
	birthdate: Date;

	@IsString()
	@IsOptional()
	@ApiProperty({ required: false, default: genEnumDes(GENDER_ENUM) })
	@IsEnum(GENDER_ENUM)
	gender: string;
}
