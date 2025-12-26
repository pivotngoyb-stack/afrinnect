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

    // Generate client token
    const response = await gateway.clientToken.generate({
      customerId: user.id
    });

    return Response.json({ 
      clientToken: response.clientToken 
    });
  } catch (error) {
    console.error('Braintree token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});