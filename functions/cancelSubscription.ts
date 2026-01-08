import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@^14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find active subscription
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (!profiles.length) return Response.json({ error: 'Profile not found' }, { status: 404 });
    const profile = profiles[0];

    const activeSubs = await base44.entities.Subscription.filter({
        user_profile_id: profile.id,
        status: 'active'
    });

    if (activeSubs.length === 0) {
        return Response.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const subscription = activeSubs[0];

    // Cancel in Stripe
    if (subscription.payment_provider === 'stripe' && subscription.external_id) {
        try {
            await stripe.subscriptions.update(subscription.external_id, {
                cancel_at_period_end: true
            });
        } catch (e) {
            console.error("Stripe cancellation failed", e);
            return Response.json({ error: 'Failed to cancel with payment provider' }, { status: 500 });
        }
    }

    // Update in DB
    await base44.asServiceRole.entities.Subscription.update(subscription.id, {
        auto_renew: false
    });

    return Response.json({ success: true, message: 'Subscription will be cancelled at the end of the billing period.' });

  } catch (error) {
    console.error('Cancel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});