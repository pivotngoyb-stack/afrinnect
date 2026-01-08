import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@^14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency = 'usd', planType, billingPeriod } = await req.json();

    if (!amount || !planType) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch User Profile to get/create Customer ID
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (!profiles.length) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const userProfile = profiles[0];
    
    let customerId = userProfile.stripe_customer_id;

    // Create Stripe Customer if not exists
    if (!customerId) {
        console.log(`Creating Stripe customer for ${user.email}`);
        const customer = await stripe.customers.create({
            email: user.email,
            name: userProfile.display_name,
            metadata: {
                base44_user_id: user.id,
                profile_id: userProfile.id
            }
        });
        customerId = customer.id;
        
        // Save to profile
        await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
            stripe_customer_id: customerId
        });
    }

    // 2. Create Subscription
    // We create a subscription with 'default_incomplete' behavior to work with PaymentElement
    // We use price_data to create the recurring price on the fly
    
    let interval = 'month';
    let interval_count = 1;
    
    if (billingPeriod === 'yearly') {
        interval = 'year';
        interval_count = 1;
    } else if (billingPeriod === 'quarterly') {
        interval = 'month';
        interval_count = 3;
    } else if (billingPeriod === '6months') {
        interval = 'month';
        interval_count = 6;
    }

    console.log(`Creating subscription for customer ${customerId}, plan ${planType}`);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Afrinnect ${planType} Plan`,
            metadata: {
                planType: planType
            }
          },
          unit_amount: Math.round(amount * 100),
          recurring: {
            interval: interval,
            interval_count: interval_count
          }
        },
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user.id,
        userEmail: user.email,
        planType: planType,
        billingPeriod: billingPeriod,
        profileId: userProfile.id
      },
    });

    if (!subscription.latest_invoice?.payment_intent?.client_secret) {
        throw new Error('Failed to generate payment intent for subscription');
    }

    return Response.json({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id,
      customerId: customerId
    });

  } catch (error) {
    console.error('Stripe error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});