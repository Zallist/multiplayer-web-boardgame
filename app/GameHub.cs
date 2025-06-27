using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace boardgame
{
    public class GameHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.Client(Context.ConnectionId).SendAsync("getConnectionId", Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await Clients.All.SendAsync("newMessage", new
            {
                from = Context.ConnectionId,
                data = new
                {
                    type = "player-disconnected",
                    playerId = Context.ConnectionId
                }
            });
            await base.OnDisconnectedAsync(exception);
        }

        public Task SendMessage(string roomId, object message)
        {
            return Clients.Group(roomId).SendAsync("newMessage", message);
        }

        public Task AddToRoom(string roomId)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        }
    }
}
