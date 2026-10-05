import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PersonnelRosterController } from './personnel-roster.controller';
import { PersonnelRosterService } from './personnel-roster.service';

@Module({
  imports: [PrismaModule],
  controllers: [MembersController, PersonnelRosterController],
  providers: [MembersService, PersonnelRosterService],
})
export class MembersModule {}
