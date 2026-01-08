import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ timestamps: true })
export class Ticket {
	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	userId: Types.ObjectId;

	@Prop()
	code: string;

	@Prop()
	date: string;

	@Prop({ required: false })
	specialCode?: string;

	@Prop()
	station: string;

	@Prop()
	region: string;

	@Prop({ required: true, enum: ['PENDING', 'WIN', 'LOSE'], index: true })
	winStatus: string;

	@Prop()
	winDetails: Array<string>;

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

	@Prop()
	message?: string;

	@Prop()
	prizeMoney?: number;

	@Prop()
	durationScan?: number;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
