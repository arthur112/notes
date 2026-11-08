-- The rows the front's mocks used to hold, so the shell has data on first run. Inserted in order,
-- so the identities give CUS-1001..1012 and ORD-100101..100106.
INSERT INTO customers
  (name, email, segment, country, active, credit_limit, payment_terms_days, is_vip, is_verified, is_on_hold, created_at)
VALUES
  ('Acme Corp',           'billing@acme.test',        'Enterprise', 'United States',  1, 250000, 30, 1, 1, 0, '2024-03-11'),
  ('Globex',              'accounts@globex.test',     'SMB',        'Netherlands',    1,  80000, 30, 0, 1, 0, '2024-06-02'),
  ('Initech',             'finance@initech.test',     'Enterprise', 'United States',  1, 120000, 60, 0, 1, 0, '2024-09-19'),
  ('Umbrella',            'orders@umbrella.test',     'Enterprise', 'United Kingdom', 1, 400000, 90, 1, 0, 1, '2024-11-05'),
  ('Hooli',               'ap@hooli.test',            'SMB',        'United States',  0,  60000, 15, 0, 0, 0, '2025-01-23'),
  ('Vandelay Industries', 'imports@vandelay.test',    'SMB',        'United States',  1,  90000, 30, 0, 1, 0, '2025-02-14'),
  ('Soylent Corp',        'procurement@soylent.test', 'Startup',    'Germany',        1,  25000, 15, 0, 0, 0, '2025-03-30'),
  ('Stark Industries',    'billing@stark.test',       'Enterprise', 'United States',  1, 900000, 60, 1, 1, 0, '2025-05-12'),
  ('Wayne Enterprises',   'accounts@wayne.test',      'Enterprise', 'United States',  0, 750000, 90, 1, 1, 1, '2025-06-08'),
  ('Cyberdyne Systems',   'ap@cyberdyne.test',        'Startup',    'United States',  1,  15000, 15, 0, 0, 0, '2025-08-21'),
  ('Massive Dynamic',     'finance@massive.test',     'Enterprise', 'Sweden',         1, 320000, 60, 0, 1, 0, '2025-10-03'),
  ('Pied Piper',          'admin@piedpiper.test',     'Startup',    'United States',  0,   5000, 15, 0, 0, 0, '2026-01-17');

INSERT INTO orders (customer_id, status, due_date, reference, created_at)
VALUES
  (1001, 'Paid',      '2026-01-18', 'PO-1001', '2026-01-04'),
  (1002, 'Pending',   '2026-01-25', NULL,      '2026-01-11'),
  (1003, 'Shipped',   '2026-02-02', NULL,      '2026-01-19'),
  (1004, 'Delivered', '2026-02-16', NULL,      '2026-02-02'),
  (1001, 'Cancelled', '2026-02-28', NULL,      '2026-02-14'),
  (1005, 'Paid',      '2026-03-15', NULL,      '2026-03-01');

INSERT INTO order_lines (order_id, product, quantity, unit_price)
VALUES
  (100101, 'Anvil',         3,  43.30),
  (100102, 'Hammock',       2,  27.00),
  (100103, 'Stapler',       1, 310.50),
  (100104, 'Umbrella',      5,   3.75),
  (100105, 'Rocket skates', 4,  23.00),
  (100106, 'Server rack',   2, 620.00);
