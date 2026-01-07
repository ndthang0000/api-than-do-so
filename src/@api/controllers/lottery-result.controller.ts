import { LiveLotteryResultDto } from '@dto/lottery-result/live-lottery-result.dto';
import { Body, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { LotteryResultService } from '@service/lottery-result.service';
import { DrawStatus, LOTTERY_SCHEDULE } from '@share/interfaces/lottery-ticket';
import { responseData, responseMessage } from '@share/interfaces/response-face';
import moment from 'moment';
import { AuthGuard } from '../@guard/auth.guard';
import { Types } from 'mongoose';

@Controller('lottery-results')
export class LotteryResultController {
	constructor(private readonly lotteryResultService: LotteryResultService) {}

	@Get('/')
	@ApiBearerAuth()
	@UseGuards(AuthGuard)
	async getLiveLotteryResult(@Query() dto: LiveLotteryResultDto) {
		const { region, date, station } = dto;
		const today = moment().format('DD-MM-YYYY');
		const isToday = date === today;

		// 1. Validate ngày tương lai
		if (moment(date, 'DD-MM-YYYY').isAfter(moment(), 'day')) {
			return responseData({ result: [], status: DrawStatus.UPCOMING });
		}

		// 2. Xác định trạng thái phiên quay (LIVE, UPCOMING, FINISHED)
		let status: DrawStatus = DrawStatus.FINISHED;

		if (isToday) {
			const schedule = LOTTERY_SCHEDULE.find(s => s.region === region);
			if (!schedule) {
				return responseMessage('Invalid region', false);
			}
			const drawTime = moment(`${moment().format('YYYY-MM-DD')} ${schedule.time}`, 'YYYY-MM-DD HH:mm');
			const startTime = moment(drawTime).subtract(5, 'minutes');
			const endTime = moment(drawTime).add(35, 'minutes'); // Tăng lên 35p cho chắc chắn

			if (moment().isBefore(startTime)) {
				status = DrawStatus.UPCOMING;
			} else if (moment().isBetween(startTime, endTime)) {
				status = DrawStatus.LIVE;
			} else {
				status = DrawStatus.FINISHED;
			}
		}

		// 3. Gọi Service lấy dữ liệu theo 3 nguồn (Cache -> DB -> Default)
		const result = await this.lotteryResultService.getLiveLotteryResult(region, date, station);
		const finalResult = result.map((r: any) => {
			return {
				...r,
				...(r._id ? {} : { _id: new Types.ObjectId() }),
			};
		});

		// 4. Logic bổ sung: Nếu là UPCOMING thì có thể trả về mảng rỗng hoặc default tùy bạn
		if (status === DrawStatus.UPCOMING) {
			return responseData({ result: [], status });
		}

		return responseData({ result: finalResult, status });
	}
}
