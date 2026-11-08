-- customer_no is derived from the identity (CUS-1001, ...), so it never needs generating in code.
CREATE TABLE customers (
  id int NOT NULL IDENTITY(1001, 1),
  customer_no AS ('CUS-' + CAST(id AS varchar(10))) PERSISTED,
  name nvarchar(200) NOT NULL,
  email nvarchar(200) NOT NULL,
  segment nvarchar(20) NOT NULL,
  country nvarchar(100) NOT NULL,
  active bit NOT NULL,
  credit_limit decimal(18, 2) NOT NULL,
  payment_terms_days int NOT NULL,
  is_vip bit NOT NULL,
  is_verified bit NOT NULL,
  is_on_hold bit NOT NULL,
  created_at date NOT NULL DEFAULT CAST(SYSUTCDATETIME() AS date),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX customers_customer_no ON customers (customer_no);
CREATE UNIQUE INDEX customers_name ON customers (name);
