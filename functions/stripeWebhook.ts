import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to process ambassador commission events
async function processAmbassadorEvent(base44, eventType, userId, subscriptionId, amount) {
    try {
        const referrals = await base44.asServiceRole.entities.AmbassadorReferral.filter({ user_id: userId });
        if (referrals.length === 0) return;

        await base44.functions.invoke('ambassadorProcessEvent', {
            event_type: eventType,
            user_id: userId,
            subscription_id: subscriptionId,
            amount: amount,
            currency: 'USD'
        });
    } catch (e) {
        console.error('Ambassador event processing failed:', e);
    }
}
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

    // Handle Subscription Updated (Cancellation scheduled)
    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        if (subscription.cancel_at_period_end) {
            const subs = await base44.asServiceRole.entities.Subscription.filter({ external_id: subscription.id });
            if (subs.length > 0) {
                await base44.asServiceRole.entities.Subscription.update(subs[0].id, { auto_renew: false });
            }
        }
    }

    // Handle Subscription Deleted (Expired/Cancelled immediately)
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        const subs = await base44.asServiceRole.entities.Subscription.filter({ external_id: subscription.id });
        if (subs.length > 0) {
            const sub = subs[0];
            await base44.asServiceRole.entities.Subscription.update(sub.id, { status: 'expired', auto_renew: false });
            
            // Downgrade user
            await base44.asServiceRole.entities.UserProfile.update(sub.user_profile_id, {
                is_premium: false,
                subscription_tier: 'free',
                premium_until: new Date().toISOString().split('T')[0]
            });
        }
    }

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
                
                // VIP perks: monthly gift allowance, priority DMs
                const vipPerks = tierName === 'vip' ? {
                    monthly_gifts_remaining: 5,
                    monthly_gifts_reset_date: new Date().toISOString().split('T')[0],
                    priority_dm_enabled: true
                } : {};
                
                await base44.asServiceRole.entities.UserProfile.update(profileId, {
                    is_premium: true,
                    subscription_tier: tierName,
                    premium_until: endDate.split('T')[0], // YYYY-MM-DD
                    is_active: true,
                    ...vipPerks
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
                    
                    // Process ambassador renewal commission
                    await processAmbassadorEvent(base44, 'renew', userId, subscriptionId, invoice.amount_paid / 100);
                } else if (invoice.billing_reason === 'subscription_create') {
                     await base44.asServiceRole.entities.Notification.create({
                        user_profile_id: profileId,
                        type: 'system',
                        title: 'Upgrade Successful! 🌟',
                        message: `Welcome to ${tierName.charAt(0).toUpperCase() + tierName.slice(1)}! You now have access to all exclusive features.`
                    });
                    
                    // Process ambassador subscription commission
                    await processAmbassadorEvent(base44, 'subscribe', userId, subscriptionId, invoice.amount_paid / 100);
                }
            }
        }
    }

    // Handle Refunds
    if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        const invoiceId = charge.invoice;
        
        if (invoiceId) {
            const invoice = await stripe.invoices.retrieve(invoiceId);
            const subscriptionId = invoice.subscription;
            
            if (subscriptionId) {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const { userId, profileId } = subscription.metadata;
                
                if (userId) {
                    await processAmbassadorEvent(base44, 'refund', userId, subscriptionId, charge.amount_refunded / 100);
                }
            }
        }
    }
    
    // Handle ONE-TIME payment_intent.succeeded (Shop purchases)
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, profileId, planType, itemType, itemQuantity } = paymentIntent.metadata;
        
        // Only process shop purchases (not subscription payments which have invoices)
        if (planType && planType.startsWith('shop_') && profileId && itemType) {
            const qty = parseInt(itemQuantity) || 1;
            
            // Get current profile
            const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: profileId });
            if (profiles.length > 0) {
                const profile = profiles[0];
                const updates = {};
                
                if (itemType === 'boost') {
                    updates.purchased_boosts = (profile.purchased_boosts || 0) + qty;
                } else if (itemType === 'super_likes') {
                    updates.purchased_super_likes = (profile.purchased_super_likes || 0) + qty;
                } else if (itemType === '24hr_unlock') {
                    updates.purchased_24hr_unlock = true;
                    updates.purchased_24hr_unlock_expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                } else if (itemType === 'rewind') {
                    // Rewinds are typically used immediately, but we could track them
                    // For now just record the purchase
                }
                
                if (Object.keys(updates).length > 0) {
                    await base44.asServiceRole.entities.UserProfile.update(profileId, updates);
                }
                
                // Record purchase
                await base44.asServiceRole.entities.InAppPurchase.create({
                    user_profile_id: profileId,
                    item_type: itemType,
                    item_quantity: qty,
                    amount_usd: paymentIntent.amount / 100,
                    payment_provider: 'stripe',
                    transaction_id: paymentIntent.id,
                    status: 'completed'
                });
                
                console.log(`Shop purchase completed: ${itemType} x${qty} for ${profileId}`);
            }
        }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});