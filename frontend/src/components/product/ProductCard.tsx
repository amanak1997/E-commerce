'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  images: { url: string; alt: string }[];
  rating: number;
  reviewCount: number;
  stock: number;
  discountPct?: number;
  isFeatured?: boolean;
  category?: { name: string };
}

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;

    addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url || '/placeholder.png',
      slug: product.slug,
      stock: product.stock,
    });
    toast.success(`${product.name} added to cart!`);
  };

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`} className="group card hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {product.images?.[0]?.url ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl">🛍️</div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge bg-red-500 text-white">-{discount}%</span>
          )}
          {product.isFeatured && (
            <span className="badge bg-yellow-400 text-yellow-900">Featured</span>
          )}
          {product.stock === 0 && (
            <span className="badge bg-gray-800 text-white">Out of Stock</span>
          )}
        </div>

        {/* Quick add */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="absolute bottom-2 right-2 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-600 hover:text-white disabled:opacity-30"
          aria-label="Add to cart"
        >
          <ShoppingCart className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {product.category && (
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{product.category.name}</p>
        )}
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-700">{product.rating}</span>
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-gray-400 line-through">${product.comparePrice.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
