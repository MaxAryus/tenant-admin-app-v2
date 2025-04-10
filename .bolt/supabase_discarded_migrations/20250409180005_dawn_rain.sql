/*
  # Dashboard Statistics Access Control

  1. Security Updates
    - Enable RLS on objects and apartments tables
    - Add policies for company admins to access statistics
    - Add policies for viewing apartment counts
    - Add policies for viewing object counts

  2. Changes
    - Add RLS policies to objects table
    - Add RLS policies to apartments table
    - Ensure company admins can view all statistics
*/

-- Enable RLS on objects table if not already enabled
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on apartments table if not already enabled
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;

-- Policy for company admins to view all objects in their company
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Allow company admins to view objects'
  ) THEN
    CREATE POLICY "Allow company admins to view objects" 
    ON objects
    FOR SELECT 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM company_admins 
        WHERE company_admins.user_id = auth.uid() 
        AND company_admins.company_id = objects.company_id
      )
    );
  END IF;
END $$;

-- Policy for company admins to view all apartments in their company's objects
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'apartments' AND policyname = 'Allow company admins to view apartments'
  ) THEN
    CREATE POLICY "Allow company admins to view apartments" 
    ON apartments
    FOR SELECT 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM company_admins 
        JOIN objects ON objects.company_id = company_admins.company_id
        WHERE company_admins.user_id = auth.uid() 
        AND apartments.object_id = objects.id
      )
    );
  END IF;
END $$;

-- Policy for company users to view objects in their company
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Allow company users to view objects'
  ) THEN
    CREATE POLICY "Allow company users to view objects" 
    ON objects
    FOR SELECT 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM company_users 
        WHERE company_users.user_id = auth.uid() 
        AND company_users.company_id = objects.company_id
      )
    );
  END IF;
END $$;

-- Policy for company users to view apartments in their company's objects
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'apartments' AND policyname = 'Allow company users to view apartments'
  ) THEN
    CREATE POLICY "Allow company users to view apartments" 
    ON apartments
    FOR SELECT 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM company_users 
        JOIN objects ON objects.company_id = company_users.company_id
        WHERE company_users.user_id = auth.uid() 
        AND apartments.object_id = objects.id
      )
    );
  END IF;
END $$;