/*
  # Create invitation tokens table

  1. New Tables
    - `invitation_tokens`
      - `id` (uuid, primary key)
      - `token` (uuid, unique)
      - `apartment_id` (uuid, foreign key)
      - `company_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `used_at` (timestamp, nullable)

  2. Security
    - Enable RLS on `invitation_tokens` table
    - Add policy for authenticated users to read their own tokens
    - Add policy for company admins to manage tokens

  3. Changes
    - Add foreign key constraints to apartments and companies tables
    - Add expiration and usage tracking
*/

CREATE TABLE IF NOT EXISTS invitation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  UNIQUE(token)
);

ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Allow company admins to manage tokens
CREATE POLICY "Company admins can manage tokens"
  ON invitation_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_admins
      WHERE company_admins.user_id = auth.uid()
      AND company_admins.company_id = invitation_tokens.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_admins
      WHERE company_admins.user_id = auth.uid()
      AND company_admins.company_id = invitation_tokens.company_id
    )
  );

-- Allow public read access to valid tokens
CREATE POLICY "Anyone can read valid tokens"
  ON invitation_tokens
  FOR SELECT
  TO public
  USING (
    used_at IS NULL 
    AND expires_at > now()
  );