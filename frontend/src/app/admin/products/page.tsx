'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: () => productApi.list({ page, limit: 20, search }).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Failed to delete product'),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary btn-sm gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input pl-10"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
              <th className="px-6 py-3 text-left">Product</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-right">Price</th>
              <th className="px-6 py-3 text-right">Stock</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  </tr>
                ))
              : data?.products?.map((product: any) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.url ? (
                            <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-lg">🛍️</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.sku || product._id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{product.category?.name || '—'}</td>
                    <td className="px-6 py-4 text-right font-medium">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={product.stock <= 5 ? 'text-red-500 font-medium' : 'text-gray-700'}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={product.isActive ? 'badge-green' : 'badge-gray'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/products/${product.slug}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/products/${product._id}/edit`} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('Delete this product?'))
                              deleteMutation.mutate(product._id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {!isLoading && !data?.products?.length && (
          <div className="text-center py-12 text-gray-400">No products found</div>
        )}
      </div>

      {/* Pagination */}
      {data?.pages > 1 && (
        <div className="flex justify-end gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm disabled:opacity-40">Previous</button>
          <span className="flex items-center px-4 text-sm text-gray-600">Page {page} of {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
