import { Controller, Get, Query, Req, UseGuards, ParseBoolPipe, Patch, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async list(
        @Req() req: any,
        @Query('unread', new ParseBoolPipe({ optional: true })) unread?: boolean,
        @Query('limit') limitStr?: string,
        @Query('skip') skipStr?: string,
    ) {
        const userID= req.user.id;
        const limit=Math.min(parseInt(limitStr?? '20',10) || 20,100 );
        const skip=  parseInt(skipStr ?? '0', 10) || 0;
        const onlyUnread = unread ?? false;
        return this.notificationService.list(userID, {onlyUnread,limit,skip});
    }

    @Patch(':id/read')
    async markRead(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
     const userId = req.user.id;
     await this.notificationService.markRead(userId, id);
     return {success: true};
    }

    @Patch('read-all')
    async markAllRead(@Req() req: any) {
     const userId = req.user.id;
    const count = await this.notificationService.markAllRead(userId);
    return {success: true, updated: count};
    }

    @Delete(':id')
    async delete(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
     const userId = req.user.id;
     await this.notificationService.deleteOne(userId, id);
     return {success: true};
    }

}
