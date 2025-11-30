import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base-repo';
import { UserDocument, User } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UserRepository extends BaseRepository<UserDocument> {
	constructor(@InjectModel(User.name) model: Model<UserDocument>) {
		super(model);
	}
}
