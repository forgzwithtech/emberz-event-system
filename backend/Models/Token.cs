namespace EventAPI.Models;

public class Token
{
    // The 8-character Unbreakable ID (e.g., J2K7-B9N4)
    public string TokenId { get; set; } = string.Empty; 
    
    public Guid EventId { get; set; }
    
    public string? GuestName { get; set; }
    public bool CheckedIn { get; set; } = false;
    public DateTime? ScannedAt { get; set; }
    public string? BatchName { get; set; }
}