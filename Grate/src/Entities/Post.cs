namespace GrateNotes.Entities;

public class Post
{
    public int PostId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }

    public int BlogId { get; set; }
    public Blog Blog { get; set; } = null!;
}
