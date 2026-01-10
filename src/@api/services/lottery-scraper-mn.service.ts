//This is crawler for vesominhngoc.com.vn

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { LotteryResult } from '@core/mongodb/schemas/lottery-result.schema';
import { Cron } from '@nestjs/schedule';
import { LotteryResultRepository } from '@core/mongodb/repository/lottery-result.repository';
import RedisCache from '@core/infrastructure/redis.cache';
import { EventEmitter2 } from '@nestjs/event-emitter';
import moment from 'moment';
import { sleep } from '@core/utils/sleep';
import { LotteryUpdatePayload } from '@share/interfaces/lottery-realtime';

const CRAWL_CONFIG_LIVE = {
	south: 'https://vesominhngoc.com.vn/truc-tiep-xo-so-mien-nam-xsmn-xstt-mn',
	central: 'https://vesominhngoc.com.vn/truc-tiep-xo-so-mien-trung-xsmt-xstt-mt',
	north: 'https://vesominhngoc.com.vn/truc-tiep-xo-so-mien-bac-xsmb-xstt-mb',
};

// Map tên giải trên web sang Key trong Model của bạn

@Injectable()
export class LotteryScraperService implements OnModuleInit {
	private readonly logger = new Logger(LotteryScraperService.name);
	private readonly userAgents = [
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
	];
	constructor(
		@Inject() private readonly lotteryRepository: LotteryResultRepository,
		@Inject() private readonly redisCache: RedisCache,
		@Inject() private readonly eventEmitter: EventEmitter2,
	) {
		this.eventEmitter.on('lottery.result.updated', data => {
			console.log('✅ TEST: Đã nhận được event tại ScraperService!', data);
		});
		// this.handleCentral();
		// this.handleNorth();
		// this.handleSouth();
	}

