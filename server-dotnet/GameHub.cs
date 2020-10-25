using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace server_dotnet
{
    public class GameHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await this.Clients.Client(this.Context.ConnectionId).SendAsync("getConnectionId", this.Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            await this.Clients.All.SendAsync("newMessage", new
            {
                from = this.Context.ConnectionId,
                data = new
                {
                    type = "player-disconnected",
                    playerId = this.Context.ConnectionId
                }
            });
            await base.OnDisconnectedAsync(exception);
        }

        public Task SendMessage(string roomId, object message)
        {
            return this.Clients.Group(roomId).SendAsync("newMessage", message);
        }

        public Task AddToRoom(string roomId)
        {
            return this.Groups.AddToGroupAsync(this.Context.ConnectionId, roomId);
        }
    }
}
