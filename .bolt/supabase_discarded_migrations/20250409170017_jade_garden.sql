/*
  # Create objects table

  1. New Tables
    - `objects`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `company_id` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on objects table
    - Add policies for company owners and members
*/

CREATE TABLE IF NOT EXISTS objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  company_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read objects"
  ON objects
  FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT id FROM users WHERE auth.uid() = id
  ));

CREATE POLICY "Company owners can insert objects"
  ON objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );