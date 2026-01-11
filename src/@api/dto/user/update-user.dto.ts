import { ApiPropertyOptional } from '@nestjs/swagger';
import { genEnumDes } from '@share/interfaces/des-enum';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { GENDER_ENUM } from '../../constants/user.constants';
import { Type } from 'class-transformer';

export class SettingAppDto {
	@ApiPropertyOptional({ example: 'DARK' })
	@IsEnum(['DARK', 'LIGHT'])
	@IsOptional()
	theme?: string;

	@ApiPropertyOptional({ example: 'VI' })
	@IsEnum(['VI', 'EN'])
	@IsOptional()
	language?: string;

	@ApiPropertyOptional()
	@IsBoolean()
	@IsOptional()
	showLotoTable?: boolean;

	@ApiPropertyOptional()
	@IsBoolean()
	@IsOptional()
	isVoiceEnabled?: boolean;

	@ApiPropertyOptional()
	@IsBoolean()
	@IsOptional()
	isMusicEnabled?: boolean;

	@ApiPropertyOptional({ example: 'MEDIUM' })
	@IsEnum(['SMALL', 'MEDIUM', 'LARGE'])
	@IsOptional()
	fontSize?: string;

	// Cập nhật thành IsNumber với option each: true
	@ApiPropertyOptional({ type: [Number], example: [1, 2, 3] })
	@IsArray()
	@IsNumber({}, { each: true })
	@IsOptional()
	highlightHead?: number[];

	@ApiPropertyOptional({ type: [Number], example: [4, 5, 6] })
	@IsArray()
	@IsNumber({}, { each: true })
	@IsOptional()
	highlightTail?: number[];
}

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

	@ApiPropertyOptional({ type: SettingAppDto })
	@IsOptional()
	@ValidateNested() // Bắt buộc phải có để validate các field bên trong
	@Type(() => SettingAppDto) // Bắt buộc để class-transformer hiểu kiểu dữ liệu
	settingApp?: SettingAppDto;
}
