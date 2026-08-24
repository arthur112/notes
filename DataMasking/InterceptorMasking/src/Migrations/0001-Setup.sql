-- Plain table, NO dynamic data masking: the database stores and returns
-- clear text. Masking happens in .NET (see MaskingInterceptor / MaskingConverters).
IF OBJECT_ID('dbo.Employees', 'U') IS NULL
CREATE TABLE dbo.Employees
(
    Id        int IDENTITY(1,1) PRIMARY KEY,
    FirstName nvarchar(50)  NOT NULL,
    LastName  nvarchar(50)  NOT NULL,
    Email     nvarchar(100) NOT NULL,
    Phone     varchar(20)   NULL,
    Salary    decimal(18,2) NOT NULL,
    Iban      varchar(34)   NULL
);

-- Added after the fact, so patch existing databases too.
IF COL_LENGTH('dbo.Employees', 'Iban') IS NULL
    ALTER TABLE dbo.Employees ADD Iban varchar(34) NULL;

GO

IF NOT EXISTS (SELECT 1 FROM dbo.Employees)
BEGIN
    INSERT INTO dbo.Employees (FirstName, LastName, Email, Phone, Salary, Iban) VALUES
    (N'Ada',      N'Lovelace',  N'ada.lovelace@contoso.com',  '5551234567', 145000.00, 'BE68539007547034'),
    (N'Alan',     N'Turing',    N'alan.turing@contoso.com',   '5559876543', 152500.00, 'GB29NWBK60161331926819'),
    (N'Grace',    N'Hopper',    N'grace.hopper@contoso.com',  '5555550100', 139900.00, 'NL91ABNA0417164300'),
    (N'Katherine',N'Johnson',   N'katherine.j@contoso.com',   '5554443322', 148750.00, 'DE89370400440532013000');
END

UPDATE dbo.Employees SET Iban = 'BE68539007547034'      WHERE Id = 1 AND Iban IS NULL;
UPDATE dbo.Employees SET Iban = 'GB29NWBK60161331926819' WHERE Id = 2 AND Iban IS NULL;
UPDATE dbo.Employees SET Iban = 'NL91ABNA0417164300'    WHERE Id = 3 AND Iban IS NULL;
UPDATE dbo.Employees SET Iban = 'DE89370400440532013000' WHERE Id = 4 AND Iban IS NULL;
