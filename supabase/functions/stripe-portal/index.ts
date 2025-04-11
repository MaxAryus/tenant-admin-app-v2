import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { return_url } = await req.json();

    if (!return_url) {
      throw new Error('Return URL is required');
    }

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      throw new Error('Failed to authenticate user');
    }

    if (!user) {
      throw new Error('User not found');
    }

    // Get company ID for the authenticated admin
    const { data: adminData, error: adminError } = await supabase
      .from('company_admins')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (adminError) {
      throw new Error('User is not a company admin');
    }

    const companyId = adminData.company_id;

    // Get Stripe customer ID for the company
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (customerError || !customer) {
      throw new Error('No Stripe customer found for this company');
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.customer_id,
      return_url,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Portal session error:', error);
    
    return new Response(
      JSON.stringify({
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