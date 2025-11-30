// src/vision/vision.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { ImageValidationResult, LotteryTicket } from '@share/interfaces/vision.interface';

@Injectable()
export class VisionService {
	private readonly visionClient: ImageAnnotatorClient;
	private readonly logger = new Logger(VisionService.name);

	constructor(private configService: ConfigService) {
		console.log(configService);
		// Khởi tạo client, tự động dùng GOOGLE_APPLICATION_CREDENTIALS từ .env
		this.visionClient = new ImageAnnotatorClient();
		this.logger.log('Google Vision Client initialized successfully.');
	}

	/**
	 * Bước 1: Gọi API OCR và Validation
	 * @param imageUrl Đường dẫn công khai hoặc URI GCS của ảnh
	 * @returns Dữ liệu thô từ OCR và kết quả kiểm tra validation
	 */
	async detectAndValidateTicket(imageUrl: string): Promise<{ rawText: string; isValid: ImageValidationResult }> {
		const request = {
			image: { source: { imageUri: imageUrl } },
			features: [
				{ type: 'TEXT_DETECTION' }, // Phát hiện văn bản cho OCR
				{ type: 'LABEL_DETECTION' }, // Phát hiện nhãn (kiểm tra có phải vé số không)
				// { type: 'DOCUMENT_TEXT_DETECTION' }, // Tùy chọn, cho kết quả chi tiết hơn
			],
		};

		try {
			const [result] = await this.visionClient.annotateImage(request);

			// --- 1. Kiểm tra Validation (như đã thảo luận) ---
			const validationResult: ImageValidationResult = this.validateImageLabels(result.labelAnnotations || []);
			if (!validationResult.isTicket) {
				return {
					rawText: '',
					isValid: { isTicket: false, message: 'Ảnh chụp không phải là vé số hoặc chất lượng quá kém.' },
				};
			}

			const rawText = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';

			return { rawText, isValid: validationResult };
		} catch (error) {
			this.logger.error('Error calling Vision API:', error.message);
			throw new InternalServerErrorException('Lỗi hệ thống khi phân tích hình ảnh.');
		}
	}

	/**
	 * Logic kiểm tra cơ bản dựa trên Label Detection
	 */
	private validateImageLabels(labels: any[]): ImageValidationResult {
		const requiredLabels = ['lotto ticket', 'ticket', 'paper', 'text'];
		const minConfidence = 0.75; // Ngưỡng tin cậy

		const foundValidLabel = labels.some(
			label => requiredLabels.includes(label.description.toLowerCase()) && label.score > minConfidence,
		);

		// Ở đây bạn có thể thêm logic kiểm tra Bounding Box phức tạp hơn...

		return {
			isTicket: foundValidLabel,
			message: foundValidLabel ? 'Passed' : 'Không tìm thấy nhãn vé số với độ tin cậy cao.',
		};
	}

	/**
	 * Bước 2: Xử lý hậu kỳ (Post-processing)
	 * Chuyển dữ liệu thô thành cấu trúc VeSoData
	 */
	async postProcessOCR(rawText: string): Promise<LotteryTicket> {
		// -------------------------------------------------------------------
		// Đây là nơi bạn đặt logic RegEx và ánh xạ phức tạp để trích xuất:
		// Đài, Ngày, Mã số từ rawText.
		// -------------------------------------------------------------------

		const lotteryTicket: LotteryTicket = {
			province: 'TP.HCM', // Ví dụ: sử dụng RegEx để tìm các từ khoá tỉnh/thành
			date: new Date('2025-11-29'), // Ví dụ: sử dụng RegEx để tìm dd/mm/yyyy
			code: '123456', // Ví dụ: tìm 6 chữ số in đậm nhất
		};

		// Bổ sung logic kiểm tra chéo (C9) tại đây trước khi trả về:
		// if (lotteryTicket.date.getDay() !== LichMoThuong[lotteryTicket.province].thu) { throw InvalidDateError }

		return lotteryTicket;
	}
}
