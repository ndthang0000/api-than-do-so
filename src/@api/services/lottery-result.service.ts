import { Inject, Injectable } from '@nestjs/common';
import { LotteryResult, LotteryResultDocument } from '@core/mongodb/schemas/lottery-result.schema';
import { LotteryResultRepository } from '@core/mongodb/repository/lottery-result.repository';
import { Types } from 'mongoose';
import { createDefaultLotteryResult, LOTTERY_SCHEDULE, Region } from '@share/interfaces/lottery-ticket';
import RedisCache from '@core/infrastructure/redis.cache';
import { TicketRepository } from '@core/mongodb/repository/ticket.repository';

@Injectable()
export class LotteryResultService {
	constructor(
		@Inject() private readonly lotteryResultRepo: LotteryResultRepository,
		@Inject() private readonly redisCache: RedisCache,
	) {}

	getStationsByRegionAndDate(region: string, date: string, targetStation?: string): string[] {
		const dayOfWeek = new Date(date.split('-').reverse().join('-')).getDay(); // 0-6 (Chủ nhật là 0)
		const scheduleEntry = LOTTERY_SCHEDULE.find(entry => entry.region === region);

		if (!scheduleEntry) return [];

		const scheduleForDay = scheduleEntry.schedule.find(s => {
			const weekdayMap: any = {
				sunday: 0,
				monday: 1,
				tuesday: 2,
				wednesday: 3,
				thursday: 4,
				friday: 5,
				saturday: 6,
			};
			return weekdayMap[s.date] === dayOfWeek;
		});

		if (!scheduleForDay) return [];

		// Nếu người dùng chọn đài cụ thể, chỉ trả về đài đó (sau khi check có lịch quay hay không)
		if (targetStation) {
			return scheduleForDay.provinces.includes(targetStation) ? [targetStation] : [];
		}

		// Trả về danh sách tất cả các đài quay trong ngày của vùng đó
		return scheduleForDay.provinces;
	}

	async getLiveLotteryResult(region: string, date: string, station?: string) {
		// 1. Tìm danh sách các đài của vùng đó trong ngày đó
		// (Dựa vào LOTTERY_SCHEDULE hoặc helper của bạn)
		const stationsInDay = this.getStationsByRegionAndDate(region, date, station);

		const finalResults: LotteryResult[] = [];

		for (const st of stationsInDay) {
			// NGUỒN 1: Thử lấy từ Redis (Dữ liệu đang live hoặc vừa live xong)
			const redisKey = `lottery_live:${region}:${st}:${date}`;
			const cachedData = await this.redisCache.get(redisKey);
			if (cachedData) {
				finalResults.push({
					prizes: {
						...JSON.parse(cachedData),
					},
					region: region as Region,
					date,
					station: st,
					isLive: true, // Đánh dấu đang lấy từ cache live
				});
				continue;
			}

			// NGUỒN 2: Thử lấy từ Database (Dữ liệu cũ hoặc đã lưu xong)
			const dbData = await this.lotteryResultRepo.findOne({ region, date, station: st });
			if (dbData) {
				finalResults.push({ ...dbData.toObject() });
				continue;
			}

			// NGUỒN 3: Tạo dữ liệu mặc định (Dấu *)
			const defaultData = createDefaultLotteryResult(region as Region, date, st);
			finalResults.push(defaultData);
		}

		return finalResults;
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
