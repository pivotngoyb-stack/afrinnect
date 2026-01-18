import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@^14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const GIFT_PRICES = {
  'rose': 1.99, 'chocolate': 2.99, 'coffee': 2.99, 'cocktail': 4.99, 'heart': 1.99, 'kiss': 1.99,
  'diamond': 9.99, 'ring': 14.99, 'crown': 4.99, 'champagne': 19.99, 'money_bag': 24.99, 'airplane': 49.99, 'car': 29.99, 'house': 99.99,
  'teddy': 5.99, 'balloon': 1.99, 'party': 3.99, 'fire': 0.99, 'star': 3.99, 'trophy': 4.99,
  'kente': 9.99, 'drum': 7.99, 'beads': 5.99, 'kola': 2.99, 'fan': 4.99, 'mask': 12.99
};

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

    const { currency = 'usd', planType, billingPeriod, giftType } = await req.json();

    if (!planType || !billingPeriod) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch User Profile
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (!profiles.length) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const userProfile = profiles[0];
    let customerId = userProfile.stripe_customer_id;

    // Create Stripe Customer if not exists
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            name: userProfile.display_name,
            metadata: {
                base44_user_id: user.id,
                profile_id: userProfile.id
            }
        });
        customerId = customer.id;
        
        await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
            stripe_customer_id: customerId
        });
    }

    // ONE-TIME PAYMENT (Virtual Gifts)
    if (billingPeriod === 'one_time') {
        let amount = 0;
        
        if (planType === 'virtual_gift') {
            if (!giftType || !GIFT_PRICES[giftType]) {
                return Response.json({ error: 'Invalid gift type' }, { status: 400 });
            }
            amount = GIFT_PRICES[giftType];
        } else {
             return Response.json({ error: 'Invalid one-time plan' }, { status: 400 });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency,
            customer: customerId,
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: user.id,
                profileId: userProfile.id,
                planType: planType,
                giftType: giftType
            }
        });

        return Response.json({
            clientSecret: paymentIntent.client_secret,
            customerId: customerId
        });
    }

    // SUBSCRIPTIONS (Premium, Elite, VIP)
    // Fetch Price from Database
    let tier = planType;
    if (planType.includes('_')) {
        tier = planType.split('_')[0]; 
    }

    const plans = await base44.asServiceRole.entities.PricingPlan.filter({ 
        tier: tier, 
        billing_period: billingPeriod,
        is_active: true 
    });

    if (plans.length === 0) {
        return Response.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const selectedPlan = plans[0];
    let totalAmount = selectedPlan.price_usd;
    let interval = 'month';
    let interval_count = 1;

    let trialDays = null;
    if (billingPeriod === 'yearly') {
        interval = 'year';
        totalAmount = selectedPlan.price_usd * 12; // Assuming price_usd is monthly rate
        trialDays = 3;
    } else if (billingPeriod === 'quarterly') {
        interval_count = 3;
        totalAmount = selectedPlan.price_usd * 3;
    } else if (billingPeriod === '6months') {
        interval_count = 6;
        totalAmount = selectedPlan.price_usd * 6;
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Afrinnect ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${billingPeriod})`,
            metadata: { planType: tier }
          },
          unit_amount: Math.round(totalAmount * 100),
          recurring: {
            interval: interval,
            interval_count: interval_count
          }
        },
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      trial_period_days: trialDays,
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      metadata: {
        userId: user.id,
        userEmail: user.email,
        planType: tier,
        billingPeriod: billingPeriod,
        profileId: userProfile.id
      },
    });

    let clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
    
    // If trial, we might have a setup intent instead of a payment intent
    if (!clientSecret && subscription.pending_setup_intent?.client_secret) {
        clientSecret = subscription.pending_setup_intent.client_secret;
    }

    if (!clientSecret) {
        // Fallback: If status is active/trialing and no intent needed (rare with default_incomplete)
        if (subscription.status === 'trialing' || subscription.status === 'active') {
             // Maybe return success immediately? But we want to collect card.
             // With default_incomplete, we should have one of the intents.
             throw new Error('Failed to generate payment or setup intent');
        }
        throw new Error('Failed to generate payment intent');
    }

    return Response.json({
      clientSecret: clientSecret,
      subscriptionId: subscription.id,
      customerId: customerId,
      isTrial: !!trialDays
    });

  } catch (error) {
    console.error('Stripe error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});