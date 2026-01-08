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

    const { currency = 'usd', planType, billingPeriod } = await req.json();

    if (!planType || !billingPeriod) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch Price from Database (Secure Source)
    // Format of planType in PricingPlan entity is expected to be 'premium', 'elite', etc.
    // billingPeriod is 'monthly', 'quarterly', 'yearly', '6months'
    
    // Split planType input (e.g. "premium_monthly") if it comes combined, or rely on separate params
    // The frontend sends `planType: ${selectedTier}_${selectedBilling}` in one place, 
    // but looking at the frontend code: `planType: ${selectedTier}_${selectedBilling}, billingPeriod: selectedBilling`
    
    // We should parse the tier from the planType or rely on separate if clear.
    // Let's assume planType param is the TIER (e.g. "premium") and we use billingPeriod.
    // Wait, frontend sends: `planType: ${selectedTier}_${selectedBilling}` (e.g. "premium_monthly")
    
    let tier = planType;
    if (planType.includes('_')) {
        tier = planType.split('_')[0]; // Extract "premium" from "premium_monthly"
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
    
    // Calculate total amount based on plan price
    let amount = selectedPlan.price_usd; 
    // PricingPlan usually stores the monthly equivalent or the total? 
    // Let's assume it stores the UNIT price (e.g. 14.99) or TOTAL?
    // Looking at PricingPlans.js: 
    // "let total = plan.price_usd;" ... "if (period === 'yearly') total = plan.price_usd * 12;"
    // This implies `price_usd` in DB is the MONTHLY rate.
    
    // Correction: If the DB stores the monthly rate, we must calculate the total amount to charge now.
    
    let interval = 'month';
    let interval_count = 1;
    let totalAmount = selectedPlan.price_usd;

    if (billingPeriod === 'yearly') {
        interval = 'year';
        interval_count = 1;
        totalAmount = selectedPlan.price_usd * 12;
    } else if (billingPeriod === 'quarterly') {
        interval = 'month';
        interval_count = 3;
        totalAmount = selectedPlan.price_usd * 3;
    } else if (billingPeriod === '6months') {
        interval = 'month';
        interval_count = 6;
        totalAmount = selectedPlan.price_usd * 6;
    }

    // 2. Fetch User Profile
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

    // 3. Create Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Afrinnect ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${billingPeriod})`,
            metadata: { planType: tier }
          },
          unit_amount: Math.round(totalAmount * 100), // Securely calculated amount
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
        planType: tier,
        billingPeriod: billingPeriod,
        profileId: userProfile.id
      },
    });

    if (!subscription.latest_invoice?.payment_intent?.client_secret) {
        throw new Error('Failed to generate payment intent');
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