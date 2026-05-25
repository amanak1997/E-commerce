'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { paymentApi, orderApi } from '@/lib/api';
import {
  useStripe, useElements, PaymentElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Lock, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ clientSecret, orderId }: { clientSecret: string; orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}?payment=success`,
        },
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else {
        clearCart();
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-green-600" />
          Secure Payment
        </h3>
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full btn-primary btn-lg gap-2"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Complete Order
          </>
        )}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const { items, subtotal, total, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [address, setAddress] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName || '',
    street: '', city: '', state: '', zipCode: '', country: 'US', phone: '',
  });

  const sub = subtotal();
  const tot = total();
  const shipping = sub >= 50 ? 0 : 9.99;
  const tax = Math.round(sub * 0.08 * 100) / 100;

  if (!isAuthenticated) {
    return (
      <div className="container-max py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Please log in to checkout</h2>
        <p className="text-gray-500 mb-6">Create an account or login to complete your purchase.</p>
        <Link href="/login?redirect=/checkout" className="btn-primary">Login to Continue</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-max py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <Link href="/products" className="btn-primary">Start Shopping</Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    try {
      // 1. Create order
      const { data: orderData } = await orderApi.create({
        items: items.map((i) => ({
          product: i.id,
          name:    i.name,
          price:   i.price,
          quantity:i.quantity,
          image:   i.image,
          slug:    i.slug,
          variant: i.variant,
        })),
        shippingAddress: address,
      });

      const createdOrderId = orderData.data.order._id;
      setOrderId(createdOrderId);

      // 2. Create Stripe PaymentIntent
      const { data: piData } = await paymentApi.createIntent({ orderId: createdOrderId });
      setClientSecret(piData.data.clientSecret);
      setStep('payment');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-max py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Left — form */}
        <div className="lg:col-span-2 space-y-6">
          {step === 'details' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-lg">Shipping Address</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ['firstName', 'First Name'],
                  ['lastName', 'Last Name'],
                  ['street', 'Street Address'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['zipCode', 'ZIP Code'],
                  ['phone', 'Phone'],
                ].map(([key, label]) => (
                  <div key={key} className={key === 'street' ? 'sm:col-span-2' : ''}>
                    <label className="label">{label}</label>
                    <input
                      type="text"
                      value={(address as any)[key]}
                      onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                      className="input"
                      required={key !== 'phone'}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isLoading}
                className="w-full btn-primary btn-lg mt-4"
              >
                {isLoading ? 'Creating Order…' : 'Continue to Payment →'}
              </button>
            </div>
          )}

          {step === 'payment' && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm clientSecret={clientSecret} orderId={orderId} />
            </Elements>
          )}
        </div>

        {/* Right — order summary */}
        <div>
          <div className="card p-6 sticky top-20">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={`${item.id}:${item.variant?.value}`} className="flex items-center gap-3">
                  <div className="relative w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">🛍️</div>
                    )}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.variant && (
                      <p className="text-xs text-gray-400">{item.variant.value}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${sub.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${tot.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <Lock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              Your payment information is secure and encrypted.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
