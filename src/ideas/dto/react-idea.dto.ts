import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber } from 'class-validator';

export class ReactIdeaDto {
  @ApiProperty({ enum: [1, -1], description: '1 for upvote, -1 for downvote' })
  @IsNumber()
  @IsIn([1, -1])
  value: 1 | -1;
}
