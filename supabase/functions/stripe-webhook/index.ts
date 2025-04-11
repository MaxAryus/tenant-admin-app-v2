import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  console.log('Processing webhook event:', event.type);
  
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;
      isSubscription = mode === 'subscription';
      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const { id: checkout_session_id, payment_intent, amount_subtotal, amount_total, currency } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed'
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    console.log('Starting customer sync for:', customerId);
    
    // Get company_id from stripe_customers
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('company_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError) {
      throw new Error(`Failed to get company_id for customer ${customerId}`);
    }

    // Get all active subscriptions for the customer
    const { data: activeSubscriptions, error: activeSubError } = await supabase
      .from('stripe_subscriptions')
      .select('subscription_id')
      .eq('customer_id', customerId)
      .eq('status', 'active');

    if (activeSubError) {
      throw new Error(`Failed to get active subscriptions for customer ${customerId}`);
    }

    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method', 'data.items.data.price'],
    });

    console.log('Found subscriptions:', subscriptions.data.length);

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert({
        customer_id: customerId,
        company_id: customer.company_id,
        subscription_status: 'not_started'
      }, {
        onConflict: 'customer_id'
      });

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      return;
    }

    // Get the latest subscription
    const newSubscription = subscriptions.data[0];
    console.log('Processing subscription:', newSubscription.id, 'with status:', newSubscription.status);

    // Cancel any existing active subscriptions that aren't the new one
    for (const activeSub of activeSubscriptions || []) {
      if (activeSub.subscription_id !== newSubscription.id) {
        console.log('Canceling old subscription:', activeSub.subscription_id);
        try {
          await stripe.subscriptions.cancel(activeSub.subscription_id);
          console.log('Successfully canceled old subscription:', activeSub.subscription_id);
        } catch (error) {
          console.error('Error canceling old subscription:', error);
          // Continue even if cancellation fails
        }
      }
    }

    // Get the price ID from the subscription items
    const priceId = newSubscription.items.data[0]?.price?.id;
    if (!priceId) {
      throw new Error('No price ID found in subscription');
    }

    console.log('Updating subscription with price ID:', priceId);

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert({
      customer_id: customerId,
      company_id: customer.company_id,
      subscription_id: newSubscription.id,
      price_id: priceId,
      current_period_start: newSubscription.current_period_start,
      current_period_end: newSubscription.current_period_end,
      cancel_at_period_end: newSubscription.cancel_at_period_end,
      ...(newSubscription.default_payment_method && typeof newSubscription.default_payment_method !== 'string' ? {
        payment_method_brand: newSubscription.default_payment_method.card?.brand ?? null,
        payment_method_last4: newSubscription.default_payment_method.card?.last4 ?? null
      } : {}),
      status: newSubscription.status
    }, {
      onConflict: 'customer_id'
    });

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }

    console.log('Successfully synced subscription for customer:', customerId);

    // Update company limits based on the subscription
    await updateCompanyLimits(customer.company_id, priceId);

  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function updateCompanyLimits(companyId: string, priceId: string) {
  try {
    console.log('Updating company limits for:', companyId, 'with price ID:', priceId);
    
    // Determine max objects based on price ID
    let maxObjects = 2; // Default Basic plan
    if (priceId === 'price_1RCcwRPqxAfGLqhdOtoQZl1j') { // Pro plan
      maxObjects = 10;
    } else if (priceId === 'price_1RCcwkPqxAfGLqhdqhp4MPQE') { // Enterprise plan
      maxObjects = 999999;
    }

    const { error } = await supabase
      .from('company_subscription_limits')
      .upsert(
        {
          company_id: companyId,
          max_objects: maxObjects,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'company_id',
        }
      );

    if (error) {
      throw error;
    }

    console.log('Successfully updated company limits:', { companyId, maxObjects });
  } catch (error) {
    console.error('Error updating company limits:', error);
    throw error;
  }
}