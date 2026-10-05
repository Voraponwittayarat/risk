import { Module } from '@nestjs/common';
import { RiskAnalysisService } from './risk-analysis.service';
import { RiskAnalysisController } from './risk-analysis.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LegacyRegisterImportService } from './legacy-register-import.service';

@Module({
  imports: [PrismaModule],
  controllers: [RiskAnalysisController],
  providers: [RiskAnalysisService, LegacyRegisterImportService],
  exports: [RiskAnalysisService],
})
export class RiskAnalysisModule {}
