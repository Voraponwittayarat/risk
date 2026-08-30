import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CapaController } from './capa.controller';
import { CapaService } from './capa.service';

@Module({ imports: [PrismaModule], controllers: [CapaController], providers: [CapaService], exports: [CapaService] })
export class CapaModule {}
