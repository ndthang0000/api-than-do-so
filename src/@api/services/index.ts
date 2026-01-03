import { AuthService } from './auth.service';
import { LotteryResultService } from './lottery-result.service';
import { LotteryScraperService } from './lottery-scraper-mn.service';
import { UserService } from './user.service';

export const AllServices = [UserService, AuthService, LotteryScraperService, LotteryResultService];
