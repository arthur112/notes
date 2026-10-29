UPDATE funds
SET periodicity = CASE periodicity
  WHEN 'monthly' THEN 'Monthly'
  WHEN 'quarterly' THEN 'Quarterly'
  WHEN 'yearly' THEN 'Yearly'
END;

-- 0001 created the default inline, so its constraint name is system-generated.
DECLARE @default sysname = (
  SELECT dc.name
  FROM sys.default_constraints dc
  JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID('funds') AND c.name = 'periodicity'
);
EXEC('ALTER TABLE funds DROP CONSTRAINT ' + QUOTENAME(@default));

ALTER TABLE funds
ADD CONSTRAINT df_funds_periodicity DEFAULT 'Quarterly' FOR periodicity;
