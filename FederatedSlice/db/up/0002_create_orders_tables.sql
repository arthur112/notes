-- order_no is derived from the identity (ORD-100101, ...), like customers.customer_no.
CREATE TABLE orders (
  id int NOT NULL IDENTITY(100101, 1),
  order_no AS ('ORD-' + CAST(id AS varchar(10))) PERSISTED,
  customer_id int NOT NULL,
  status nvarchar(20) NOT NULL,
  due_date date NOT NULL,
  reference nvarchar(50) NULL,
  created_at date NOT NULL DEFAULT CAST(SYSUTCDATETIME() AS date),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_customer_fkey FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE UNIQUE INDEX orders_order_no ON orders (order_no);
-- The customer's purchase-order number: unique when given.
CREATE UNIQUE INDEX orders_reference ON orders (reference) WHERE reference IS NOT NULL;

CREATE TABLE order_lines (
  id int NOT NULL IDENTITY,
  order_id int NOT NULL,
  product nvarchar(200) NOT NULL,
  quantity int NOT NULL,
  unit_price decimal(18, 2) NOT NULL,
  CONSTRAINT order_lines_pkey PRIMARY KEY (id),
  CONSTRAINT order_lines_order_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);
