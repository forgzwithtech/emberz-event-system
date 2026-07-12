using EventAPI.Data;
using EventAPI.Models;
using EventAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO.Compression;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.Fonts;
using QRCoder;

namespace EventAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _context;

    public EventsController(AppDbContext context)
    {
        _context = context;
    }

    // GET ALL EVENTS (For the Web Dashboard Home Screen)
    [HttpGet]
    public async Task<IActionResult> GetAllEvents()
    {
        var events = await _context.Events
            .Select(e => new 
            { 
                e.Id, 
                e.Name, 
                e.TotalCapacity,
                TotalGenerated = e.Tokens.Count(),
                TotalCheckedIn = e.Tokens.Count(t => t.CheckedIn)
            })
            .ToListAsync();

        return Ok(events);
    }

    // GET SINGLE EVENT STATS (For the Web Dashboard Live Progress Bar)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEventStats(Guid id)
    {
        var targetEvent = await _context.Events
            .Include(e => e.Tokens)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (targetEvent == null) return NotFound("Event not found.");

        return Ok(new 
        {
            targetEvent.Id,
            targetEvent.Name,
            targetEvent.TotalCapacity,
            TotalGenerated = targetEvent.Tokens.Count,
            TotalCheckedIn = targetEvent.Tokens.Count(t => t.CheckedIn)
        });
    }

    // CREATE AN EVENT
    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventDto request)
    {
        var newEvent = new Event
        {
            Name = request.Name,
            TotalCapacity = request.TotalCapacity
        };

        _context.Events.Add(newEvent);
        await _context.SaveChangesAsync();

        return Ok(newEvent);
    }

    // BULK GENERATE UNBREAKABLE TOKENS (WITH FOLDER/BATCH SUPPORT)
    [HttpPost("{id}/generate")]
    public async Task<IActionResult> GenerateTokens(Guid id, [FromBody] GenerateRequestDto request)
    {
        var targetEvent = await _context.Events.FindAsync(id);
        if (targetEvent == null) return NotFound("Event not found.");

        var newTokens = new List<Token>();
        
        // Clean the batch name to prevent empty string edge cases
        string? cleanBatchName = string.IsNullOrWhiteSpace(request.BatchName) ? null : request.BatchName.Trim();

        for (int i = 0; i < request.Count; i++)
        {
            newTokens.Add(new Token
            {
                TokenId = TokenService.GenerateUniqueCode(), 
                EventId = id,
                BatchName = cleanBatchName // Assign the folder properly now!
            });
        }

        _context.Tokens.AddRange(newTokens);
        await _context.SaveChangesAsync();

        return Ok(new { 
            Message = $"Successfully generated {request.Count} access codes for {targetEvent.Name}.",
            TokensGenerated = request.Count 
        });
    }

    // GET TOKENS (For Web Dashboard and Mobile App)
    [HttpGet("{id}/tokens")]
    public async Task<IActionResult> GetEventTokens(Guid id)
    {
        var tokens = await _context.Tokens
            .Where(t => t.EventId == id)
            .Select(t => new { t.TokenId, t.GuestName, t.BatchName, t.CheckedIn }) 
            .ToListAsync();

        return Ok(tokens);
    }

    // GENERATE AND DOWNLOAD VIP ACCESS CARDS (ZIP) - TARGETED BATCH DOWNLOAD
    [HttpGet("{id}/download-tickets")]
    public async Task<IActionResult> DownloadTickets(Guid id, [FromQuery] string? batch)
    {
        var targetEvent = await _context.Events.FindAsync(id);
        if (targetEvent == null) return NotFound("Event not found.");

        // 1. Filter Database Query Based on Folder/Batch
        var tokenQuery = _context.Tokens.Where(t => t.EventId == id);
        
        if (!string.IsNullOrWhiteSpace(batch) && batch != "ALL")
        {
            tokenQuery = tokenQuery.Where(t => t.BatchName == batch);
        }

        var tokensToExport = await tokenQuery.ToListAsync();

        if (!tokensToExport.Any()) return BadRequest("No tokens found for this criteria.");

        // 2. Setup System Fonts securely with robust fallbacks
        FontFamily mainFontFamily;
        if (SystemFonts.TryGet("Arial", out var arialFont)) mainFontFamily = arialFont;
        else if (SystemFonts.Families.Any()) mainFontFamily = SystemFonts.Families.First();
        else throw new Exception("No system fonts found. Please install fonts on the host machine.");

        var gigatTitleFont = mainFontFamily.CreateFont(32, FontStyle.Bold); 
        var eventNameFont = mainFontFamily.CreateFont(24, FontStyle.Bold);
        var pinFont = mainFontFamily.CreateFont(56, FontStyle.Bold); 
        var smallLabelFont = mainFontFamily.CreateFont(12, FontStyle.Regular); 

        using var outStream = new MemoryStream();
        
        using (var archive = new ZipArchive(outStream, ZipArchiveMode.Create, true))
        {
            using var qrGenerator = new QRCodeGenerator();

            var bgDark = Color.ParseHex("#050505");
            var neonCyan = Color.ParseHex("#00FFCC");
            var textWhite = Color.White;
            var textGray = Color.ParseHex("#888888");

            foreach (var token in tokensToExport)
            {
                using var image = new Image<Rgba32>(1000, 500);
                image.Mutate(x => x.Fill(bgDark));

                image.Mutate(x => x.Fill(neonCyan, new RectangleF(40, 40, 6, 40))); 
                image.Mutate(x => x.DrawText("GIGAT WORLD", gigatTitleFont, textWhite, new PointF(60, 42)));
                image.Mutate(x => x.DrawText("EVENT SERVICES PORTAL", smallLabelFont, textGray, new PointF(60, 80)));

                QRCodeData qrCodeData = qrGenerator.CreateQrCode(token.TokenId, QRCodeGenerator.ECCLevel.Q);
                using var qrCode = new PngByteQRCode(qrCodeData);
                byte[] qrCodeAsPngByteArr = qrCode.GetGraphic(20, new byte[] { 255, 255, 255, 255 }, new byte[] { 0, 0, 0, 0 });

                using (Image qrImage = Image.Load(qrCodeAsPngByteArr))
                {
                    qrImage.Mutate(x => x.Resize(300, 300));
                    image.Mutate(x => x.DrawImage(qrImage, new Point(40, 140), 1f));
                }

                int rightContentStart = 400;

                image.Mutate(x => x.DrawText("EVENT", smallLabelFont, neonCyan, new PointF(rightContentStart, 140)));
                image.Mutate(x => x.DrawText(targetEvent.Name, eventNameFont, textWhite, new PointF(rightContentStart, 160)));

                image.Mutate(x => x.DrawText("ACCESS LEVEL", smallLabelFont, neonCyan, new PointF(rightContentStart, 240)));
                string accessLevel = string.IsNullOrWhiteSpace(token.BatchName) ? "GENERAL ADMISSION" : token.BatchName.ToUpper();
                image.Mutate(x => x.DrawText(accessLevel, eventNameFont, textWhite, new PointF(rightContentStart, 260)));

                image.Mutate(x => x.DrawText("VALIDATION CODE", smallLabelFont, neonCyan, new PointF(rightContentStart, 340)));
                image.Mutate(x => x.DrawText(token.TokenId, pinFont, textWhite, new PointF(rightContentStart, 360)));

                int footerY = 460;
                image.Mutate(x => x.DrawText("powered by", smallLabelFont, textGray, new PointF(40, footerY)));
                image.Mutate(x => x.DrawText("emberz technology", smallLabelFont, neonCyan, new PointF(110, footerY)));

                string folderPrefix = string.IsNullOrWhiteSpace(token.BatchName) ? "" : $"{token.BatchName.Replace(" ", "_")}/";
                var entry = archive.CreateEntry($"{folderPrefix}{token.TokenId}_AccessCard.png", CompressionLevel.Fastest);
                
                using var entryStream = entry.Open();
                await image.SaveAsPngAsync(entryStream);
            }
        }

        string zipFileName = string.IsNullOrWhiteSpace(batch) || batch == "ALL" 
            ? $"{targetEvent.Name.Replace(" ", "_")}_Complete_GigatAccessCards.zip"
            : $"{targetEvent.Name.Replace(" ", "_")}_{batch.Replace(" ", "_")}_GigatAccessCards.zip";

        return File(outStream.ToArray(), "application/zip", zipFileName);
    }

    // OFFLINE SYNC (Bulk Check-In)
    [HttpPost("{id}/sync")]
    public async Task<IActionResult> SyncCheckIns(Guid id, [FromBody] List<SyncCheckInDto> request)
    {
        var tokenIds = request.Select(r => r.TokenId).ToList();

        var tokensToUpdate = await _context.Tokens
            .Where(t => t.EventId == id && tokenIds.Contains(t.TokenId))
            .ToListAsync();

        int updatedCount = 0;

        foreach (var token in tokensToUpdate)
        {
            if (!token.CheckedIn)
            {
                var incomingData = request.First(r => r.TokenId == token.TokenId);
                
                token.CheckedIn = true;
                token.ScannedAt = incomingData.ScannedAt;
                
                if (!string.IsNullOrEmpty(incomingData.GuestName))
                {
                    token.GuestName = incomingData.GuestName;
                }
                
                updatedCount++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { 
            Message = "Sync Complete", 
            SuccessfullyCheckedIn = updatedCount,
            AlreadyCheckedIn = tokensToUpdate.Count - updatedCount
        });
    }

    // UPDATE GUEST NAME ON A SPECIFIC TOKEN
    [HttpPut("{id}/tokens/{tokenId}")]
    public async Task<IActionResult> UpdateGuestName(Guid id, string tokenId, [FromBody] UpdateTokenDto request)
    {
        var token = await _context.Tokens
            .FirstOrDefaultAsync(t => t.EventId == id && t.TokenId == tokenId);

        if (token == null) return NotFound("Token not found.");

        token.GuestName = request.GuestName;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Guest name updated.", Token = token });
    }
}

// --- DATA TRANSFER OBJECTS (FIXED) ---
public record CreateEventDto(string Name, int TotalCapacity);

// FIXED: Defining it this way allows the JSON parser to read and set both variables automatically.
public record GenerateRequestDto(int Count, string? BatchName);

public record SyncCheckInDto(string TokenId, string? GuestName, DateTime ScannedAt);
public record UpdateTokenDto(string? GuestName);

