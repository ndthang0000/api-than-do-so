import { v4 as uuidv4 } from 'uuid';

export type Region = 'north' | 'central' | 'south';

export enum REGION_ENUM {
	NORTH = 'north',
	CENTRAL = 'central',
	SOUTH = 'south',
}
export type Weekday = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export const WEEKDAY_LABEL_MAP: Record<Weekday, string> = {
	sunday: 'CN',
	monday: 'T2',
	tuesday: 'T3',
	wednesday: 'T4',
	thursday: 'T5',
	friday: 'T6',
	saturday: 'T7',
};

export interface ScanResult {
	code?: string;
	date?: string;
	region?: Region;
	station?: string;
}

export enum DrawStatus {
	UPCOMING = 'UPCOMING',
	LIVE = 'LIVE',
	FINISHED = 'FINISHED',
}

export interface LotteryScheduleEntry {
	region: Region;
	regionName: string;
	time: string; // 0 (Sunday) to 6 (Saturday)
	end: string;
	schedule: {
		date: Weekday;
		provinces: string[];
	}[]; // e.g., ['18:00', '17:00']
}
export const LOTTERY_SCHEDULE: LotteryScheduleEntry[] = [
	{
		region: 'south',
		regionName: 'Xổ Số Miền Nam',
		time: '14:00',
		end: '15:00',
		schedule: [
			{ date: 'monday', provinces: ['TP.HCM', 'Đồng Tháp', 'Cà Mau'] },
			{ date: 'tuesday', provinces: ['Bến Tre', 'Vũng Tàu', 'Bạc Liêu'] },
			{ date: 'wednesday', provinces: ['Đồng Nai', 'Cần Thơ', 'Sóc Trăng'] },
			{ date: 'thursday', provinces: ['Tây Ninh', 'An Giang', 'Bình Thuận'] },
			{ date: 'friday', provinces: ['Vĩnh Long', 'Bình Dương', 'Trà Vinh'] },
			{ date: 'saturday', provinces: ['TP.HCM', 'Long An', 'Bình Phước', 'Hậu Giang'] },
			{ date: 'sunday', provinces: ['Tiền Giang', 'Kiên Giang', 'Đà Lạt'] },
		],
	},
	{
		region: 'central',
		regionName: 'Xổ Số Miền Trung',
		time: '17:15',
		end: '17h35',
		schedule: [
			{ date: 'monday', provinces: ['TT-Huế', 'Phú Yên'] },
			{ date: 'tuesday', provinces: ['Đắk Lắk', 'Quảng Nam'] },
			{ date: 'wednesday', provinces: ['Đà Nẵng', 'Khánh Hòa'] },
			{ date: 'thursday', provinces: ['Bình Định', 'Quảng Trị', 'Quảng Bình'] },
			{ date: 'friday', provinces: ['Gia Lai', 'Ninh Thuận'] },
			{ date: 'saturday', provinces: ['Đà Nẵng', 'Quảng Ngãi', 'Đắk Nông'] },
			{ date: 'sunday', provinces: ['Khánh Hòa', 'Kon Tum', 'TT-Huế'] },
		],
	},

	{
		region: 'north',
		regionName: 'Xổ Số Miền Bắc',
		time: '18:15',
		end: '18h35',
		schedule: [
			{ date: 'monday', provinces: ['Hà Nội'] },
			{ date: 'tuesday', provinces: ['Quảng Ninh'] },
			{ date: 'wednesday', provinces: ['Bắc Ninh'] },
			{ date: 'thursday', provinces: ['Hà Nội'] },
			{ date: 'friday', provinces: ['Hải Phòng'] },
			{ date: 'saturday', provinces: ['Nam Định'] },
			{ date: 'sunday', provinces: ['Thái Bình'] },
		],
	},
];

export const createDefaultLotteryResult = (region: Region, date: string) => {
	const dayOfWeek = new Date(date.split('-').reverse().join('-')).getDay(); // 0-6
	const scheduleEntry = LOTTERY_SCHEDULE.find(entry => entry.region === region);
	if (!scheduleEntry) return null;
	const scheduleForDay = scheduleEntry.schedule.find(s => {
		const weekdayMap: Record<Weekday, number> = {
			sunday: 0,
			monday: 1,
			tuesday: 2,
			wednesday: 3,
			thursday: 4,
			friday: 5,
			saturday: 6,
		};
		return weekdayMap[s.date] === dayOfWeek;
	});
	if (!scheduleForDay) return [];

	const exampleData: any[] = [];
	for (const province of scheduleForDay.provinces) {
		const prizesSouthAndCentral = {
			specialCode: '',
			DB: ['*'],
			G1: ['*'],
			G2: ['*'],
			G3: ['*', '*'],
			G4: ['*', '*', '*', '*', '*', '*', '*'],
			G5: ['*'],
			G6: ['*', '*', '*'],
			G7: ['*'],
			G8: ['*', '*', '*', '*'],
		};
		const prizesNorth = {
			specialCode: '',
			DB: ['*'],
			G1: ['*'],
			G2: ['*', '*'],
			G3: ['*', '*', '*', '*', '*', '*'],
			G4: ['*', '*', '*', '*'],
			G5: ['*', '*', '*', '*', '*', '*'],
			G6: ['*', '*', '*'],
			G7: ['*', '*', '*', '*'],
		};
		exampleData.push({
			_id: uuidv4(),
			region,
			date,
			station: province,
			prizes: region === 'north' ? prizesNorth : prizesSouthAndCentral,
			type: '',
		});
	}
	return exampleData;
};

export const allProvinces = LOTTERY_SCHEDULE.flatMap(entry => entry.schedule.flatMap(s => s.provinces));
