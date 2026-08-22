import { Module } from '@nestjs/common';
import { NrlsRiskstoreService } from './nrls-riskstore.service';
import { NrlsRiskstoreController } from './nrls-riskstore.controller';

@Module({
  controllers: [NrlsRiskstoreController],
  providers: [NrlsRiskstoreService],
  exports: [NrlsRiskstoreService]
})
export class NrlsRiskstoreModule {}
