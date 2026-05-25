'use client';

import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productApi.featured().then((r) => r.data.data.products),
  });

  return (
    <section className="container-max py-16">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          <p className="text-gray-500 mt-1">Handpicked just for you</p>
        </div>
        <Link href="/products" className="flex items-center gap-1 text-blue-600 font-medium hover:gap-2 transition-all">
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : data?.slice(0, 8).map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))
        }
      </div>
    </section>
  );
}
