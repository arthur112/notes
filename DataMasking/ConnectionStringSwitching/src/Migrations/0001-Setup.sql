-- Idempotent setup: two logins (privileged / unprivileged), one table with
-- SQL Server dynamic data masking, and seed rows.

-- Server-level logins. mask_admin gets UNMASK; mask_user does not.
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'mask_admin')
    CREATE LOGIN mask_admin WITH PASSWORD = 'Admin!Pass123';
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'mask_user')
    CREATE LOGIN mask_user WITH PASSWORD = 'User!Pass123';

-- Database users mapped to those logins.
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'mask_admin')
    CREATE USER mask_admin FOR LOGIN mask_admin;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'mask_user')
    CREATE USER mask_user FOR LOGIN mask_user;

-- The masked table. MASKED WITH is metadata on the column: the engine rewrites
-- the returned values at runtime for principals without UNMASK.
IF OBJECT_ID('dbo.Employees', 'U') IS NULL
CREATE TABLE dbo.Employees
(
    Id        int IDENTITY(1,1) PRIMARY KEY,
    FirstName nvarchar(50)  NOT NULL,
    LastName  nvarchar(50)  NOT NULL,
    Email     nvarchar(100) MASKED WITH (FUNCTION = 'email()') NOT NULL,
    Phone     varchar(20)   MASKED WITH (FUNCTION = 'partial(1, "XX-XX", 2)') NULL,
    Salary    decimal(18,2) MASKED WITH (FUNCTION = 'default()') NOT NULL
);

GRANT SELECT ON dbo.Employees TO mask_admin;
GRANT SELECT ON dbo.Employees TO mask_user;
GRANT UNMASK TO mask_admin;

IF NOT EXISTS (SELECT 1 FROM dbo.Employees)
BEGIN
    INSERT INTO dbo.Employees (FirstName, LastName, Email, Phone, Salary) VALUES
    (N'Ada',      N'Lovelace',  N'ada.lovelace@contoso.com',  '5551234567', 145000.00),
    (N'Alan',     N'Turing',    N'alan.turing@contoso.com',   '5559876543', 152500.00),
    (N'Grace',    N'Hopper',    N'grace.hopper@contoso.com',  '5555550100', 139900.00),
    (N'Katherine',N'Johnson',   N'katherine.j@contoso.com',   '5554443322', 148750.00);
END
