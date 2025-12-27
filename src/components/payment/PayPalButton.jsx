import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";

export default function PayPalButton({ amount, onSuccess, onError, planName }) {
  useEffect(() => {
    // Load PayPal SDK
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID'}&currency=USD`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) {
        window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                description: `Afrinnect ${planName}`,
                amount: {
                  value: amount.toString()
                }
              }]
            });
          },
          onApprove: async (data, actions) => {
            const order = await actions.order.capture();
            onSuccess(order);
          },
          onError: (err) => {
            console.error('PayPal error:', err);
            onError(err);
          }
        }).render('#paypal-button-container');
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [amount, planName]);

  return (
    <div>
      <div id="paypal-button-container" className="min-h-[45px]"></div>
      <p className="text-xs text-gray-500 text-center mt-2">
        Secure payment powered by PayPal
      </p>
    </div>
  );
}