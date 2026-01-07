import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import braintree from 'npm:braintree@3.23.0';

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Production,
  merchantId: Deno.env.get('BRAINTREE_MERCHANT_ID'),
  publicKey: Deno.env.get('BRAINTREE_PUBLIC_KEY'),
  privateKey: Deno.env.get('BRAINTREE_PRIVATE_KEY')
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { nonce, amount, planName, billingPeriod, tier, purchaseType = 'subscription' } = body;

    // Process payment
    const result = await gateway.transaction.sale({
      amount: amount.toString(),
      paymentMethodNonce: nonce,
      options: {
        submitForSettlement: true
      },
      customFields: {
        user_id: user.id,
        plan: planName || purchaseType,
        tier: tier || 'none',
        type: purchaseType
      }
    });

    if (result.success) {
      // Get user profile
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id });
      
      if (profiles.length === 0) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
      }

      const profile = profiles[0];

      if (purchaseType === 'boost') {
        // --- HANDLE ONE-TIME BOOST PURCHASE ---
        
        // 1. Activate Boost Immediately (24 hours)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          profile_boost_active: true,
          boost_expires_at: expiresAt
        });

        // 2. Create Boost Record
        await base44.asServiceRole.entities.ProfileBoost.create({
          user_profile_id: profile.id,
          boost_type: '24_hours',
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
          is_active: true,
          status: 'active',
          boost_duration_hours: 24
        });

        // 3. Log In-App Purchase
        await base44.asServiceRole.entities.InAppPurchase.create({
          user_profile_id: profile.id,
          item_type: 'boost',
          item_quantity: 1,
          amount_usd: parseFloat(amount),
          payment_provider: 'braintree',
          transaction_id: result.transaction.id,
          status: 'completed'
        });

        // 4. Send Receipt Email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: 'Receipt for Profile Boost - Afrinnect',
            body: `
              You've successfully purchased a Profile Boost!
              
              Amount Paid: $${amount}
              Transaction ID: ${result.transaction.id}
              Date: ${new Date().toLocaleDateString()}
              
              Your profile is now boosted for 24 hours! Get ready for more visibility.
              
              Thank you,
              Afrinnect Team
            `
          });
        } catch (e) {
          console.error('Email failed', e);
        }

        return Response.json({
          success: true,
          transactionId: result.transaction.id,
          message: 'Boost activated successfully!'
        });

      } else {
        // --- HANDLE SUBSCRIPTION (EXISTING LOGIC) ---
        
        // EDGE CASE: Cancel existing subscriptions before creating new one
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
          user_profile_id: profile.id,
          status: 'active'
        });

        for (const existingSub of existingSubs) {
          await base44.asServiceRole.entities.Subscription.update(existingSub.id, {
            status: 'cancelled',
            auto_renew: false
          });
        }

        const today = new Date();
        let endDate;

        // Calculate end date based on billing period
        if (billingPeriod === 'monthly') {
          endDate = new Date(today.setMonth(today.getMonth() + 1));
        } else if (billingPeriod === 'quarterly') {
          endDate = new Date(today.setMonth(today.getMonth() + 3));
        } else if (billingPeriod === 'yearly') {
          endDate = new Date(today.setFullYear(today.getFullYear() + 1));
        } else if (billingPeriod === '6months') {
          endDate = new Date(today.setMonth(today.getMonth() + 6));
        }

        // EDGE CASE: Regional pricing adjustment
        const userCountry = profile.current_country;
        
        // Create subscription record
        const subscription = await base44.asServiceRole.entities.Subscription.create({
          user_profile_id: profile.id,
          plan_type: `${tier}_${billingPeriod}`,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          payment_provider: 'braintree',
          external_id: result.transaction.id,
          amount_paid: parseFloat(amount),
          currency: 'USD',
          boosts_remaining: tier === 'elite' || tier === 'vip' ? 999 : 5,
          super_likes_remaining: 999,
          auto_renew: true
        });

        // Update user profile
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          subscription_tier: tier,
          is_premium: true,
          premium_until: endDate.toISOString()
        });

        // Create receipt
        const receipt = await base44.asServiceRole.entities.Receipt.create({
          transaction_id: result.transaction.id,
          user_profile_id: profile.id,
          subscription_id: subscription.id,
          plan_name: planName,
          billing_period: billingPeriod,
          amount_paid: parseFloat(amount),
          currency: 'USD',
          payment_provider: 'braintree',
          customer_email: user.email,
          customer_name: user.full_name || profile.display_name,
          purchase_date: new Date().toISOString(),
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: endDate.toISOString(),
          receipt_sent: false
        });

        // Send receipt email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: `Receipt for ${planName} Subscription - Afrinnect`,
            body: `
              Thank you for subscribing to ${planName}!
              
              RECEIPT
              Transaction ID: ${result.transaction.id}
              Amount Paid: $${amount} ${subscription.currency}
              Billing Period: ${billingPeriod}
              Purchase Date: ${new Date().toLocaleDateString()}
              
              SUBSCRIPTION DETAILS
              Plan: ${planName}
              Status: Active
              Start Date: ${new Date().toLocaleDateString()}
              Renewal Date: ${endDate.toDateString()}
              
              Your premium features are now active! Enjoy unlimited likes, advanced filters, and more.
              
              Questions? Reply to this email or visit our support page.
              
              Thank you for being part of Afrinnect!
              
              ---
              Afrinnect - African Dating Done Right
            `
          });

          // Mark receipt as sent
          await base44.asServiceRole.entities.Receipt.update(receipt.id, {
            receipt_sent: true
          });
        } catch (emailError) {
          console.error('Failed to send receipt email:', emailError);
        }

        return Response.json({
          success: true,
          transactionId: result.transaction.id,
          subscription: subscription
        });
      }
    } else {
      // Payment failed - notify user and log
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id });
      
      if (profiles.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_profile_id: profiles[0].id,
          type: 'admin_message',
          title: 'Payment Failed',
          message: `Your payment could not be processed: ${result.message}. Please try again or contact support.`,
          is_admin: true
        });
      }

      // Send failure email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Payment Failed - Afrinnect',
        body: `
          Your payment could not be processed.
          
          Reason: ${result.message}
          
          Please try again or contact our support team if the issue persists.
          
          Thank you,
          Afrinnect Team
        `
      });

      return Response.json({
        success: false,
        error: result.message
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Braintree checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});