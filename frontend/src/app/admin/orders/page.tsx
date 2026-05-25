'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/lib/api';
import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'];

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

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, status],
    queryFn: () => orderApi.adminList({ page, limit: 20, search, status }).then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, message }: any) =>
      orderApi.adminUpdate(id, { status, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search order #…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10 max-w-xs"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input max-w-[160px]"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
              <th className="px-6 py-3 text-left">Order #</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Items</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Payment</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </td>
                  </tr>
                ))
              : data?.orders?.map((order: any) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-blue-600">{order.orderNumber}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(order.createdAt), 'MMM d, yy')}
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
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setSelectedOrder(order); setNewStatus(order.status); }}
                        className="text-xs btn-secondary btn-sm"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {!isLoading && !data?.orders?.length && (
          <div className="text-center py-12 text-gray-400">No orders found</div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Update Order {selectedOrder.orderNumber}</h3>

            <div className="space-y-4">
              <div>
                <label className="label">New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Message (optional)</label>
                <input type="text" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} className="input" placeholder="e.g. Tracking #123456" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => updateStatusMutation.mutate({ id: selectedOrder._id, status: newStatus, message: statusMessage })}
                disabled={updateStatusMutation.isPending}
                className="flex-1 btn-primary"
              >
                {updateStatusMutation.isPending ? 'Saving…' : 'Update Status'}
              </button>
              <button onClick={() => setSelectedOrder(null)} className="flex-1 btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {data?.pages > 1 && (
        <div className="flex justify-end gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm disabled:opacity-40">Prev</button>
          <span className="flex items-center px-4 text-sm">{page} / {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
