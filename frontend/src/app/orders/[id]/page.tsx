'use client';

import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/lib/api';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { CheckCircle, Package, Truck, MapPin, CreditCard, Clock } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

function OrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.get(id).then((r) => r.data.data.order),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="container-max py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!order) return <div className="container-max py-24 text-center text-gray-500">Order not found.</div>;

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="container-max py-10">
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900 text-lg">Payment Successful! 🎉</p>
            <p className="text-green-700">Your order has been confirmed. We'll email you when it ships.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-gray-500 mt-1">Placed {format(new Date(order.createdAt), 'MMMM d, yyyy \'at\' h:mm a')}</p>
        </div>
        <span className={`badge text-sm px-3 py-1.5 ${
          order.status === 'delivered' ? 'badge-green' :
          order.status === 'cancelled' ? 'badge-red' :
          order.status === 'shipped' ? 'badge-green' : 'badge-blue'
        }`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Progress tracker */}
      {currentStep >= 0 && order.status !== 'cancelled' && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-6">Order Progress</h2>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-green-500 z-0 transition-all duration-500"
              style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  i <= currentStep
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}>
                  {i <= currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
                </div>
                <p className={`text-xs mt-2 font-medium ${i <= currentStep ? 'text-green-600' : 'text-gray-400'}`}>
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" /> Items ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-2xl">🛍️</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.slug || ''}`} className="font-medium hover:text-blue-600">
                      {item.name}
                    </Link>
                    {item.variant && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.variant.name}: {item.variant.value}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping address */}
          {order.shippingAddress && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Shipping Address
              </h2>
              <p className="text-gray-700">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                {order.shippingAddress.street}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                {order.shippingAddress.country}
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>${order.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span>{order.shippingCost === 0 ? 'Free' : `$${order.shippingCost?.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span>${order.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${order.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Payment
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Status</span>
              <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Status history */}
          {order.statusHistory?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" /> History
              </h2>
              <div className="space-y-3">
                {order.statusHistory.slice().reverse().map((h: any, i: number) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{h.status}</p>
                      {h.message && <p className="text-gray-500 text-xs">{h.message}</p>}
                      <p className="text-gray-400 text-xs">{format(new Date(h.timestamp), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link href="/orders" className="w-full btn-secondary block text-center">
            ← Back to Orders
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return <Suspense><OrderDetailContent /></Suspense>;
}
