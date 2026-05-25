'use client';

import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { format } from 'date-fns';
import { Package, ArrowRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending:    'badge-yellow',
  confirmed:  'badge-blue',
  processing: 'badge-blue',
  shipped:    'badge-green',
  delivered:  'badge-green',
  cancelled:  'badge-red',
  refunded:   'badge-gray',
  failed:     'badge-red',
};

export default function OrdersPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.list().then((r) => r.data.data),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container-max py-24 text-center">
        <p className="text-gray-500 mb-4">Please log in to view your orders.</p>
        <Link href="/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  return (
    <div className="container-max py-10">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-5 bg-gray-200 rounded w-20" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mt-3" />
            </div>
          ))}
        </div>
      ) : data?.orders?.length === 0 ? (
        <div className="text-center py-24">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No orders yet</h3>
          <p className="text-gray-500 mb-6">Your order history will appear here.</p>
          <Link href="/products" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.orders?.map((order: any) => (
            <Link key={order._id} href={`/orders/${order._id}`} className="card p-6 block hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
                    <span className={statusColors[order.status] || 'badge-gray'}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''} ·
                    Ordered {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {order.items.map((i: any) => i.name).join(', ').slice(0, 60)}…
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${order.total.toFixed(2)}</p>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-auto mt-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
