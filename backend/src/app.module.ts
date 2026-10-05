import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { AuthModule } from './modules/auth/auth.module';
import { RiskAnalysisModule } from './modules/risk-analysis/risk-analysis.module';
import { TriggerToolModule } from './modules/trigger-tool/trigger-tool.module';
import { RcaModule } from './modules/rca/rca.module';
import { UsersModule } from './modules/users/users.module';
import { RiskTopicsModule } from './modules/risk-topics/risk-topics.module';
import { MembersModule } from './modules/members/members.module';
import { NrlsRiskstoreModule } from './modules/nrls-riskstore/nrls-riskstore.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CapaModule } from './modules/capa/capa.module';
import { HealthController } from './health.controller';
import { ManualsModule } from './modules/manuals/manuals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    IncidentsModule,
    DepartmentsModule,
    AuthModule,
    RiskAnalysisModule,
    TriggerToolModule,
    RcaModule,
    UsersModule,
    RiskTopicsModule,
    MembersModule,
    NrlsRiskstoreModule,
    ProgramsModule,
    CapaModule,
    ManualsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
