import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { TelegramService } from './telegram.service';

@Module({
  controllers: [IncidentsController],
  providers: [IncidentsService, TelegramService]
})
export class IncidentsModule {}
