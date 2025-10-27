import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, Set<string>> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = this.jwtService.verify(token);
      const userId = Number(payload?.sub || payload?.id);
      if (!userId) {
        client.disconnect(true);
        return;
      }
      client.data.userId = userId;
      const set = this.userSockets.get(userId) ?? new Set<string>();
      set.add(client.id);
      this.userSockets.set(userId, set);
    } catch (e) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId: number | undefined = client.data?.userId;
    if (userId) {
      const set = this.userSockets.get(userId);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) this.userSockets.delete(userId);
      }
    }
  }

  notifyUser(userId: number, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;
    for (const sid of sockets) {
      this.server.to(sid).emit(event, data);
    }
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake?.auth as any;
    if (auth?.token) return this.stripBearer(auth.token);
    const headers = client.handshake?.headers as any;
    const header = headers?.authorization || headers?.Authorization;
    if (header) return this.stripBearer(header);
    const q = client.handshake?.query as any;
    if (q?.token) return this.stripBearer(q.token);
    return undefined;
  }

  private stripBearer(v: string): string {
    if (!v) return v;
    if (v.startsWith('Bearer ')) return v.slice(7);
    return v;
  }
}
