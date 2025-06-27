namespace boardgame
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddSignalR(options =>
            {
                const long MAX_MESSAGE_SIZE = 1024 * 1024;
                options.MaximumReceiveMessageSize = MAX_MESSAGE_SIZE;
            });

            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(builder =>
                {
                    builder
                        .SetIsOriginAllowed(origin => true)
                        .AllowCredentials()
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
                app.UseDeveloperExceptionPage();

            app.UseCors();
            app.UseDefaultFiles();
            app.UseStaticFiles();

            // Configure the HTTP request pipeline.
            app.MapHub<GameHub>("hub", (options) =>
            {

            });

            app.MapFallbackToFile("/index.html");

            app.Run();
        }
    }
}
