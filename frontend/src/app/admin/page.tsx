'use client';

import { useQuery } from '@tanstack/react-query';
import { orderApi, productApi } from '@/lib/api';
import {
  ShoppingCart, DollarSign, Package, Users,
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle,
} from 'lucide-react';

function StatCard({
  title, value, subtitle, icon: Icon, trend, color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: orderStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-order-stats'],
    queryFn: () => orderApi.stats().then((r) => r.data.data),
    refetchInterval: 30000, // refresh every 30s
  });

  const { data: productStats } = useQuery({
    queryKey: ['admin-product-stats'],
    queryFn: () => productApi.list({ limit: 1 }).then((r) => r.data.data),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => orderApi.adminList({ page: 1, limit: 8 }).then((r) => r.data.data),
    refetchInterval: 15000,
  });

  const statusColors: Record<string, string> = {
    pending:    'badge-yellow',
    confirmed:  'badge-blue',
    processing: 'badge-blue',
    shipped:    'badge-green',
    delivered:  'badge-green',
    cancelled:  'badge-red',
    failed:     'badge-red',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here's what's happening with your store.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={orderStats ? `$${orderStats.totalRevenue?.toFixed(0) || 0}` : '—'}
          subtitle="All time"
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard
          title="Total Orders"
          value={orderStats?.totalOrders || '—'}
          subtitle={`${orderStats?.todayOrders || 0} today`}
          icon={ShoppingCart}
          color="bg-blue-500"
        />
        <StatCard
          title="Pending Orders"
          value={orderStats?.pendingOrders || '—'}
          subtitle="Requires attention"
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="This Month"
          value={orderStats?.monthOrders || '—'}
          subtitle="Orders this month"
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {/* Order status breakdown */}
      {orderStats?.statusBreakdown && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Order Status Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(orderStats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count as number}</p>
                <span className={statusColors[status] || 'badge-gray'}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Recent Orders</h2>
          <a href="/admin/orders" className="text-sm text-blue-600 hover:underline">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                <th className="px-6 py-3 text-left">Order</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders?.orders?.map((order: any) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <a href={`/admin/orders/${order._id}`} className="font-medium text-blue-600 hover:underline">
                      {order.orderNumber}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{order.items.length}</td>
                  <td className="px-6 py-4 text-right font-bold">${order.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={statusColors[order.status] || 'badge-gray'}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={order.paymentStatus === 'paid' ? 'badge-green' : 'badge-yellow'}>
                      {order.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recentOrders?.orders?.length && (
            <div className="text-center py-12 text-gray-400">No orders yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
