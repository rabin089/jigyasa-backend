import { Injectable } from '@nestjs/common';
import { CreateIdeaVersionDto } from './dto/create-idea-version.dto';
import { IdeaVersion } from './entities/idea-version.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class IdeaVersionService {
    constructor(
        @InjectRepository(IdeaVersion)
        private readonly ideaVersionRepository: Repository<IdeaVersion>,
    ){}
    
    async createVersion(ideaId:number,createIdeaVersionDto: CreateIdeaVersionDto, user: User): Promise<IdeaVersion> {
        const idea = await this.ideaVersionRepository.findOne({where: {id: ideaId}})
        if(!idea){
            throw new Error('Failed to create idea version');
        }
        const version= this.ideaVersionRepository.create({
            title: createIdeaVersionDto.title,
            description: createIdeaVersionDto.description,
            idea,
            user: user,
        });
        return this.ideaVersionRepository.save(version);
    }
}
