import { User } from "src/user/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { IdeaVersion } from "src/idea-version/entities/idea-version.entity";
import { Comment } from "src/comment/entities/comment.entity";
import { IdeaReaction } from "./idea-reaction.entity";

@Entity()
export class Idea {
    @ApiProperty({
        description: 'The unique identifier of the idea',
        example: 1,
    })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'The title of the idea',
        minLength: 3,
        maxLength: 100,
        example: 'My Awesome Idea',
    })
    @Column()
    title: string;

    @ApiProperty({
        description: 'Detailed description of the idea',
        minLength: 10,
        maxLength: 5000,
        example: 'This is a detailed description of my awesome idea.',
    })
    @Column('text')
    description: string;

    @ApiProperty({
        description: 'The author of the idea',
        type: () => User,
    })
    @ManyToOne(() => User, (user) => user.ideas, { onDelete: 'CASCADE' })
    author: User;

    @OneToMany(()=> IdeaVersion, (ideaVersion) => ideaVersion.idea)
    versions: IdeaVersion[];

    @ApiProperty({
        description: 'The current version number of the idea',
        example: 1,
    })
    @Column({ type: 'int', default: 1 })
    currentVersion: number;

    @OneToMany(()=> Comment, (comment) => comment.idea)
    comments: Comment[];

    @OneToMany(() => IdeaReaction, (reaction) => reaction.idea)
    reactions: IdeaReaction[];

    @ApiProperty({
        description: 'The date and time when the idea was created',
        example: '2023-01-01T00:00:00.000Z',
    })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({
        description: 'The date and time when the idea was last updated',
        example: '2023-01-01T00:00:00.000Z',
    })
    @UpdateDateColumn()
    updatedAt: Date;
}
