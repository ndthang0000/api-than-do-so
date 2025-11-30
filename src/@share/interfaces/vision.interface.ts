// src/vision/interfaces/vision.interface.ts

export interface LotteryTicket {
	/** Tên đài/tỉnh đã chuẩn hoá (Ví dụ: 'HCMC', 'Hanoi') */
	province: string;

	date: Date;

	code: string;

	confidenceScore?: number;

	serialNumber?: string;
}

export interface ImageValidationResult {
	/** Cờ báo hiệu ảnh có vượt qua bài kiểm tra cơ bản (Label Detection, Bounding Box) */
	isTicket: boolean;

	/** Tin nhắn chi tiết về kết quả validation (ví dụ: 'Passed', hoặc 'Ảnh bị mờ') */
	message: string;

	/** Tùy chọn: Độ tin cậy của việc nhận diện (ví dụ: Label Detection Score) */
	confidenceScore?: number;
}
