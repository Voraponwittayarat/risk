import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
@Controller('notifications')
@UseGuards(JwtAuthGuard)
class NotificationsController {
  constructor(private readonly notifications:NotificationsService) {}
  @Get()
  list(@Req() req:any) {return this.notifications.list(req.user);}
}
@Module({controllers:[NotificationsController],providers:[NotificationsService]})
export class NotificationsModule {}
