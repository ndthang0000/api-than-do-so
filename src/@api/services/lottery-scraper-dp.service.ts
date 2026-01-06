import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import moment from 'moment';
import { LotteryUpdatePayload } from '@share/interfaces/lottery-realtime';
import RedisCache from '@core/infrastructure/redis.cache';
import { LotteryResult } from '@core/mongodb/schemas/lottery-result.schema';
import { LotteryResultRepository } from '@core/mongodb/repository/lottery-result.repository';

// Giả định các interface cần thiết
interface LotteryPrize {
	rank: string;
	index: number;
	value: string;
}

@Injectable()
export class LotteryScraperDpService {
	private readonly logger = new Logger(LotteryScraperDpService.name);
	private readonly BASE_URL = 'https://live.xosodaiphat.com/lotteryLive';

	constructor(
		@Inject() private readonly redisCache: RedisCache,
		@Inject() private readonly lotteryRepository: LotteryResultRepository,
		private readonly eventEmitter: EventEmitter2,
	) {}

	@Cron('*/2 14-40 00 * * *') // Miền Nam: 16:15 - 16:40
	async handleSouthLive() {
		await this.processRegion('2', 'south');
	}

	@Cron('*/1 14-40 17 * * *') // Miền Trung: 17:15 - 17:40
	async handleCentralLive() {
		await this.processRegion('3', 'central');
	}

	@Cron('*/1 14-40 17 * * *') // Miền Trung: 17:15 - 17:40
	async handleNorthLive() {
		await this.processRegion('1', 'north');
	}

	private async processRegion(regionCode: string, regionName: string) {
		try {
			const todayStr = moment().format('YYYYMMDD');
			const url = `${this.BASE_URL}/${regionCode}/${todayStr}`; // Giả định dùng ID ngày như bạn mô tả

			const { data } = await axios.get(url);

			if (!data || !Array.isArray(data)) return;

			await Promise.all(data.map(item => this.syncStationData(item, regionName as any)));
		} catch (error) {
			this.logger.error(`Error scraping ${regionName}: ${error.message}`);
		}
	}

	private async syncStationData(apiItem: any, region: 'north' | 'central' | 'south') {
		const station = apiItem.LotteryName;
		const date = moment().format('DD-MM-YYYY');
		const redisKey = `lottery_live:${region}:${station}:${date}`;

		let isChange = false;
		// 1. Transform dữ liệu từ Đại Phát sang Schema của bạn
		const currentPrizes = this.transformPrizes(apiItem.LotPrizes, region);
		if (region === 'north' && apiItem.SpecialCodes) {
			currentPrizes.specialCode = apiItem.SpecialCodes;
		}
		// 2. Lấy dữ liệu cũ từ Redis để so sánh
		const oldPrizesStr = await this.redisCache.get(redisKey);
		const oldPrizes = oldPrizesStr ? JSON.parse(oldPrizesStr) : null;

		if (currentPrizes.specialCode && oldPrizes.specialCode !== currentPrizes.specialCode) {
			isChange = true;
		}
		// 3. Tìm các thay đổi (Số mới nhảy)
		const changes = this.getChanges(oldPrizes, currentPrizes);

		const isFinished = this.checkIfFinished(currentPrizes);
		if (changes.length > 0 || isChange) {
			const payload: LotteryUpdatePayload = {
				date: date,
				region: region,
				station: station,
				prizes: currentPrizes,
				isLive: !isFinished,
				changes: changes,
			};

			// Bắn event ra hệ thống (Socket.io sẽ nghe event này)
			this.eventEmitter.emit('lottery.result.updated', payload);

			// Cập nhật Redis
			await this.redisCache.set(redisKey, JSON.stringify(currentPrizes), 3600); // TTL 1 giờ

			// Kỹ thuật nâng cao: Ngưng spam 30s nếu chưa xong hẳn
		}

		if (isFinished) {
			//save to DB
			const dbPayload: LotteryResult = {
				date: date,
				region: region,
				station: station,
				prizes: currentPrizes,
				isLive: false,
				type: '',
			};
			const existing = await this.lotteryRepository.findOne({
				date: dbPayload.date,
				station: dbPayload.station,
				region: dbPayload.region,
			});
			if (existing) {
				await this.lotteryRepository.findOneAndUpdate(
					{ date: dbPayload.date, station: dbPayload.station, region: dbPayload.region },
					{ prizes: dbPayload.prizes, isLive: dbPayload.isLive, type: dbPayload.type },
					{ new: true },
				);
			} else {
				await this.lotteryRepository.add(dbPayload);
			}
		}
	}

	private transformPrizes(lotPrizes: any[], region: 'north' | 'central' | 'south') {
		let result: any;

		if (region === 'north') {
			result = {
				specialCode: '',
				DB: ['*'],
				G1: ['*'],
				G2: ['*', '*'],
				G3: ['*', '*', '*', '*', '*', '*'],
				G4: ['*', '*', '*', '*'],
				G5: ['*', '*', '*', '*', '*', '*'],
				G6: ['*', '*', '*'],
				G7: ['*', '*', '*', '*'],
			};
		} else {
			// Miền Trung và Miền Nam cấu trúc giống nhau
			result = {
				specialCode: '',
				DB: ['*'],
				G1: ['*'],
				G2: ['*'],
				G3: ['*', '*'],
				G4: ['*', '*', '*', '*', '*', '*', '*'],
				G5: ['*'],
				G6: ['*', '*', '*'],
				G7: ['*'],
				G8: ['*'], // Lưu ý: Miền Nam/Trung thường chỉ có 1 số giải 8,
			};
		}

		const mapRank = {
			DB6: 'DB',
			'G.1': 'G1',
			'G.2': 'G2',
			'G.3': 'G3',
			'G.4': 'G4',
			'G.5': 'G5',
			'G.6': 'G6',
			'G.7': 'G7',
			'G.8': 'G8',
			DB: 'DB',
		};

		lotPrizes.forEach(p => {
			const key = mapRank[p.Prize];
			if (key) {
				// Đại Phát dùng " - " để phân tách các số trong cùng 1 giải
				const values = p.Range.split(' - ').map(v => (v.trim() === '---' ? '*' : v.trim()));
				result[key] = values;
			}
		});

		return result;
	}

	private getChanges(oldPrizes: any, newPrizes: any): LotteryPrize[] {
		const changes: LotteryPrize[] = [];
		if (!oldPrizes) {
			// Lần đầu chạy, coi tất cả những số không phải "*" là thay đổi
			Object.keys(newPrizes).forEach(rank => {
				if (rank === 'specialCode') return;
				newPrizes[rank].forEach((val, idx) => {
					if (val !== '*') changes.push({ rank, index: idx, value: val });
				});
			});
			return changes;
		}

		Object.keys(newPrizes).forEach(rank => {
			if (rank === 'specialCode') return;
			newPrizes[rank].forEach((val, idx) => {
				if (val !== '*' && oldPrizes[rank][idx] === '*') {
					changes.push({ rank, index: idx, value: val });
				}
			});
		});
		return changes;
	}

	private checkIfFinished(prizes: any): boolean {
		// Kiểm tra xem giải đặc biệt (DB) đã có số chưa (không còn là "*")
		return prizes.DB[0] !== '*';
	}
}
