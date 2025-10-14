import { Body, Controller, Get, Param, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Post } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/comment.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('comment')
@ApiTags('comment')
export class CommentController {
    constructor(private readonly commentService: CommentService) {}
    @Post(':id/add')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@ApiBearerAuth('JWT-auth')
addComment(@Param('id') id: string, @Body() dto: CreateCommentDto, @Request() req) {
  return this.commentService.addComment(+id, dto, req.user);
}

@Get('ideas/:ideaId/comments')
async findComments(@Param('ideaId') ideaId:number){
  return this.commentService.getNestedCommentsByIdea(Number(ideaId));
} 

 // Facebook-style explicit reply route
 @Post(':parentId/reply')
 @UseGuards(JwtAuthGuard)
 @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
 @ApiBearerAuth('JWT-auth')
 replyToComment(@Param('parentId') parentId: string, @Body() dto: CreateCommentDto, @Request() req) {
   return this.commentService.replyToComment(Number(parentId), dto.content, req.user);
 }

 // Facebook-style threads with reply preview
 @Get('ideas/:ideaId/threads')
 async getThreads(
   @Param('ideaId') ideaId: string,
   @Query('limit') limit?: string,
   @Query('skip') skip?: string,
 ) {
   return this.commentService.getThreads(Number(ideaId), limit ? Number(limit) : 10, skip ? Number(skip) : 0);
 }

 // Facebook-style paginated replies for a parent
 @Get(':commentId/replies')
 async getReplies(
   @Param('commentId') commentId: string,
   @Query('limit') limit?: string,
   @Query('skip') skip?: string,
 ) {
   return this.commentService.getReplies(Number(commentId), limit ? Number(limit) : 10, skip ? Number(skip) : 0);
 }


}
