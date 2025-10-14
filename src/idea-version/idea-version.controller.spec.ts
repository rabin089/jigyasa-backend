import { Test, TestingModule } from '@nestjs/testing';
import { IdeaVersionController } from './idea-version.controller';

describe('IdeaVersionController', () => {
  let controller: IdeaVersionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdeaVersionController],
    }).compile();

    controller = module.get<IdeaVersionController>(IdeaVersionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
