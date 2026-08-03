import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { AuthModule } from './modules/auth/auth.module';
import { RiskAnalysisModule } from './modules/risk-analysis/risk-analysis.module';

@Module({
  imports: [
    PrismaModule,
    IncidentsModule,
    DepartmentsModule,
    AuthModule,
    RiskAnalysisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
