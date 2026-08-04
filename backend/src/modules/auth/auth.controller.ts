import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('mock-role')
  async mockRoleLogin(@Body('role') role: string) {
    if (!role) {
      throw new Error('Role is required');
    }
    return this.authService.mockRoleLogin(role);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.username, body.password);
  }
}
