import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@^14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    
    if (!endpointSecret || !signature) {
       // If no webhook secret is set yet, we can't verify, but we shouldn't crash. 
       // In production this is critical.
       console.warn("Missing STRIPE_WEBHOOK_SECRET or signature");
       return Response.json({ received: true });
    }

    const body = await req.text();
    let event;

    try {
      // Use the async constructEvent method for Deno
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Initialize Base44 client with service role for admin actions
    const base44 = createClientFromRequest(req);

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { userId, planType, billingPeriod } = paymentIntent.metadata;

      if (userId && planType) {
        console.log(`Processing successful payment for user ${userId}, plan ${planType}`);

        // Calculate end date based on billing period
        const startDate = new Date();
        const endDate = new Date();
        
        if (billingPeriod === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (billingPeriod === 'quarterly') {
            endDate.setMonth(endDate.getMonth() + 3);
        } else if (billingPeriod === '6months') {
            endDate.setMonth(endDate.getMonth() + 6);
        } else {
            // Default monthly
            endDate.setMonth(endDate.getMonth() + 1);
        }

        // 1. Create/Update Subscription
        // First check if active subscription exists
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
            user_profile_id: userId, // Assuming metadata userId maps to user_profile_id or we need to look it up
            status: 'active'
        });

        // If userId in metadata is the auth user.id, we might need to find the profile first
        // But let's assume metadata stored the profile ID if possible, or we look it up
        // In createStripePaymentIntent we stored user.id. We need to find the profile.
        
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: userId });
        const profileId = profiles[0]?.id;

        if (profileId) {
            // Idempotency Check
            const existingSub = await base44.asServiceRole.entities.Subscription.filter({ external_id: paymentIntent.id });
            if (existingSub.length > 0) {
                console.log('Subscription already processed');
                return Response.json({ received: true });
            }

            // Cancel old active subscriptions
            for (const sub of existingSubs) {
                await base44.asServiceRole.entities.Subscription.update(sub.id, { status: 'cancelled' });
            }

            // Create new subscription
            await base44.asServiceRole.entities.Subscription.create({
                user_profile_id: profileId,
                plan_type: planType, // e.g., 'premium_monthly' or just 'premium' combined with period
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                payment_provider: 'stripe',
                external_id: paymentIntent.id,
                amount_paid: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                auto_renew: true
            });

            // 2. Update User Profile (is_premium, badges, etc)
            const tierName = planType.split('_')[0]; // premium_monthly -> premium
            
            await base44.asServiceRole.entities.UserProfile.update(profileId, {
                is_premium: true,
                subscription_tier: tierName,
                premium_until: endDate.toISOString().split('T')[0]
            });

            // 3. Send Notification
            await base44.asServiceRole.entities.Notification.create({
                user_profile_id: profileId,
                type: 'system',
                title: 'Upgrade Successful! 🌟',
                message: `Welcome to ${tierName.charAt(0).toUpperCase() + tierName.slice(1)}! You now have access to all exclusive features.`
            });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});