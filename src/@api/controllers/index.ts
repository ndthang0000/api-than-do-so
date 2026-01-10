import { AuthController } from './auth.controller';
import { LotteryResultController } from './lottery-result.controller';
import { NotificationController } from './notification.controller';
import { TicketController } from './ticket.controller';
import { UserController } from './user.controller';

export const AllControllers = [
	UserController,
	AuthController,
	LotteryResultController,
	TicketController,
	NotificationController,
];
