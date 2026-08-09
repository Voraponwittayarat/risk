import { Module } from '@nestjs/common';
import { TriggerToolController } from './trigger-tool.controller';
import { TriggerToolService } from './trigger-tool.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TriggerToolController],
  providers: [TriggerToolService],
  exports: [TriggerToolService],
})
export class TriggerToolModule {}
