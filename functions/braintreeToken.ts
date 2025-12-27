import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import braintree from 'npm:braintree@3.23.0';

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox, // Change to Production for live
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

    console.log('Generating Braintree client token for user:', user.id);

    // Verify credentials are set
    if (!Deno.env.get('BRAINTREE_MERCHANT_ID') || !Deno.env.get('BRAINTREE_PUBLIC_KEY') || !Deno.env.get('BRAINTREE_PRIVATE_KEY')) {
      console.error('Missing Braintree credentials');
      return Response.json({ error: 'Payment system not configured. Please contact support.' }, { status: 500 });
    }

    // Generate client token without customer ID (Braintree will create one during checkout)
    let clientToken;
    const response = await gateway.clientToken.generate({});
    console.log('Generated token, response:', JSON.stringify(response));
    clientToken = response.clientToken || response;

    if (!clientToken || typeof clientToken !== 'string') {
      console.error('Failed to generate valid client token, received:', clientToken);
      return Response.json({ error: 'Failed to initialize payment system' }, { status: 500 });
    }

    console.log('Successfully generated client token');
    return Response.json({ 
      clientToken: clientToken 
    });
  } catch (error) {
    console.error('Braintree token error:', error);
    return Response.json({ error: 'Payment initialization failed: ' + error.message }, { status: 500 });
  }
});