	async onModuleInit() {
		// run 12213213 sdfsdfsd  sdfsdsd23sdf ưedff sdf sdfsfsd
		this.logger.log('🚀 LotteryScraperService đã sẵn sàng');
		// Test thử sau 3 giây để chắc chắn Gateway đã up
		// setTimeout(() => {
		//   this.fakeEventEmitForTest(0);
		// }, 3000);
		// setTimeout(() => {
		//   this.fakeEventEmitForTest(1);
		// }, 10000);
		// setTimeout(() => {
		//   this.fakeEventEmitForTest(2);
		// }, 15000);
		// setTimeout(() => {
		//   this.fakeEventEmitForTest(3);
		// }, 20000);
	}
	// Hàm tổng cho phép gọi crawl bất kỳ miền nào
	async crawlLiveRegion(region: 'north' | 'central' | 'south') {
		try {
			let url = CRAWL_CONFIG_LIVE[region];

			const { data: html } = await axios.get(url);
			const $ = cheerio.load(html);

			const results: LotteryResult[] = [];
			// const dateStr = $('input[name="vdn"]').first().val()?.toString().trim() || moment().format('DD-MM-YYYY'); // Định dạng thường là DD-MM-YYYY // thẻ input có name="ngay"

			const classToModelKey = {
				giai_dac_biet: 'DB',
				giai_nhat: 'G1',
				giai_nhi: 'G2',
				giai_ba: 'G3',
				giai_tu: 'G4',
				giai_nam: 'G5',
				giai_sau: 'G6',
				giai_bay: 'G7',
				giai_tam: 'G8',
			};

			if (region === 'central' || region === 'south') {
				$('.box_kqxs').each((_, box) => {
					const [day, month] = $(box).find('.daymonth').text()?.trim()?.split('/'); // Ví dụ: "Kết quả ngày 25/08/2023",
					const year = $(box).find('.year').text()?.trim(); // Lấy năm từ thẻ có class "year"

					const dateStr = `${day}-${month}-${year}`; // Định dạng DD-MM-YYYY
					$(box)
						.find('.tblKQTinh')
						.each((_, table) => {
							let stationName = $(table).find('.tentinh .namelong').text().trim();
							// special case for station "TP. HCM"
							if (stationName === 'TP. HCM') {
								stationName = 'TP.HCM';
							} else if (stationName === 'Thừa T. Huế') {
								stationName = 'TT-Huế';
							}
							const type = $(table).find('.loaive').text().trim();
							if (!stationName) return;
							const prizeData = {
								date: dateStr,
								region: region, // Tùy chọn theo URL bạn crawl
								station: stationName,
								prizes: {
									DB: [],
									G1: [],
									G2: [],
									G3: [],
									G4: [],
									G5: [],
									G6: [],
									G7: [],
									G8: [],
									specialCode: '',
								},
								type: type,
								isFinished: false,
							};

							// Lấy tất cả các dòng giải thưởng
							$(table)
								.find('tr')
								.each((__, tr) => {
									const td = $(tr).find('td');
									const className = td.attr('class'); // Lấy class của td (ví dụ: "giai_sau")

									const modelKey = classToModelKey[className as keyof typeof classToModelKey];
									if (modelKey) {
										// Lấy tất cả các số trong các div có class "dayso"
										const numbers = td
											.find('.dayso')
											.map((___, el) => {
												return $(el).attr('data') || $(el).text().trim();
											})
											.get();

										prizeData.prizes[modelKey] = numbers;
									}
								});

							// Kiểm tra xem có đang LIVE không (nếu có giải chứa dấu "...")
							prizeData.isFinished = !JSON.stringify(prizeData).includes('*'); // TODO: Cần cách kiểm tra chính xác hơn nếu có thể

							results.push(prizeData);
						});
				});
			} else {
				const box = $('.xsmb');
				box.each((_, container) => {
					const stationName = $(container).find('.tentinh .phathanh').text().trim() || 'Miền Bắc';
					const [day, month] = $(container).find('.daymonth').text()?.trim()?.split('/'); // Ví dụ: "Kết quả ngày 25/08/2023"
					const year = $(container).find('.year').text()?.trim(); // Lấy năm từ thẻ có class "year"

					const dateStr = `${day}-${month}-${year}`; // Định dạng DD-MM-YYYY
					const prizeData = {
						date: dateStr,
						region: 'north',
						station: stationName,
						prizes: {
							DB: [],
							G1: [],
							G2: [],
							G3: [],
							G4: [],
							G5: [],
							G6: [],
							G7: [],
							specialCode: '', // Thêm trường riêng cho mã đặc biệt của XSMB
						},
						isFinished: false,
						type: '',
					};
					$(container)
						.find('.kqxs_content table tr')
						.each((_, tr) => {
							const tdContent = $(tr).find('td[class^="giai_"]');
							const className = tdContent.attr('class');
							if (className) {
								const modelKey = classToModelKey[className as keyof typeof classToModelKey];
								if (modelKey) {
									// Lấy danh sách số
									const numbers = tdContent
										.find('.dayso')
										.map((__, el) => $(el).attr('data'))
										.get();
									prizeData.prizes[modelKey] = numbers;

									// Riêng giải Đặc biệt: Lấy thêm ký hiệu (Mã vé))
									if (modelKey === 'DB') {
										const codes = tdContent.find('.kyhieuDB').text().trim();
										// Tách chuỗi "15-1-16... TS" thành array
										prizeData.prizes.specialCode = codes;
									}
								}
							}
						});
					prizeData.isFinished = !JSON.stringify(prizeData).includes('*'); // TODO: Cần cách kiểm tra chính xác hơn nếu có thể
					results.push(prizeData);
				});
			}

			// Lưu vào Database (Upsert)
			await this.saveToDb(results);
			return results;
		} catch (error) {
			this.logger.error(`Crawl ${region} thất bại: ${error.message}`);
		}
	}

