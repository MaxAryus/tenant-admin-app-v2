import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface InvitationRequest {
  apartmentId: string;
  companyId: string;
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
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Get request body
    const { apartmentId, companyId }: InvitationRequest = await req.json();

    if (!apartmentId || !companyId) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First verify that the apartment and company exist and are related
    const { data: apartment, error: verifyError } = await supabase
      .from('apartments')
      .select(`
        id,
        name,
        object:objects!inner (
          id,
          name,
          company_id,
          street,
          zip_code
        )
      `)
      .eq('id', apartmentId)
      .single();

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }

    if (!apartment || apartment.object.company_id !== companyId) {
      throw new Error('Invalid apartment or company relationship');
    }

    // Create invitation token
    const { data: invitation, error: inviteError } = await supabase
      .from('invitation_tokens')
      .insert({
        apartment_id: apartmentId,
        company_id: companyId,
      })
      .select('token')
      .single();

    if (inviteError) {
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    if (!invitation) {
      throw new Error('No invitation data returned');
    }

    return new Response(
      JSON.stringify({
        token: invitation.token,
        apartment: apartment.name,
        object: {
          name: apartment.object.name,
          street: apartment.object.street,
          zip_code: apartment.object.zip_code
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Invitation creation error:', error);
    
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