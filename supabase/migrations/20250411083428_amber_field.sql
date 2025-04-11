/*
  # Add company_id to stripe_subscriptions

  1. Changes
    - Add company_id column to stripe_subscriptions table
    - Update view to use company_id directly
    - Add foreign key constraint
    - Update RLS policies

  2. Security
    - Update RLS policies to use company_id
*/

-- Add company_id column
ALTER TABLE stripe_subscriptions
ADD COLUMN company_id uuid REFERENCES companies(id);

-- Update existing subscriptions with company_id from stripe_customers
UPDATE stripe_subscriptions ss
SET company_id = sc.company_id
FROM stripe_customers sc
WHERE ss.customer_id = sc.customer_id;

-- Make company_id NOT NULL after updating existing data
ALTER TABLE stripe_subscriptions
ALTER COLUMN company_id SET NOT NULL;

-- Drop and recreate the view to use company_id directly
DROP VIEW IF EXISTS company_subscriptions;

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
LEFT JOIN stripe_subscriptions s ON c.id = s.company_id
LEFT JOIN company_subscription_limits csl ON c.id = csl.company_id
WHERE EXISTS (
    SELECT 1 FROM company_admins ca
    WHERE ca.user_id = auth.uid()
    AND ca.company_id = c.id
);

-- Update RLS policy to use company_id directly
DROP POLICY IF EXISTS "Company admins can view their company's subscription data" ON stripe_subscriptions;

CREATE POLICY "Company admins can view their company's subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM company_admins ca
            WHERE ca.user_id = auth.uid()
            AND ca.company_id = stripe_subscriptions.company_id
        )
        AND deleted_at IS NULL
    );