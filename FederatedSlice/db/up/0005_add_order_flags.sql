-- Order states kept as their own columns rather than values of `status`: a flag (is_urgent) and a
-- nullable date that means "done" once set (invoiced_at). The orders list filters on them together
-- with flags of the linked customer.
ALTER TABLE orders ADD
  is_urgent bit NOT NULL CONSTRAINT orders_is_urgent_default DEFAULT 0,
  invoiced_at date NULL;
GO

UPDATE orders SET is_urgent = 1 WHERE id IN (100102, 100104);
UPDATE orders SET invoiced_at = DATEADD(day, 1, created_at) WHERE id IN (100101, 100104, 100106);
