using EventAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EventAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Event> Events { get; set; }
    public DbSet<Token> Tokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Ensure TokenId is the Primary Key
        modelBuilder.Entity<Token>().HasKey(t => t.TokenId);
        
        // Setup relationship
        modelBuilder.Entity<Token>()
            .HasOne<Event>()
            .WithMany(e => e.Tokens)
            .HasForeignKey(t => t.EventId);
    }
}