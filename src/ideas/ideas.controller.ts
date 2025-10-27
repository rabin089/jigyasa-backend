import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Query, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Idea } from './entities/idea.entity';
import { ReactIdeaDto } from './dto/react-idea.dto';

@ApiTags('ideas')
@ApiBearerAuth('JWT-auth')
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post('/create')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      console.log('=== VALIDATION ERRORS ===');
      console.log('Raw request body:', errors[0]?.target || 'No target');
      console.log('Validation errors:', errors.map(e => ({
        property: e.property,
        value: e.value,
        constraints: e.constraints
      })));
      console.log('========================');
      return errors;
    }
  }))
  @ApiOperation({ summary: 'Create a new idea' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'The idea has been successfully created.', type: Idea })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request.' })
  async create(@Body() createIdeaDto: CreateIdeaDto, @Request() req) {
    console.log('=== CREATE IDEA REQUEST ===');
    console.log('Request body after validation:', createIdeaDto);
    console.log('Authenticated user:', req.user);
    console.log('===========================');

    return this.ideasService.create(createIdeaDto, req.user);
  }

  @Get('/all')
  @ApiOperation({ summary: 'Get all ideas with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (starts from 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return all ideas with pagination.', type: [Idea] })
  async findAll(@Query() query: {page: number, limit: number}) {
    return this.ideasService.findAll(query.page || 1, query.limit || 10);
  }

  // Get top-rated ideas by reaction score (place before ':id' to avoid param capture)
  @Get('top-rated')
  @ApiOperation({ summary: 'Fetch top-rated ideas by score (upvotes - downvotes)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async topRated(@Query('limit') limit?: number) {
    return this.ideasService.topRated(Number(limit) || 10);
  }

  // Authored ideas of the current user
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get ideas authored by the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMine(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ideasService.findMine(req.user.id, Number(page) || 1, Number(limit) || 10);
  }

  // Ideas the user contributed to (comments or versions)
  @Get('contributed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get ideas the current user contributed to (comments or versions)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findContributed(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ideasService.findContributed(req.user.id, Number(page) || 1, Number(limit) || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get idea by ID' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The found idea', type: Idea })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Idea not found' })
  async findOne(@Param('id') id: string) {
    return this.ideasService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an idea' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The idea has been updated.', type: Idea })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Idea not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @UsePipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }))
  update(@Param('id') id: string, @Body() updateIdeaDto: UpdateIdeaDto, @Request() req) {
    return this.ideasService.update(+id, updateIdeaDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an idea' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The idea has been deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Idea not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  remove(@Param('id') id: string, @Request() req) {
    return this.ideasService.remove(+id, req.user);
  }

  // React to an idea (upvote/downvote). Toggle if same reaction sent twice.
  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'React (upvote/downvote) to an idea. Send value 1 or -1. Same value toggles off.' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  async react(@Param('id') id: string, @Body() body: ReactIdeaDto, @Request() req) {
    return this.ideasService.react(+id, req.user, body.value);
  }

  // Like and Dislike convenience endpoints
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Like an idea (upvote). Calling again toggles off.' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  async like(@Param('id') id: string, @Request() req) {
    return this.ideasService.react(+id, req.user, 1);
  }

  @Post(':id/dislike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Dislike an idea (downvote). Calling again toggles off.' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  async dislike(@Param('id') id: string, @Request() req) {
    return this.ideasService.react(+id, req.user, -1 as 1 | -1);
  }


  // Versioning endpoints
  @Get(':id/versions')
  @ApiOperation({ summary: 'List all versions for an idea (newest first)' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  listVersions(@Param('id') id: string) {
    return this.ideasService.listVersions(+id);
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Get a specific version snapshot' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  @ApiParam({ name: 'version', description: 'Version number' })
  getVersion(@Param('id') id: string, @Param('version') version: string) {
    return this.ideasService.getVersion(+id, +version);
  }

  @Post(':id/versions/:version/restore')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Restore an idea to a specific version (creates a new current version)' })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  @ApiParam({ name: 'version', description: 'Version number to restore' })
  restoreVersion(@Param('id') id: string, @Param('version') version: string, @Request() req) {
    return this.ideasService.restoreVersion(+id, +version, req.user);
  }
}
