// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace server_azure
{
    public static class Functions
    {
        [FunctionName("negotiate")]
        public static SignalRConnectionInfo GetSignalRInfo(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req,
            [SignalRConnectionInfo(HubName = "game", UserId = "{headers.x-ms-signalr-userid}")] SignalRConnectionInfo connectionInfo)
        {
            return connectionInfo;
        }

        [FunctionName("messages")]
        public static Task SendMessage(
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

        [FunctionName("addToRoom")]
        public static Task AddToGroup(
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

        public class BaseMessage
        {
            public string from { get; set; }

            public string roomId { get; set; }

            public string type { get; set; }
        }

        /*
        public static class EventGridTriggerCSharp
        {
            [FunctionName("onConnection")]
            public static Task EventGridOnConnection([EventGridTrigger] EventGridEvent eventGridEvent,
                [SignalR(HubName = "game")] IAsyncCollector<SignalRMessage> signalRMessages)
            {
                if (eventGridEvent.EventType == "Microsoft.SignalRService.ClientConnectionConnected")
                {

                }

                return Task.CompletedTask;
            }
            [FunctionName("onDisconnection")]
            public static Task EventGridOnDisconnection([EventGridTrigger] EventGridEvent eventGridEvent,
                [SignalR(HubName = "game")] IAsyncCollector<SignalRMessage> signalRMessages)
            {
                if (eventGridEvent.EventType == "Microsoft.SignalRService.ClientConnectionConnected")
                {

                }

                return Task.CompletedTask;
            }
        }
        */
    }
}