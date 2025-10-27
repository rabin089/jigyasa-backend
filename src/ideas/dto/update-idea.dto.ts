import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { CreateIdeaDto } from './create-idea.dto';

export class UpdateIdeaDto extends PartialType(CreateIdeaDto) {
  @ApiProperty({
    description: 'The title of the idea',
    minLength: 3,
    maxLength: 100,
    example: 'My Updated Awesome Idea',
    required: false
  })
  title?: string;

  @ApiProperty({
    description: 'Detailed description of the idea',
    minLength: 10,
    maxLength: 5000,
    example: 'This is an updated detailed description of my awesome idea.',
    required: false
  })
  description?: string;

  @ApiProperty({
    description: 'ID of the author (user) who owns the idea',
    example: 1,
    required: false
  })
  authorId?: number;

  @ApiProperty({
    description: 'Optional image URL for the idea',
    example: 'https://example.com/image.png',
    required: false
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Optional category for the idea',
    example: 'Productivity',
    required: false
  })
  category?: string;
}
