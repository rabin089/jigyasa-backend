import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {

@OnEvent('idea.commented')
handleIdeaCommentedEvent(payload:any){
    console.log(`New Comment on idea ${payload.ideaId} by ${payload.username}`);

}

@OnEvent('idea.upvoted')
handleIdeaUpvotedEvent(payload:any){
    console.log(`${payload.username} liked your idea`);

}

@OnEvent('idea.downvoted')
handleIdeaDownvotedEvent(payload:any){
    console.log(`${payload.username} disliked your idea`);
}

@OnEvent('idea.shared')
handleIdeaSharedEvent(payload:any){
    console.log(`${payload.username} shared your idea`);
}

}