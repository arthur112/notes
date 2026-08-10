IF OBJECT_ID('dbo.Addresses', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Addresses
    (
        OrderId  INT           NOT NULL CONSTRAINT PK_Addresses PRIMARY KEY
                 CONSTRAINT FK_Addresses_LegacyOrders REFERENCES dbo.LegacyOrders (Id),
        Street   NVARCHAR(120) NOT NULL,
        Street2  NVARCHAR(120) NULL,
        City     NVARCHAR(80)  NOT NULL,
        Zip      NVARCHAR(15)  NOT NULL,
        State    NVARCHAR(60)  NULL,
        Country  NVARCHAR(60)  NOT NULL
    );

    INSERT INTO dbo.Addresses (OrderId, Street, Street2, City, Zip, State, Country)
    SELECT Id, BillingStreet, BillingStreet2, BillingCity, BillingZip, BillingState, BillingCountry
    FROM dbo.LegacyOrders;

    ALTER TABLE dbo.LegacyOrders DROP COLUMN BillingStreet;
    ALTER TABLE dbo.LegacyOrders DROP COLUMN BillingStreet2;
    ALTER TABLE dbo.LegacyOrders DROP COLUMN BillingCity;
    ALTER TABLE dbo.LegacyOrders DROP COLUMN BillingZip;
    ALTER TABLE dbo.LegacyOrders DROP COLUMN BillingState;
    ALTER TABLE dbo.LegacyOrders DROP COLUMN BillingCountry;
END
