import { Region } from './lottery-ticket';

// lottery.interface.ts
export interface LotteryUpdatePayload {
	region: Region;
	date: string; // DD-MM-YYYY
	station: string; // Tên đài, ví dụ: "Trà Vinh"
	isFinished: boolean;
	prizes: Record<string, string[] | string>;
	changes: Array<{
		rank: string; // Ví dụ: "G4"
		index: number; // Vị trí số trong mảng giải
		value: string; // Số mới vừa xuất hiện
	}>;
}
