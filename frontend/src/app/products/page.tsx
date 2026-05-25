'use client';

import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState({
    page: 1,
    limit: 24,
    category: searchParams.get('category') || '',
    search:   searchParams.get('search') || '',
    minPrice: '',
    maxPrice: '',
    sort:     'createdAt',
    order:    'desc',
    featured: searchParams.get('featured') || '',
  });

  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productApi.list(filters).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories().then((r) => r.data.data.categories),
    staleTime: Infinity,
  });

  const updateFilter = (key: string, value: string | number) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  return (
    <div className="container-max py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {filters.search ? `Results for "${filters.search}"` : 'All Products'}
          </h1>
          {data && <p className="text-gray-500 mt-1">{data.total} products found</p>}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 btn-secondary btn-sm"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="input max-w-[180px] py-2"
        >
          <option value="">All Categories</option>
          {categories?.map((cat: any) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={`${filters.sort}:${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(':');
            setFilters((f) => ({ ...f, sort, order, page: 1 }));
          }}
          className="input max-w-[180px] py-2"
        >
          <option value="createdAt:desc">Newest First</option>
          <option value="price:asc">Price: Low to High</option>
          <option value="price:desc">Price: High to Low</option>
          <option value="rating:desc">Best Rated</option>
          <option value="soldCount:desc">Best Selling</option>
        </select>

        {/* Price range */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min $"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
            className="input w-24 py-2"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="Max $"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            className="input w-24 py-2"
          />
        </div>

        {/* Clear filters */}
        {(filters.category || filters.minPrice || filters.maxPrice || filters.search) && (
          <button
            onClick={() => setFilters({ page: 1, limit: 24, category: '', search: '', minPrice: '', maxPrice: '', sort: 'createdAt', order: 'desc', featured: '' })}
            className="text-sm text-red-500 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-5">
        {isLoading
          ? Array.from({ length: 24 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : data?.products?.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))
        }
      </div>

      {/* Empty state */}
      {!isLoading && data?.products?.length === 0 && (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your filters or search term.</p>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          <button
            disabled={filters.page === 1}
            onClick={() => updateFilter('page', filters.page - 1)}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(data.pages, 7) }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => updateFilter('page', i + 1)}
              className={`w-10 h-10 rounded-lg font-medium text-sm ${filters.page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={filters.page === data.pages}
            onClick={() => updateFilter('page', filters.page + 1)}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}
