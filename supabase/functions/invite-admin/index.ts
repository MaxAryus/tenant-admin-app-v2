import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface InviteAdminRequest {
  email: string;
  metadata: {
    email: string;
    last_name: string;
    company_id: string;
    first_name: string;
    phone_number: string;
  };
  companyId: string;
}

Deno.serve(async (req: Request) => {
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

    const { email, metadata, companyId }: InviteAdminRequest = await req.json();

    if (!email || !metadata || !companyId) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Invite user using Supabase Auth with minimal metadata
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          phone_number: metadata.phone_number,
          company_id: metadata.company_id,
          email: metadata.email
        }
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    // Create company admin record
    if (inviteData?.user?.id) {
      const { error: adminError } = await supabase
        .from('company_admins')
        .insert([
          {
            user_id: inviteData.user.id,
            company_id: companyId
          }
        ]);

      if (adminError) {
        throw adminError;
      }
    }

    return new Response(
      JSON.stringify({ message: 'Admin invited successfully' }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Admin invitation error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: error.status || 400,
      }
    );
  }
});