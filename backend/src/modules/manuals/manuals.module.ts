import { Module } from '@nestjs/common';
import { ManualPublisherGuard, ManualsController } from './manuals.controller';
import { ManualsService } from './manuals.service';
@Module({controllers: [ManualsController], providers: [ManualsService, ManualPublisherGuard]})
export class ManualsModule {}
