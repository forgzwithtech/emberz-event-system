using Microsoft.AspNetCore.Mvc;

namespace EventAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;

    public AuthController(IConfiguration config)
    {
        _config = config;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequestDto request)
    {
        // For a 1-day sprint, we check against a PIN stored in appsettings.json
        // e.g., "AdminPin": "123456"
        var validPin = _config["AdminPin"] ?? "123456"; 

        if (request.Pin == validPin)
        {
            // In a full production app, you return a real JWT here.
            // For this sprint, returning a simple success token allows the frontend to proceed.
            return Ok(new { Token = "emberz_admin_authorized", Role = "Admin" });
        }

        return Unauthorized("Invalid PIN");
    }
}

public record LoginRequestDto(string Pin);