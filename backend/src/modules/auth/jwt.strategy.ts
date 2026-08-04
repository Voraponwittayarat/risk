import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

export const jwtConstants = {
  secret: 'RISKHRMS_SECRET_KEY', // TODO: Move to .env in production
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: jwtConstants.secret,
    });
  }


  async validate(payload: any) {
    // The payload returned here will be injected into the request object as req.user
    return { 
      userId: payload.sub, 
      id: payload.sub,
      cid: payload.cid,
      departmentId: payload.departmentId,
      departmentGroup: payload.departmentGroup,
      priority: payload.priority,
      accessrules: payload.accessrules,
      rmStatus: payload.rmStatus,
      teamId: payload.teamId,
      name: payload.name
    };
  }
}
