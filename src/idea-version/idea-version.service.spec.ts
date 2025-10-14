import { Test, TestingModule } from '@nestjs/testing';
import { IdeaVersionService } from './idea-version.service';

describe('IdeaVersionService', () => {
  let service: IdeaVersionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdeaVersionService],
    }).compile();

    service = module.get<IdeaVersionService>(IdeaVersionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
