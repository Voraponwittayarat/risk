import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { TelegramService } from './telegram.service';

describe('IncidentsController', () => {
  let controller: IncidentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentsController],
      providers: [
        { provide: IncidentsService, useValue: {} },
        { provide: TelegramService, useValue: {} },
      ],
    }).compile();

    controller = module.get<IncidentsController>(IncidentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
