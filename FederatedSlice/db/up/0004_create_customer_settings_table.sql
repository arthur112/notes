-- Per-customer order rules that would otherwise be `if (customer == "...")` branches. Read by
-- OrderRules; a customer without a row has no special rule. Shown read-only in the customers list.
CREATE TABLE customer_settings (
  customer_id int NOT NULL,
  -- New orders must start in this status (a prepaid customer's orders start Paid).
  initial_status nvarchar(20) NULL,
  -- Orders must be due exactly this many days after the order date (contract terms).
  forced_due_days int NULL,
  CONSTRAINT customer_settings_pkey PRIMARY KEY (customer_id),
  CONSTRAINT customer_settings_customer_fkey FOREIGN KEY (customer_id) REFERENCES customers (id)
);

INSERT INTO customer_settings (customer_id, initial_status, forced_due_days)
VALUES
  (1002, NULL, 30),   -- Globex: due 30 days after the order date
  (1005, 'Paid', NULL); -- Hooli: prepaid
