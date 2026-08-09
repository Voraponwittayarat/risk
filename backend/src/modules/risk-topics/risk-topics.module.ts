import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RiskTopicsController } from './risk-topics.controller';
import { RiskTopicsService } from './risk-topics.service';

@Module({
  imports: [PrismaModule],
  controllers: [RiskTopicsController],
  providers: [RiskTopicsService],
})
export class RiskTopicsModule {}
