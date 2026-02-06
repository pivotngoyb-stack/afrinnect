import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');
const PAYPAL_MODE = Deno.env.get('PAYPAL_MODE') || 'sandbox'; // 'sandbox' or 'live'

const PAYPAL_API_URL = PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function sendPayPalPayout(accessToken, recipientEmail, amount, payoutId, note) {
  const response = await fetch(`${PAYPAL_API_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: payoutId,
        email_subject: 'You have received a payout from Afrinnect!',
        email_message: note || 'Thank you for being an Afrinnect Ambassador!'
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'USD'
          },
          receiver: recipientEmail,
          note: `Ambassador Commission Payout - ${payoutId}`,
          sender_item_id: payoutId
        }
      ]
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`PayPal payout failed: ${JSON.stringify(data)}`);
  }

  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { payout_id, action } = await req.json();

    if (!payout_id) {
      return Response.json({ error: 'payout_id required' }, { status: 400 });
    }

    // Get payout record
    const payouts = await base44.asServiceRole.entities.AmbassadorPayout.filter({ id: payout_id });
    if (payouts.length === 0) {
      return Response.json({ error: 'Payout not found' }, { status: 404 });
    }

    const payout = payouts[0];

    if (payout.status === 'paid') {
      return Response.json({ error: 'Payout already processed' }, { status: 400 });
    }

    // Get ambassador
    const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ id: payout.ambassador_id });
    if (ambassadors.length === 0) {
      return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    }

    const ambassador = ambassadors[0];

    // Determine payout method
    const payoutMethod = payout.payout_method || ambassador.payout_method;
    const payoutDetails = payout.payout_details || ambassador.payout_details;

    if (action === 'process_paypal') {
      if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        return Response.json({ error: 'PayPal not configured' }, { status: 500 });
      }

      const paypalEmail = payoutDetails?.paypal_email || payoutDetails?.email || ambassador.email;
      
      if (!paypalEmail) {
        return Response.json({ error: 'No PayPal email found for ambassador' }, { status: 400 });
      }

      // Update status to processing
      await base44.asServiceRole.entities.AmbassadorPayout.update(payout_id, {
        status: 'processing'
      });

      try {
        // Get PayPal access token
        const accessToken = await getPayPalAccessToken();
        
        // Send payout
        const paypalResponse = await sendPayPalPayout(
          accessToken,
          paypalEmail,
          payout.total_amount,
          payout_id,
          `Commission payout for ${ambassador.display_name}`
        );

        // Update payout record with success
        await base44.asServiceRole.entities.AmbassadorPayout.update(payout_id, {
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id: paypalResponse.batch_header?.payout_batch_id || 'paypal_' + Date.now()
        });

        // Send notification to ambassador
        if (ambassador.email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: ambassador.email,
              subject: '💰 Your Afrinnect Payout Has Been Sent!',
              body: `
Hi ${ambassador.display_name},

Great news! Your payout of $${payout.total_amount.toFixed(2)} has been sent to your PayPal account (${paypalEmail}).

You should receive the funds within 24-48 hours.

Thank you for being an amazing Afrinnect Ambassador!

Best,
The Afrinnect Team
              `.trim()
            });
          } catch (e) {
            console.error('Failed to send payout notification email:', e);
          }
        }

        return Response.json({ 
          success: true, 
          message: 'PayPal payout sent successfully',
          transaction_id: paypalResponse.batch_header?.payout_batch_id
        });

      } catch (error) {
        // Update payout to failed
        await base44.asServiceRole.entities.AmbassadorPayout.update(payout_id, {
          status: 'failed',
          failed_reason: error.message
        });

        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    if (action === 'mark_manual_paid') {
      // For bank transfers or other manual methods
      const { transaction_id, notes } = await req.json();

      await base44.asServiceRole.entities.AmbassadorPayout.update(payout_id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: transaction_id || 'manual_' + Date.now(),
        notes
      });

      return Response.json({ success: true, message: 'Payout marked as paid' });
    }

    return Response.json({ error: 'Invalid action. Use process_paypal or mark_manual_paid' }, { status: 400 });

  } catch (error) {
    console.error('Payout processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});