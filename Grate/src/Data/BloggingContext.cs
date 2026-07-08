using GrateNotes.Entities;
using Microsoft.EntityFrameworkCore;

namespace GrateNotes.Data;

public class BloggingContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; } = null!;
    public DbSet<Post> Posts { get; set; } = null!;

    public BloggingContext(DbContextOptions<BloggingContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Blog>(b =>
        {
            b.ToTable("Blogs");
            b.HasKey(x => x.BlogId);
            b.Property(x => x.Url).IsRequired();
            b.HasMany(x => x.Posts)
             .WithOne(x => x.Blog)
             .HasForeignKey(x => x.BlogId);
        });

        modelBuilder.Entity<Post>(p =>
        {
            p.ToTable("Posts");
            p.HasKey(x => x.PostId);
            p.Property(x => x.Title).IsRequired();
            p.Property(x => x.Content);
        });
    }
}
