CREATE TABLE Funds (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  permanent_information jsonb NULL,
  periodicity text NOT NULL DEFAULT 'quarterly'::text
);

ALTER TABLE Funds
ADD CONSTRAINT funds_pkey PRIMARY KEY (id);