	private async saveToDb(results: LotteryResult[]) {
		for (const res of results) {
			const cacheKey = `lottery:${res.region}:${res.date}:${res.station}`.replace(/\s+/g, ''); // remove spaces if any
			const cachedData = await this.redisCache.get(cacheKey);

			let isChanged = false;
			if (!cachedData) {
				isChanged = true;
			} else {
				isChanged = cachedData !== JSON.stringify(res.prizes);
			}

			if (isChanged) {
				await this.redisCache.set(cacheKey, JSON.stringify(res.prizes), 3600 * 24); // Lưu cache 1 ngày
				//emit event update result

				const oldPrizes = cachedData ? JSON.parse(cachedData) : null;
				const changes: Array<{ rank: string; index: number; value: string }> = [];

				if (res.prizes && typeof res.prizes === 'object') {
					for (const rankKey of Object.keys(res.prizes)) {
						if (rankKey === 'specialCode') continue; // skip specialCode
						const newArr: any[] = Array.isArray(res.prizes[rankKey]) ? res.prizes[rankKey] : [];
						const oldArr: any[] = oldPrizes && Array.isArray(oldPrizes[rankKey]) ? oldPrizes[rankKey] : [];

						const maxLen = Math.max(newArr.length, oldArr.length);
						for (let i = 0; i < maxLen; i++) {
							const newVal = newArr[i];
							const oldVal = oldArr[i];

							// Consider a change when values are different and newVal is present
							if (newVal !== oldVal && newVal !== undefined && newVal !== null && newVal !== '') {
								changes.push({ rank: rankKey, index: i, value: String(newVal) });
							}
						}
					}
				}
				const payload: LotteryUpdatePayload = {
					date: res.date,
					region: res.region as 'north' | 'central' | 'south',
					station: res.station,
					prizes: res.prizes,
					isFinished: res.isFinished,
					changes: changes,
				};
				this.eventEmitter.emit('lottery.result.updated', payload);
				console.log({ date: res.date, station: res.station, region: res.region });
				if (
					await this.lotteryRepository.findOne({ date: res.date, station: res.station, region: res.region })
				) {
					await this.lotteryRepository.findOneAndUpdate(
						{
							date: res.date,
							station: res.station,
							region: res.region,
						},
						{
							prizes: res.prizes,
							isFinished: res.isFinished,
							type: res.type,
						},
						{ new: true },
					);
				} else {
					await this.lotteryRepository.add(res);
				}
			}
		}
	}

	// Miền Nam quay lúc 16:10
	// @Cron('*/10 15-40 16 * * *')
	async handleSouth() {
		await this.crawlLiveRegion('south');
	}

	// Miền Bắc quay lúc 18:10
	// @Cron('*/10 15-40 18 * * *')
	async handleNorth() {
		await this.crawlLiveRegion('north');
	}

	// Miền Trung quay lúc 17:10
	// @Cron('*/10 15-40 17 * * *')
	async handleCentral() {
		console.log('đang crawl');
		await this.crawlLiveRegion('central');
	}

