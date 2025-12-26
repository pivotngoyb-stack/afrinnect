import React, { useState, useEffect } from 'react';
import DropIn from 'braintree-web-drop-in-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function BraintreeDropIn({ amount, planName, billingPeriod, tier, onSuccess, onError }) {
  const [clientToken, setClientToken] = useState(null);
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data } = await base44.functions.invoke('braintreeToken');
        setClientToken(data.clientToken);
      } catch (error) {
        console.error('Error fetching client token:', error);
        onError?.(error.message);
      }
    };
    fetchToken();
  }, []);

  const handlePayment = async () => {
    if (!instance) return;

    setLoading(true);
    try {
      const { nonce } = await instance.requestPaymentMethod();

      const { data } = await base44.functions.invoke('braintreeCheckout', {
        nonce,
        amount,
        planName,
        billingPeriod,
        tier
      });

      if (data.success) {
        onSuccess?.(data);
      } else {
        onError?.(data.error);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!clientToken) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DropIn
        options={{
          authorization: clientToken,
          paypal: {
            flow: 'checkout',
            amount: amount,
            currency: 'USD'
          },
          card: {
            cardholderName: {
              required: true
            }
          }
        }}
        onInstance={setInstance}
      />
      <Button
        onClick={handlePayment}
        disabled={!instance || loading}
        className="w-full bg-purple-600 hover:bg-purple-700"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            Processing...
          </>
        ) : (
          `Pay $${amount}`
        )}
      </Button>
    </div>
  );
}