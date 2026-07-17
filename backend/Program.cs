using EventAPI.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args); 

// 1. Configure CORS Services
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.AllowAnyOrigin() 
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

// 2. Configure Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Render terminates SSL at their proxy. Internal traffic is HTTP. 
// Safest to keep this disabled so it doesn't fight Render's load balancer.
// app.UseHttpsRedirection();

// 3. STRICT MIDDLEWARE ORDER
app.UseRouting();

// CORS MUST be placed exactly here: After UseRouting and Before UseAuthorization
app.UseCors("AllowFrontend"); 

app.UseAuthorization();

// 4. Map Endpoints
app.MapGet("/", () => "Emberz Event API is online and ready.");

app.MapControllers();

app.Run();