/*
  # Company Level Stripe Integration

  1. Changes
    - Remove user_id from stripe_customers, replace with company_id
    - Update RLS policies to check company admin access
    - Add company subscription limits table
    - Add trigger to update company limits on subscription changes

  2. Security
    - Enable RLS on all tables
    - Add policies for company admins
*/

-- Drop existing tables and recreate with company focus
DROP TABLE IF EXISTS stripe_orders CASCADE;
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;

CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  company_id uuid references companies(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view their company's customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM company_admins
        WHERE company_admins.user_id = auth.uid()
        AND company_admins.company_id = stripe_customers.company_id
      )
      AND deleted_at IS NULL
    );

CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view their company's subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers sc
            JOIN company_admins ca ON sc.company_id = ca.company_id
            WHERE ca.user_id = auth.uid()
            AND sc.deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE TABLE IF NOT EXISTS company_subscription_limits (
  id bigint primary key generated always as identity,
  company_id uuid references companies(id) not null unique,
  max_objects int not null default 2,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

ALTER TABLE company_subscription_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view their company's subscription limits"
    ON company_subscription_limits
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM company_admins
        WHERE company_admins.user_id = auth.uid()
        AND company_admins.company_id = company_subscription_limits.company_id
      )
    );

-- Function to update company limits based on subscription
CREATE OR REPLACE FUNCTION update_company_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Get company_id from stripe_customers
  WITH company_data AS (
    SELECT sc.company_id
    FROM stripe_customers sc
    WHERE sc.customer_id = NEW.customer_id
  )
  INSERT INTO company_subscription_limits (company_id, max_objects)
  SELECT 
    company_id,
    CASE 
      WHEN NEW.status = 'active' THEN 2  -- Basic plan: 2 objects
      ELSE 2  -- Default limit
    END
  FROM company_data
  ON CONFLICT (company_id) 
  DO UPDATE SET 
    max_objects = EXCLUDED.max_objects,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update limits when subscription changes
CREATE TRIGGER update_company_limits_on_subscription_change
  AFTER INSERT OR UPDATE OF status
  ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_company_limits();

-- View for company subscriptions
CREATE OR REPLACE VIEW company_subscriptions WITH (security_invoker = true) AS
SELECT
    c.id as company_id,
    c.name as company_name,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4,
    csl.max_objects
FROM companies c
LEFT JOIN stripe_customers sc ON c.id = sc.company_id
LEFT JOIN stripe_subscriptions s ON sc.customer_id = s.customer_id
LEFT JOIN company_subscription_limits csl ON c.id = csl.company_id
WHERE EXISTS (
    SELECT 1 FROM company_admins ca
    WHERE ca.user_id = auth.uid()
    AND ca.company_id = c.id
);

GRANT SELECT ON company_subscriptions TO authenticated;