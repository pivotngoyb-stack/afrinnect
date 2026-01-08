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
       console.warn("Missing STRIPE_WEBHOOK_SECRET or signature");
       return Response.json({ received: true });
    }

    const body = await req.text();
    let event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Handle Invoice Payment Succeeded (Recurring & Initial)
    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        // Fetch subscription to get metadata
        if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const { userId, planType, billingPeriod, profileId } = subscription.metadata;
            
            console.log(`Processing subscription renewal for ${subscriptionId}, plan: ${planType}`);

            if (profileId && planType) {
                // Determine dates
                const startDate = new Date(subscription.current_period_start * 1000).toISOString();
                const endDate = new Date(subscription.current_period_end * 1000).toISOString();

                // Idempotency: Check if we already updated for this period
                // We can check if there's a subscription with this external_id AND matching end_date
                // Or just upsert based on external_id
                
                const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ 
                    external_id: subscriptionId 
                });

                if (existingSubs.length > 0) {
                    // Update existing
                    await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
                        status: 'active',
                        start_date: startDate,
                        end_date: endDate,
                        amount_paid: invoice.amount_paid / 100,
                        last_payment_date: new Date().toISOString()
                    });
                } else {
                    // Create new (if first time and wasn't created yet)
                    await base44.asServiceRole.entities.Subscription.create({
                        user_profile_id: profileId,
                        plan_type: planType,
                        status: 'active',
                        start_date: startDate,
                        end_date: endDate,
                        payment_provider: 'stripe',
                        external_id: subscriptionId,
                        amount_paid: invoice.amount_paid / 100,
                        currency: invoice.currency,
                        auto_renew: true
                    });
                }

                // Update User Profile
                const tierName = planType.split('_')[0]; // premium_monthly -> premium
                
                await base44.asServiceRole.entities.UserProfile.update(profileId, {
                    is_premium: true,
                    subscription_tier: tierName,
                    premium_until: endDate.split('T')[0], // YYYY-MM-DD
                    is_active: true
                });

                // Send Notification
                // Only send if it's a renewal (invoice.billing_reason === 'subscription_cycle')
                if (invoice.billing_reason === 'subscription_cycle') {
                    await base44.asServiceRole.entities.Notification.create({
                        user_profile_id: profileId,
                        type: 'system',
                        title: 'Subscription Renewed',
                        message: `Your ${tierName} subscription has been automatically renewed.`
                    });
                } else if (invoice.billing_reason === 'subscription_create') {
                     await base44.asServiceRole.entities.Notification.create({
                        user_profile_id: profileId,
                        type: 'system',
                        title: 'Upgrade Successful! 🌟',
                        message: `Welcome to ${tierName.charAt(0).toUpperCase() + tierName.slice(1)}! You now have access to all exclusive features.`
                    });
                }
            }
        }
    }
    
    // Ignore payment_intent.succeeded if it's from a subscription invoice
    // (Invoice event handles it better)

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});