import { IsInt, IsNotEmpty, IsString, IsOptional, MinLength, MaxLength, IsDefined } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from 'class-transformer';

export class CreateIdeaDto {
  @ApiProperty({
    description: 'The title of the idea',
    example: 'My Awesome Idea',
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the idea',
    example: 'This is a detailed description of my awesome idea.',
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  description: string;

  @ApiPropertyOptional({
    description: 'ID of the author (user) creating the idea - automatically set from authenticated user',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  authorId?: number;
}
