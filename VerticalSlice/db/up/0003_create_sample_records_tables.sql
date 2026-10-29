CREATE TABLE sample_records (
  id int NOT NULL IDENTITY,
  public_id uniqueidentifier NOT NULL DEFAULT NEWID(),
  external_key nvarchar(100) NOT NULL,
  type nvarchar(10) NOT NULL,
  cust_id nvarchar(50) NOT NULL,
  priority int NULL,
  currency nvarchar(3) NULL,
  payment_term_days int NULL,
  edi_code nvarchar(50) NULL,
  edi_partner nvarchar(100) NULL,
  description nvarchar(max) NULL,
  reference nvarchar(100) NULL,
  amount decimal(18, 2) NOT NULL,
  quantity decimal(18, 4) NULL,
  order_date date NOT NULL,
  due_date date NULL,
  created_at datetimeoffset NOT NULL,
  updated_at datetimeoffset NOT NULL,
  CONSTRAINT sample_records_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ux_sample_records_external_key ON sample_records (external_key);

-- Per-customer overrides read by the SampleRecord rules (Default... on create, Forced... always).
CREATE TABLE customer_settings (
  cust_id nvarchar(50) NOT NULL,
  default_payment_term_days int NULL,
  forced_currency nvarchar(3) NULL,
  CONSTRAINT customer_settings_pkey PRIMARY KEY (cust_id)
);
