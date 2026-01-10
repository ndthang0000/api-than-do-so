import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LotteryResultDocument = HydratedDocument<LotteryResult>;

@Schema({ timestamps: true })
export class LotteryResult {
	@Prop({ required: true, index: true })
	date: string; // Định dạng DD-MM-YYYY

	@Prop({ required: true, enum: ['north', 'central', 'south'], index: true })
	region: string;

	@Prop({ required: true })
	station: string; // Tên hiển thị: 'TP. Hồ Chí Minh'

	@Prop({ type: Object, required: true })
	prizes: {
		DB: string[];
		G1: string[];
		G2: string[];
		G3: string[];
		G4: string[];
		G5: string[];
		G6: string[];
		G7: string[];
		G8?: string[]; // Miền Bắc không có G8
		specialCode?: string; // Ký hiệu GĐB Miền Bắc (ví dụ: ['1AY', '2AY'])
	};

	@Prop({ default: false })
	isFinished: boolean;

	@Prop({ default: null, type: String, required: false })
	type?: string;
}

export const LotteryResultSchema = SchemaFactory.createForClass(LotteryResult);
