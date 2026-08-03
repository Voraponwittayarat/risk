import { Module } from '@nestjs/common';
import { RiskAnalysisService } from './risk-analysis.service';
import { RiskAnalysisController } from './risk-analysis.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RiskAnalysisController],
  providers: [RiskAnalysisService],
  exports: [RiskAnalysisService],
})
export class RiskAnalysisModule {}
