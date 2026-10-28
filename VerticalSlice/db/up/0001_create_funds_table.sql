CREATE TABLE funds (
  id int NOT NULL IDENTITY,
  public_id uniqueidentifier NOT NULL DEFAULT NEWID(),
  name nvarchar(max) NOT NULL,
  permanent_information nvarchar(max) NULL,
  periodicity nvarchar(max) NOT NULL DEFAULT 'quarterly'
);

ALTER TABLE funds
ADD CONSTRAINT funds_pkey PRIMARY KEY (id);
