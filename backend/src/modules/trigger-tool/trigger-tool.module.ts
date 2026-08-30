import { Module } from '@nestjs/common';
import { TriggerToolController } from './trigger-tool.controller';
import { TriggerToolService } from './trigger-tool.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { RcaModule } from '../rca/rca.module';

@Module({
  imports: [PrismaModule, IncidentsModule, RcaModule],
  controllers: [TriggerToolController],
  providers: [TriggerToolService],
  exports: [TriggerToolService],
})
export class TriggerToolModule {}
