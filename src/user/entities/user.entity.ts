import { Idea } from "src/ideas/entities/idea.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { IdeaReaction } from "src/ideas/entities/idea-reaction.entity";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
    @Column({ unique: true  })
    email: string;

    @Column({ unique: true  })
    username: string;

    @Column()
    password: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column( { default: 'user' } )
    role: string;

    @OneToMany(()=> Idea, (idea)=> idea.author)
    ideas: Idea[]

    @OneToMany(() => IdeaReaction, (reaction) => reaction.user)
    reactions?: IdeaReaction[]
}
