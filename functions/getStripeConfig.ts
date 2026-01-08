import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Return the publishable key to the frontend
    // This is safe as it is a publishable key
    return Response.json({ 
        publicKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});