CREATE TABLE Posts
(
    PostId  INTEGER PRIMARY KEY AUTOINCREMENT,
    Title   TEXT    NOT NULL,
    Content TEXT,
    BlogId  INTEGER NOT NULL
                        REFERENCES Blogs (BlogId)
);
