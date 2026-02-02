import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import RedisCache from './infrastructure/redis.cache';
import S3Service from './infrastructure/s3';
import RedlockService from './infrastructure/redlock.service';
import { BullModule } from '@nestjs/bull';
import coreConfig, { envData } from './config/core.config';
import { AllRepository } from './mongodb/repository';
import { MongooseModule } from '@nestjs/mongoose';
import { allSchemas } from './mongodb/schemas';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LotteryLiveGateway } from './infrastructure/lottery-live.gateway';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [coreConfig],
		}),

		MongooseModule.forRoot(envData.database.mongoDBUrl),
		MongooseModule.forFeature(allSchemas),

		BullModule.forRoot({
			url: `redis://${envData.redis.host}:${envData.redis.port}`,
		}),
		EventEmitterModule.forRoot(),
	],
	providers: [RedisCache, RedlockService, S3Service, LotteryLiveGateway, ...AllRepository],
	exports: [ConfigModule, CoreModule, RedisCache, RedlockService, S3Service, LotteryLiveGateway, ...AllRepository],
})
export class CoreModule {}
