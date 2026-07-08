using GrateNotes.Data;
using GrateNotes.Entities;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace GrateNotes;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        var reset = Array.Exists(args, a => a is "--reset" or "-r");
        var root = FindProjectRoot();
        var dbDir = Path.Combine(root, "db");
        Directory.CreateDirectory(dbDir);
        var dbPath = Path.Combine(dbDir, "notes.sqlite");
        var migrationsDir = Path.Combine(root, "Migrations");

        if (reset && File.Exists(dbPath))
        {
            File.Delete(dbPath);
            Console.WriteLine($"Removed existing database: {dbPath}");
        }

        RunGrate(dbPath, migrationsDir);

        var connectionString = $"Data Source={dbPath}";
        var options = new DbContextOptionsBuilder<BloggingContext>()
            .UseSqlite(connectionString)
            .Options;

        await using (var db = new BloggingContext(options))
        {
            Console.WriteLine("\n--- Tables in notes.sqlite ---");
            var tables = await db.Database.SqlQueryRaw<string>(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
                .ToListAsync();

            foreach (var t in tables)
            {
                Console.WriteLine($"   {t}");
            }
        }
        await using (var db = new BloggingContext(options))
        {
            if (await db.Blogs.AnyAsync())
            {
                Console.WriteLine("\n--- Seeding skipped (database already has data) ---");
            }
            else
            {
                Console.WriteLine("\n--- Seeding via EF Core ---");
                var blog = new Blog
                {
                    Url = "https://example.com/grate-notes",
                    Posts =
                    [
                        new Post { Title = "Hello Grate", Content = "Schema was migrated by grate." },
                        new Post { Title = "EF Core + Grate", Content = "Entities map to grate-created tables." }
                    ]
                };
                db.Blogs.Add(blog);
                await db.SaveChangesAsync();
                Console.WriteLine($"Inserted Blog #{blog.BlogId} with {blog.Posts.Count} posts.");
            }
        }

        await using (var db = new BloggingContext(options))
        {
            Console.WriteLine("\n--- LINQ query 1: Blogs with their posts ---");
            var blogs = await db.Blogs
                .Include(b => b.Posts)
                .ToListAsync();

            foreach (var b in blogs)
            {
                Console.WriteLine($"Blog [{b.BlogId}] {b.Url}");
                foreach (var p in b.Posts)
                {
                    Console.WriteLine($"   - Post [{p.PostId}] {p.Title}");
                }
            }

            Console.WriteLine("\n--- LINQ query 2: Posts containing 'Grate' (projection) ---");
            var matches = await db.Posts
                .Where(p => p.Title.Contains("Grate"))
                .Select(p => new { p.PostId, p.Title, p.Blog.Url })
                .ToListAsync();

            foreach (var m in matches)
            {
                Console.WriteLine($"   Post [{m.PostId}] '{m.Title}' on {m.Url}");
            }

            Console.WriteLine("\n--- LINQ query 3: Post count per blog ---");
            var counts = await db.Blogs
                .Select(b => new { b.Url, PostCount = b.Posts.Count })
                .ToListAsync();

            foreach (var c in counts)
            {
                Console.WriteLine($"   {c.Url}: {c.PostCount} post(s)");
            }
        }

        Console.WriteLine("\nAll good. grate schema verified with EF Core LINQ.");
    }

    private static void RunGrate(string dbPath, string migrationsDir)
    {
        var root = FindProjectRoot();
        Console.WriteLine("--- Running grate migrations ---");
        Console.WriteLine($"Database:      {dbPath}");
        Console.WriteLine($"Scripts dir:   {migrationsDir}");

        var connectionString = $"Data Source={dbPath}";
        var args = string.Format(
            "grate --connstring \"{0}\" --dbt sqlite --files \"{1}\" --silent --create",
            connectionString,
            migrationsDir);

        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = args,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            WorkingDirectory = root
        };

        using var process = Process.Start(psi)
            ?? throw new InvalidOperationException("Failed to start 'dotnet grate'. Is the local tool restored (dotnet tool restore)?");

        process.OutputDataReceived += (_, e) => { if (e.Data != null) Console.WriteLine("  grate> " + e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data != null) Console.Error.WriteLine("  grate! " + e.Data); };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        process.WaitForExit();

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException($"grate exited with code {process.ExitCode}. Run 'dotnet tool restore' first.");
        }

        Console.WriteLine("grate migration completed.\n");
    }

    private static string FindProjectRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "GrateNotes.csproj")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }
        return AppContext.BaseDirectory;
    }
}
