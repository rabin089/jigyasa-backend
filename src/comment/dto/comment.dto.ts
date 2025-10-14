import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto{
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    parentId?: number;

    @IsString()
    @IsNotEmpty()
    content: string;

}