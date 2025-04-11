import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface RegistrationData {
  company: {
    name: string;
    street: string;
    zipCode: number;
    city: string;
    land: string;
  };
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company, admin }: RegistrationData = await req.json();

    // Validate required fields
    if (!company.name || !company.street || !company.zipCode || !company.city || !company.land) {
      throw new Error('Missing required company fields');
    }

    if (!admin.firstName || !admin.lastName || !admin.email) {
      throw new Error('Missing required admin fields');
    }

    // Start a transaction by using a single batch operation
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: company.name,
        street: company.street,
        zip_code: company.zipCode,
        city: company.city,
        land: company.land,
      })
      .select()
      .single();

    if (companyError) {
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    // Create admin user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: admin.email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: admin.firstName,
        last_name: admin.lastName,
        phone_number: admin.phoneNumber,
        company_id: companyData.id,
      },
    });

    if (userError) {
      // Attempt to rollback company creation
      await supabase
        .from('companies')
        .delete()
        .eq('id', companyData.id);
      
      throw new Error(`Failed to create admin user: ${userError.message}`);
    }

    // Create company admin record
    const { error: adminError } = await supabase
      .from('company_admins')
      .insert({
        user_id: userData.user.id,
        company_id: companyData.id,
      });

    if (adminError) {
      // Attempt to rollback user and company creation
      await supabase.auth.admin.deleteUser(userData.user.id);
      await supabase
        .from('companies')
        .delete()
        .eq('id', companyData.id);
      
      throw new Error(`Failed to create company admin: ${adminError.message}`);
    }

    // Create initial subscription limits
    const { error: limitsError } = await supabase
      .from('company_subscription_limits')
      .insert({
        company_id: companyData.id,
        max_objects: 2, // Start with basic plan limits
      });

    if (limitsError) {
      console.error('Failed to create initial subscription limits:', limitsError);
      // Don't rollback here as this is not critical
    }

    return new Response(
      JSON.stringify({
        success: true,
        company: companyData,
        email: admin.email,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: error.status || 400,
      }
    );
  }
});