import { LotteryResultRepository } from './lottery-result.repository';
import { TicketRepository } from './ticket.repository';
import { UserRepository } from './user.repository';

export const AllRepository = [UserRepository, LotteryResultRepository, TicketRepository];
