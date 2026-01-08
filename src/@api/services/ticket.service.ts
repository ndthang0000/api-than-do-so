import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateTicketDto } from '@dto/ticket/create-ticket.dto';
import { UpdateTicketDto } from '@dto/ticket/update-ticket.dto';
import { Ticket, TicketDocument } from '@core/mongodb/schemas/ticket.schema';
import { TicketRepository } from '@core/mongodb/repository/ticket.repository';
import { Types } from 'mongoose';
import { LOTTERY_MESSAGES, PRIZE_MONEY } from '@share/constants/lottery-enum';
import { CheckTicketDto } from '@dto/ticket/check-ticket.dto';
import { LotteryResultService } from './lottery-result.service';
import { LOTTERY_SCHEDULE } from '@share/interfaces/lottery-ticket';
import moment from 'moment';

@Injectable()
export class TicketService {
	constructor(
		@Inject() private readonly ticketRepo: TicketRepository,
		@Inject() private readonly lotteryResultService: LotteryResultService,
	) {}

	async createTicket(createDto: CreateTicketDto): Promise<Ticket> {
		const entity = this.ticketRepo.add(createDto);
		return entity;
	}

	async getTicket(id: string): Promise<Ticket | null> {
		return this.ticketRepo.findOne({ _id: new Types.ObjectId(id) });
	}

	async updateTicket(id: string, updateDto: UpdateTicketDto): Promise<Ticket | null> {
		await this.ticketRepo.updateOne({ _id: new Types.ObjectId(id) }, updateDto);
		return this.getTicket(id);
	}

	async deleteTicket(id: string): Promise<boolean> {
		const data = await this.ticketRepo.deleteOne({ _id: new Types.ObjectId(id) });
		if (data.deletedCount === 0) {
			return false;
		}
		return true;
	}

	async paginateTicket(query: any): Promise<any> {
		return this.ticketRepo.paginate({
			page: query.page,
			limit: query.limit,
			filter: query.filter,
			sortBy: query.order,
			populate: query.populate,
		});
	}

	async getAllTicket(query: any): Promise<TicketDocument[]> {
		return this.ticketRepo.findAll(query.filter, query.populate, query.order);
	}

	validateLotteryInputStrict(dto: CheckTicketDto & { region: string }) {
		const { region, date, station } = dto;

		// 1. Xác định thứ từ ngày tháng
		const dayOfWeek = moment(date, 'DD-MM-YYYY').format('dddd').toLowerCase();

		// 2. Tìm cấu trúc vùng miền
		const regionConfig = LOTTERY_SCHEDULE.find(item => item.region === region);
		if (!regionConfig) {
			throw new BadRequestException(`Vùng miền '${region}' không hợp lệ.`);
		}

		// 3. Tìm lịch quay ngày đó
		const dailySchedule = regionConfig.schedule.find(s => s.date === dayOfWeek);

		// Riêng miền Bắc, bạn quy ước payload là "north"
		if (region === 'north') {
			if (station !== 'north') {
				throw new BadRequestException(`Với miền Bắc, trường station phải là 'north'.`);
			}
			return;
		}

		// 4. SO SÁNH NGHIÊM NGẶT (STRICT COMPARISON)
		// Không .toUpperCase(), không .trim(), khớp 100% từng ký tự
		const isValidStation = dailySchedule?.provinces.includes(station);

		if (!isValidStation) {
			const validStations = dailySchedule?.provinces.join(', ') || 'không có';
			throw new BadRequestException(
				`Tên đài '${station}' không đúng định dạng hoặc không có lịch quay vào ${dayOfWeek}. ` +
					`Vui lòng nhập chính xác: ${validStations}`,
			);
		}
	}

