import { Controller, Post, UseGuards } from '@nestjs/common';
import { CreateIdeaVersionDto } from './dto/create-idea-version.dto';
import { IdeaVersionService } from './idea-version.service';
import { Param, Body, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('idea-version')
@ApiTags('idea-version')
export class IdeaVersionController {
    constructor(private readonly ideaVersionService: IdeaVersionService) {}
    @Post(':id/version')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
createVersion(@Param('id') id: string, @Body() dto: CreateIdeaVersionDto, @Request() req) {
  return this.ideaVersionService.createVersion(
    +id,
    dto,
    req.user
  );
}
}