	async fakeEventEmitForTest(index: number = 0) {
		const payload: LotteryUpdatePayload = {
			date: '05-01-2026',
			region: 'south',
			station: 'TP.HCM',
			prizes: {
				DB: ['*'],
				G1: ['31660'],
				G2: ['39403'],
				G3: ['45422', '38044'],
				G4: ['56004', '83301', '77760', '82893', '31532', '84848', '16286'],
				G5: ['4656'],
				G6: ['5655', '4074', '1888'],
				G7: ['666'],
				G8: ['26'],
				specialCode: '',
			},
			isFinished: true,
			changes: [
				{
					rank: 'G1',
					index: 0,
					value: '31660',
				},
			],
		};
		const fakePayload2: LotteryUpdatePayload = {
			date: '05-01-2026',
			region: 'south',
			station: 'Đồng Tháp',
			prizes: {
				DB: ['*'],
				G1: ['*'],
				G2: ['*'],
				G3: ['01587', '*'],
				G4: ['30067', '17785', '19439', '22106', '60895', '44504', '17408'],
				G5: ['6380'],
				G6: ['4755', '6251', '8451'],
				G7: ['036'],
				G8: ['19'],
				specialCode: '',
			},
			isFinished: false,
			changes: [
				{
					rank: 'G3',
					index: 0,
					value: '83250',
				},
			],
		};
		const fakePayload3: LotteryUpdatePayload = {
			date: '05-01-2026',
			region: 'south',
			station: 'Đồng Tháp',
			prizes: {
				DB: ['*'],
				G1: ['*'],
				G2: ['53424'],
				G3: ['01587', '83250'],
				G4: ['30067', '17785', '19439', '22106', '60895', '44504', '17408'],
				G5: ['6380'],
				G6: ['4755', '6251', '8451'],
				G7: ['036'],
				G8: ['19'],
				specialCode: '',
			},
			isFinished: false,
			changes: [
				{
					rank: 'G2',
					index: 0,
					value: '54322',
				},
			],
		};
		const fakePayload4: LotteryUpdatePayload = {
			date: '05-01-2026',
			region: 'south',
			station: 'Cà Mau',
			prizes: {
				DB: ['*'],
				G1: ['*'],
				G2: ['*'],
				G3: ['*', '*'],
				G4: ['37310', '33008', '09632', '25717', '69844', '45236', '58723'],
				G5: ['4902'],
				G6: ['0118', '6606', '3526'],
				G7: ['167'],
				G8: ['31'],
				specialCode: '',
			},
			isFinished: false,
			changes: [
				{
					rank: 'G4',
					index: 5,
					value: '45236',
				},
				{
					rank: 'G4',
					index: 6,
					value: '58723',
				},
			],
		};
		const testPayloads = [payload, fakePayload2, fakePayload3, fakePayload4];
		this.eventEmitter.emit('lottery.result.updated', testPayloads[index]);
	}

	async crawlHistory(region: 'north' | 'central' | 'south', startDateStr: string) {
		let currentDate = moment(startDateStr, 'DD-MM-YYYY');
		const endDate = moment(); // Đến ngày hiện tại

		while (currentDate.isBefore(endDate)) {
			const formattedDate = currentDate.format('DD-MM-YYYY');
			this.logger.log(`Đang crawl ${region} tuần kết thúc ngày: ${formattedDate}`);

			await this.crawlByUrl(region, formattedDate);

			// Nhảy cóc 7 ngày
			currentDate = currentDate.add(7, 'days');

			// Security: Nghỉ ngơi giữa các lần request từ 3-8 giây
			const delay = Math.floor(Math.random() * 10000) + 3000;
			await sleep(delay);
		}
		this.logger.log(`Hoàn thành crawl lịch sử miền ${region}`);
	}

