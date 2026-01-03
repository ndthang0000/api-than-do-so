import { Inject, Injectable } from '@nestjs/common';
import { LotteryResult, LotteryResultDocument } from '@core/mongodb/schemas/lottery-result.schema';
import { LotteryResultRepository } from '@core/mongodb/repository/lottery-result.repository';
import { Types } from 'mongoose';

@Injectable()
export class LotteryResultService {
	constructor(@Inject() private readonly lotteryResultRepo: LotteryResultRepository) {}

	async getLiveLotteryResult(region: string, date: string, station: string): Promise<LotteryResult[]> {
		return this.lotteryResultRepo.findAll({ region, date, ...(station ? { station } : {}) });
	}

	async getLotteryResult(id: string): Promise<LotteryResult | null> {
		return this.lotteryResultRepo.findOne({ _id: new Types.ObjectId(id) });
	}

	async deleteLotteryResult(id: string): Promise<boolean> {
		const data = await this.lotteryResultRepo.deleteOne({ _id: new Types.ObjectId(id) });
		if (data.deletedCount === 0) {
			return false;
		}
		return true;
	}

	async paginateLotteryResult(query: any): Promise<any> {
		return this.lotteryResultRepo.paginate({
			page: query.page,
			limit: query.limit,
			filter: query.filter,
			sortBy: query.sortBy,
			populate: query.populate,
		});
	}

	async getAllLotteryResult(query: any): Promise<LotteryResultDocument[]> {
		return this.lotteryResultRepo.findAll(query.filter, query.populate, query.order);
	}
}
