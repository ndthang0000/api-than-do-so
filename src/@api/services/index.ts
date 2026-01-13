import { AuthService } from './auth.service';
import { LotteryResultService } from './lottery-result.service';
import { LotteryScheduleService } from './lottery-schedule.service';
import { LotteryScraperDpService } from './lottery-scraper-dp.service';
import { LotteryScraperService } from './lottery-scraper-mn.service';
import { NotificationService } from './notification.service';
import { TicketService } from './ticket.service';
import { UserService } from './user.service';

export const AllServices = [
	UserService,
	AuthService,
	LotteryScraperService,
	LotteryResultService,
	LotteryScraperDpService,
	TicketService,
	NotificationService,
	LotteryScheduleService,
];