	async crawlByUrl(region: string, date: string) {
		try {
			const baseUrl = {
				south: 'https://vesominhngoc.com.vn/ket-qua-xo-so-mien-nam-kqxs-mn',
				central: 'https://vesominhngoc.com.vn/ket-qua-xo-so-mien-trung-kqxs-mt',
				north: 'https://vesominhngoc.com.vn/ket-qua-xo-so-mien-bac-kqxs-mb',
			};

			const url = `${baseUrl[region]}/ngay-${date}`;

			const { data: html } = await axios.get(url, {
				headers: {
					'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
					Referer: 'https://vesominhngoc.com.vn/',
				},
			});

			const $ = cheerio.load(html);
			const results: LotteryResult[] = [];

			const classToModelKey = {
				giai_dac_biet: 'DB',
				giai_nhat: 'G1',
				giai_nhi: 'G2',
				giai_ba: 'G3',
				giai_tu: 'G4',
				giai_nam: 'G5',
				giai_sau: 'G6',
				giai_bay: 'G7',
				giai_tam: 'G8',
			};

			if (region === 'central' || region === 'south') {
				$('.box_kqxs').each((_, box) => {
					const [day, month] = $(box).find('.daymonth').text()?.trim()?.split('/'); // Ví dụ: "Kết quả ngày 25/08/2023",
					const year = $(box).find('.year').text()?.trim(); // Lấy năm từ thẻ có class "year"

					const dateStr = `${day}-${month}-${year}`; // Định dạng DD-MM-YYYY
					$(box)
						.find('.tblKQTinh')
						.each((_, table) => {
							let stationName = $(table).find('.tentinh .namelong').text().trim();
							// special case for station "TP. HCM"
							if (stationName === 'TP. HCM') {
								stationName = 'TP.HCM';
							}
							const type = $(table).find('.loaive').text().trim();
							if (!stationName) return;
							const prizeData = {
								date: dateStr,
								region: region, // Tùy chọn theo URL bạn crawl
								station: stationName,
								prizes: {
									DB: [],
									G1: [],
									G2: [],
									G3: [],
									G4: [],
									G5: [],
									G6: [],
									G7: [],
									G8: [],
									specialCode: '',
								},
								type: type,
								isFinished: false,
							};

							// Lấy tất cả các dòng giải thưởng
							$(table)
								.find('tr')
								.each((__, tr) => {
									const td = $(tr).find('td');
									const className = td.attr('class'); // Lấy class của td (ví dụ: "giai_sau")

									const modelKey = classToModelKey[className as keyof typeof classToModelKey];
									if (modelKey) {
										// Lấy tất cả các số trong các div có class "dayso"
										const numbers = td
											.find('.dayso')
											.map((___, el) => {
												return $(el).attr('data') || $(el).text().trim();
											})
											.get();

										prizeData.prizes[modelKey] = numbers;
									}
								});

							// Kiểm tra xem có đang LIVE không (nếu có giải chứa dấu "...")
							prizeData.isFinished = !JSON.stringify(prizeData).includes('*'); // TODO: Cần cách kiểm tra chính xác hơn nếu có thể

							results.push(prizeData);
						});
				});
			} else {
				const box = $('.xsmb');
				box.each((_, container) => {
					const stationName = $(container).find('.tentinh .phathanh').text().trim() || 'Miền Bắc';
					const [day, month] = $(container).find('.daymonth').text()?.trim()?.split('/'); // Ví dụ: "Kết quả ngày 25/08/2023"
					const year = $(container).find('.year').text()?.trim(); // Lấy năm từ thẻ có class "year"

					const dateStr = `${day}-${month}-${year}`; // Định dạng DD-MM-YYYY
					const prizeData = {
						date: dateStr,
						region: 'north',
						station: stationName,
						prizes: {
							DB: [],
							G1: [],
							G2: [],
							G3: [],
							G4: [],
							G5: [],
							G6: [],
							G7: [],
							specialCode: '', // Thêm trường riêng cho mã đặc biệt của XSMB
						},
						isFinished: false,
						type: '',
					};
					$(container)
						.find('.kqxs_content table tr')
						.each((_, tr) => {
							const tdContent = $(tr).find('td[class^="giai_"]');
							const className = tdContent.attr('class');
							if (className) {
								const modelKey = classToModelKey[className as keyof typeof classToModelKey];
								if (modelKey) {
									// Lấy danh sách số
									const numbers = tdContent
										.find('.dayso')
										.map((__, el) => $(el).attr('data'))
										.get();
									prizeData.prizes[modelKey] = numbers;

									// Riêng giải Đặc biệt: Lấy thêm ký hiệu (Mã vé))
									if (modelKey === 'DB') {
										const codes = tdContent.find('.kyhieuDB').text().trim();
										// Tách chuỗi "15-1-16... TS" thành array
										prizeData.prizes.specialCode = codes;
									}
								}
							}
						});
					prizeData.isFinished = !JSON.stringify(prizeData).includes('*'); // TODO: Cần cách kiểm tra chính xác hơn nếu có thể
					results.push(prizeData);
				});
			}

			// Sau khi lấy được array results, hãy sort theo date trước khi lưu
			const sortedResults = results.sort(
				(a, b) => moment(a.date, 'DD-MM-YYYY').unix() - moment(b.date, 'DD-MM-YYYY').unix(),
			);

			await this.saveToDb(sortedResults);
			return sortedResults;
		} catch (error) {
			this.logger.error(`Lỗi khi crawl ngày ${date}: ${error.message}`);
		}
	}
}
