import { RcaAppointmentService } from './rca-appointment.service';
import { Module } from '@nestjs/common';
import { RcaController } from './rca.controller';
import { RcaService } from './rca.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IncidentRcaPolicyService } from './incident-rca-policy.service';
import { CapaModule } from '../capa/capa.module';

@Module({
  imports: [PrismaModule, CapaModule],
  controllers: [RcaController],
  providers: [RcaAppointmentService, RcaService, IncidentRcaPolicyService],
  exports: [RcaService, IncidentRcaPolicyService],
})
export class RcaModule {}
