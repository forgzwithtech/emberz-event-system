namespace EventAPI.Models;

public class Event
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public int TotalCapacity { get; set; }
    
    // Navigation property
    public ICollection<Token> Tokens { get; set; } = new List<Token>();
}