	async processTicket(dto: CheckTicketDto, userId: string): Promise<any> {
		// Lấy kết quả từ 3 nguồn (Cache -> DB -> Default)
		const results = await this.lotteryResultService.getLiveLotteryResult(dto.region, dto.date, dto.station);
		const lottery = results[0];

		let winDetails: string[] = [];
		let totalWinAmount = 0;
		let status = 'LOSE';

		// Nếu đã có kết quả (không phải dấu *) thì mới dò
		if (lottery && !this.isResultEmpty(lottery.prizes)) {
			winDetails = this.calculateWinning(dto.code, lottery.prizes, dto.region, dto.specialCode || '');
			status = winDetails.length > 0 ? 'WIN' : 'LOSE';

			if (winDetails.length > 0) {
				const regionPrize = PRIZE_MONEY[dto.region];
				totalWinAmount = winDetails.reduce((sum, prizeName) => {
					return sum + (regionPrize[prizeName] || 0);
				}, 0);
			}
		} else {
			status = 'PENDING'; // Chờ kết quả live
			totalWinAmount = 1; // Tạm gán 1 để phân biệt với thua thật sự
		}

		// Lưu Ticket vào DB
		const message = this.getRandomMessage(status);

		const ticket = await this.ticketRepo.add({
			...dto,
			winStatus: status,
			prizes: lottery.prizes || {},
			winDetails: winDetails,
			message,
			prizeMoney: totalWinAmount,
			userId: new Types.ObjectId(userId),
			durationScan: dto.durationScan,
		});

		return { ticket, winDetails, status };
	}

	private calculateWinning(ticketCode: string, prizes: any, region: string, userSpecialCode: string): string[] {
		const wins: string[] = [];

		// --- LOGIC DÒ CHUNG CHO TẤT CẢ CÁC MIỀN ---
		for (const rank in prizes) {
			if (['specialCode', 'DB'].includes(rank)) continue; // Xử lý riêng DB và Mã ĐB

			prizes[rank].forEach((prizeValue: string) => {
				if (prizeValue !== '*' && ticketCode.endsWith(prizeValue)) {
					wins.push(rank);
				}
			});
		}

		// --- LOGIC RIÊNG CHO GIẢI ĐẶC BIỆT & GIẢI PHỤ ---
		const dbValue = prizes.DB[0];
		if (dbValue === '*') return wins;

		if (region === 'north') {
			// MIỀN BẮC
			if (ticketCode === dbValue) {
				// Trúng ĐB miền Bắc cần check thêm SpecialCodes (Mã ĐB)
				const formattedDBChars = prizes.specialCode; // Chuỗi: "10-13-14... TK"
				if (userSpecialCode && formattedDBChars.includes(userSpecialCode)) {
					wins.push('DB');
				} else {
					wins.push('Giải phụ ĐB'); // Trúng số nhưng trượt mã
				}
			} else if (ticketCode.endsWith(dbValue.substring(3))) {
				wins.push('Khuyến khích'); // Trúng 2 số cuối giải ĐB
			}
		} else {
			// MIỀN NAM & MIỀN TRUNG
			if (ticketCode === dbValue) {
				wins.push('DB');
			} else if (this.isPhuDacBietMN(ticketCode, dbValue)) {
				wins.push('Phụ Đặc biệt'); // Sai số đầu tiên
			} else if (this.isKhuyenKhichMN(ticketCode, dbValue)) {
				wins.push('Khuyến khích'); // Sai 1 số ở bất kỳ vị trí nào khác
			}
		}

		return wins;
	}

	// Check giải Phụ ĐB miền Nam: trúng 5 số cuối theo thứ tự ĐB
	private isPhuDacBietMN(code: string, db: string): boolean {
		return code.substring(1) === db.substring(1) && code[0] !== db[0];
	}

	// Check giải Khuyến khích miền Nam: sai 1 số ở bất kỳ vị trí nào (trừ giải phụ ĐB)
	private isKhuyenKhichMN(code: string, db: string): boolean {
		let diff = 0;
		for (let i = 0; i < 6; i++) {
			if (code[i] !== db[i]) diff++;
		}
		// Sai đúng 1 con số (nhưng không phải số đầu tiên vì số đầu đã là Phụ ĐB)
		return diff === 1 && code[0] === db[0];
	}

	private isResultEmpty(prizes: any): boolean {
		return prizes.DB[0] === '*';
	}

	private getRandomMessage(status: string): string {
		const messages = LOTTERY_MESSAGES[status] || LOTTERY_MESSAGES.PENDING;
		const randomIndex = Math.floor(Math.random() * messages.length);
		return messages[randomIndex];
	}
}
