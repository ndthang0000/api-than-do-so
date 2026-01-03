import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base-repo';
import { LotteryResultDocument, LotteryResult } from '../schemas/lottery-result.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class LotteryResultRepository extends BaseRepository<LotteryResultDocument> {
	constructor(@InjectModel(LotteryResult.name) model: Model<LotteryResultDocument>) {
		super(model);
	}
}
