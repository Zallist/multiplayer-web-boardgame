// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.EventGrid.Models;
using Microsoft.Azure.SignalR.Management;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.EventGrid;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace server_azure
{
    public class Functions : ServerlessHub
    {
        public Functions(IServiceHubContext hubContext = null, IServiceManager serviceManager = null) : base(hubContext, serviceManager)
        {
        }

        [FunctionName(nameof(Negotiate))]
        public SignalRConnectionInfo Negotiate(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req,
            [SignalRConnectionInfo(HubName = "game", UserId = "{headers.x-ms-signalr-userid}")] SignalRConnectionInfo connectionInfo)
        {
            return connectionInfo;
        }

        [FunctionName(nameof(Messages))]
        public Task Messages(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req,
            [SignalR(HubName = "game")] IAsyncCollector<SignalRMessage> signalRMessages)
        {
            dynamic message = new JsonSerializer().Deserialize(new JsonTextReader(new StreamReader(req.Body)));

            return signalRMessages.AddAsync(
                new SignalRMessage
                {
                    GroupName = message.roomId,
                    Target = "newMessage",
                    Arguments = new[] { message }
                });
        }

        [FunctionName(nameof(AddToRoom))]
        public Task AddToRoom(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req,
            [SignalR(HubName = "game")] IAsyncCollector<SignalRGroupAction> signalRGroupActions)
        {
            var message = new JsonSerializer().Deserialize<BaseMessage>(new JsonTextReader(new StreamReader(req.Body)));

            return signalRGroupActions.AddAsync(
                new SignalRGroupAction
                {
                    UserId = message.from,
                    GroupName = message.roomId,
                    Action = GroupAction.Add
                });
        }

        [FunctionName("onDisconnection")]
        public static Task EventGridEvent([EventGridTrigger] EventGridEvent eventGridEvent,
            [SignalR(HubName = "game")] IAsyncCollector<SignalRMessage> signalRMessages)
        {
            if (StringComparer.OrdinalIgnoreCase.Equals(eventGridEvent.EventType, "Microsoft.SignalRService.ClientConnectionDisconnected"))
            {
                dynamic connection = new JsonSerializer().Deserialize(new JsonTextReader(new StringReader(eventGridEvent.Data.ToString())));

                return signalRMessages.AddAsync(
                    new SignalRMessage()
                    {
                        Target = "newMessage",
                        Arguments = new[] { new {
                            from = connection.userId,
                            data = new
                            {
                                type = "player-disconnected",
                                playerId = connection.userId
                            }
                        }}
                    });
            }
            else
            {
                return Task.CompletedTask;
            }
        }

        public class BaseMessage
        {
            public string from { get; set; }

            public string roomId { get; set; }

            public string type { get; set; }
        }
    }
}