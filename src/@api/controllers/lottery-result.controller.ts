import { LiveLotteryResultDto } from '@dto/lottery-result/live-lottery-result.dto';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { LotteryResultService } from '@service/lottery-result.service';
import { allProvinces, DrawStatus, LOTTERY_SCHEDULE, LotteryScheduleEntry } from '@share/interfaces/lottery-ticket';
import { responseData, responseMessage } from '@share/interfaces/response-face';
import moment from 'moment';
import { AuthGuard } from '../@guard/auth.guard';
import { RolesGuard } from '../@guard/role.guard';

@Controller('lottery-results')
export class LotteryResultController {
	constructor(private readonly lotteryResultService: LotteryResultService) {}

	@Get('/')
	@ApiBearerAuth()
	@UseGuards(AuthGuard)
	async getLiveLotteryResult(@Query() dto: LiveLotteryResultDto) {
		// validate date not in future
		if (moment(dto.date, 'DD-MM-YYYY').isAfter(moment())) {
			return responseData({ result: null, status: DrawStatus.UPCOMING });
		}

		// validate station if have
		if (dto.station) {
			if (allProvinces.indexOf(dto.station) === -1) {
				return responseMessage('Invalid station', false);
			}
		}

		let status: DrawStatus = DrawStatus.FINISHED;

		const isSelectToday = moment(dto.date, 'DD-MM-YYYY').isSame(moment(), 'day');

		if (isSelectToday) {
			const dataRegion = LOTTERY_SCHEDULE.find(item => item.region === dto.region) || LOTTERY_SCHEDULE[0];
			// check time before draw time 5 minute -> return upcoming
			status = DrawStatus.LIVE;
			if (
				moment().isBefore(
					moment(`${moment().format('YYYY-MM-DD')} ${dataRegion.time}`, 'YYYY-MM-DD HH:mm').subtract(
						5,
						'minutes',
					),
				)
			) {
				status = DrawStatus.UPCOMING;
			} else if (
				moment().isAfter(
					moment(`${moment().format('YYYY-MM-DD')} ${dataRegion.time}`, 'YYYY-MM-DD HH:mm').add(
						25,
						'minutes',
					),
				)
			) {
				status = DrawStatus.FINISHED;
			}
		}

		const result = await this.lotteryResultService.getLiveLotteryResult(dto.region, dto.date, dto.station);

		return responseData({ result, status });
	}
}
