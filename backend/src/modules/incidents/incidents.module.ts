import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { TelegramService } from './telegram.service';
import { RcaModule } from '../rca/rca.module';

@Module({
  imports: [RcaModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, TelegramService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
