import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Initialize Stripe outside component to avoid recreation
// We need to fetch the key from secrets or env, but in frontend we usually expect it passed or known
// Since we don't have env vars in frontend directly, we often fetch it or hardcode the public key
// For now, I'll assume the user will provide it or I fetch it from a backend config endpoint
// But better pattern: The user provided it in secrets. I can't access secrets in frontend.
// I'll assume the user needs to paste it here or I can create a function to get it.
// Actually, usually we pass it from the parent or fetch it.
// Let's create a small helper to get the public key if needed, or just ask the user to hardcode it in the component for now if they didn't provide it for frontend.
// Wait, the user set STRIPE_PUBLISHABLE_KEY secret. I can't access it in frontend directly unless I expose it via a function.
// I'll create a function `getStripeConfig` to safe-expose the public key.

const CheckoutForm = ({ amount, planName, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          onSuccess(paymentIntent);
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
            return_url: window.location.href,
        },
        redirect: 'if_required'
    });

    const { error, paymentIntent, setupIntent } = result;

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred.");
      }
      setIsLoading(false);
    } else if (
        (paymentIntent && paymentIntent.status === "succeeded") || 
        (setupIntent && setupIntent.status === "succeeded")
    ) {
       setMessage("Success!");
       onSuccess(paymentIntent || setupIntent);
       setIsLoading(false);
    } else {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
        <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600">Plan</span>
            <span className="font-semibold text-gray-900">{planName}</span>
        </div>
        <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span>${amount}</span>
        </div>
      </div>

      <PaymentElement id="payment-element" options={{layout: "tabs"}} />
      
      {message && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              {message}
          </div>
      )}

      <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
          </Button>
          <Button 
            disabled={isLoading || !stripe || !elements} 
            id="submit" 
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <Lock className="mr-2 h-4 w-4" />
                    Pay Now
                </>
            )}
          </Button>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <Lock size={10} /> Secured by Stripe
        </p>
      </div>
    </form>
  );
};

export default function StripePaymentModal({ isOpen, onClose, clientSecret, amount, planName, onSuccess, stripePublicKey }) {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    if (stripePublicKey) {
        setStripePromise(loadStripe(stripePublicKey));
    }
  }, [stripePublicKey]);

  if (!isOpen || !clientSecret || !stripePromise) return null;

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#7c3aed',
    },
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                <h2 className="text-xl font-bold mb-6 text-center">Complete Payment</h2>
                <Elements options={options} stripe={stripePromise}>
                    <CheckoutForm 
                        amount={amount} 
                        planName={planName} 
                        onSuccess={onSuccess} 
                        onCancel={onClose}
                    />
                </Elements>
            </div>
        </div>
    </div>
  );
}