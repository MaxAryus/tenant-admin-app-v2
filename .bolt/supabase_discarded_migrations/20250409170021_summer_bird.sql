/*
  # Create tickets table

  1. New Tables
    - `tickets`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `status` (text)
      - `object_id` (uuid, foreign key to objects)
      - `assigned_to` (uuid, foreign key to users)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on tickets table
    - Add policies for company members
*/

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'open',
  object_id uuid REFERENCES objects(id),
  assigned_to uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (
    object_id IN (
      SELECT o.id FROM objects o
      JOIN users u ON o.company_id = u.id
      WHERE auth.uid() = u.id
    )
  );

CREATE POLICY "Company members can create tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    object_id IN (
      SELECT o.id FROM objects o
      JOIN users u ON o.company_id = u.id
      WHERE auth.uid() = u.id
    )
  );

CREATE POLICY "Assigned users can update tickets"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM objects o
      JOIN users u ON o.company_id = u.id
      WHERE o.id = object_id
      AND u.id = auth.uid()
      AND u.role = 'owner'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM objects o
      JOIN users u ON o.company_id = u.id
      WHERE o.id = object_id
      AND u.id = auth.uid()
      AND u.role = 'owner'
    )
  );