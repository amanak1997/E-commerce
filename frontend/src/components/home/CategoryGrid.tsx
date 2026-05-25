'use client';

import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

export function CategoryGrid() {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories().then((r) => r.data.data.categories),
    staleTime: 1000 * 60 * 60,
  });

  const categories = data?.slice(0, 6) || [];

  // Fallback categories with gradient backgrounds
  const fallbackColors = [
    'from-pink-400 to-rose-600',
    'from-violet-400 to-purple-600',
    'from-cyan-400 to-blue-600',
    'from-amber-400 to-orange-600',
    'from-emerald-400 to-green-600',
    'from-indigo-400 to-blue-600',
  ];

  return (
    <section className="container-max py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
        <p className="text-gray-500 mt-1">Find exactly what you're looking for</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.length > 0
          ? categories.map((cat: any, i: number) => (
              <Link
                key={cat._id}
                href={`/products?category=${cat._id}`}
                className="group text-center"
              >
                <div className={`relative w-full aspect-square rounded-2xl bg-gradient-to-br ${fallbackColors[i % fallbackColors.length]} mb-3 overflow-hidden shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105`}>
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} fill className="object-cover opacity-80" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-4xl">🛍️</div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </p>
              </Link>
            ))
          : Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="text-center">
                <div className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${fallbackColors[i]} mb-3 flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:scale-105`}>
                  <span className="text-4xl">
                    {['👔', '📱', '🏠', '🎮', '💄', '📚'][i]}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {['Fashion', 'Electronics', 'Home', 'Gaming', 'Beauty', 'Books'][i]}
                </p>
              </div>
            ))
        }
      </div>
    </section>
  );
}
