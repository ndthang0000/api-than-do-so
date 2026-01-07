import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base-repo';
import { TicketDocument, Ticket } from '../schemas/ticket.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class TicketRepository extends BaseRepository<TicketDocument> {
	constructor(@InjectModel(Ticket.name) model: Model<TicketDocument>) {
		super(model);
	}
}
