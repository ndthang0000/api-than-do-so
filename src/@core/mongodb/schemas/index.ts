import { User, UserSchema } from './user.schema';
import { LotteryResult, LotteryResultSchema } from './lottery-result.schema';
import { Ticket, TicketSchema } from './ticket.schema';
import { Notification, NotificationSchema } from './notification.schema';

export const allSchemas = [
	{
		name: User.name,
		schema: UserSchema,
	},
	{
		name: LotteryResult.name,
		schema: LotteryResultSchema,
	},
	{
		name: Ticket.name,
		schema: TicketSchema,
	},
	{
		name: Notification.name,
		schema: NotificationSchema,
	},
];
