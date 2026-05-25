'use client';

import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { ShoppingCart, Star, Shield, Truck, RotateCcw, Plus, Minus, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.get(slug).then((r) => r.data.data.product),
  });

  if (isLoading) {
    return (
      <div className="container-max py-12">
        <div className="animate-pulse grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-max py-24 text-center">
        <p className="text-gray-500 text-xl">Product not found.</p>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem({
      id: product._id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      image: product.images?.[0]?.url || '',
      slug: product.slug,
      stock: product.stock,
      quantity,
      variant: selectedVariant ? { name: selectedVariant.name, value: selectedVariant.value } : undefined,
    });
    toast.success('Added to cart!');
  };

  const effectivePrice = selectedVariant?.price || product.price;
  const discount = product.comparePrice && product.comparePrice > effectivePrice
    ? Math.round(((product.comparePrice - effectivePrice) / product.comparePrice) * 100)
    : 0;

  return (
    <div className="container-max py-12">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Image gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
            {product.images?.[selectedImage]?.url ? (
              <Image
                src={product.images[selectedImage].url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-8xl">🛍️</div>
            )}
            {discount > 0 && (
              <span className="absolute top-4 left-4 badge bg-red-500 text-white text-sm px-3 py-1">
                -{discount}%
              </span>
            )}
          </div>

          {product.images?.length > 1 && (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {product.images.map((img: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-6">
          {product.category && (
            <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">{product.category.name}</p>
          )}

          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="font-semibold">{product.rating}</span>
              <span className="text-gray-400">({product.reviewCount} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-gray-900">${effectivePrice.toFixed(2)}</span>
            {product.comparePrice && product.comparePrice > effectivePrice && (
              <>
                <span className="text-xl text-gray-400 line-through">${product.comparePrice.toFixed(2)}</span>
                <span className="badge bg-red-100 text-red-700 text-sm">Save ${(product.comparePrice - effectivePrice).toFixed(2)}</span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div>
              <p className="font-semibold mb-2">{product.variants[0].name}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v: any) => (
                  <button
                    key={v._id}
                    onClick={() => setSelectedVariant(v)}
                    disabled={v.stock === 0}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      selectedVariant?._id === v._id
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex gap-4">
            <div className="flex items-center border-2 border-gray-200 rounded-xl">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-l-xl"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
                className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-r-xl disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 btn-primary gap-2 text-base"
            >
              <ShoppingCart className="w-5 h-5" />
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>

            <button className="w-12 h-12 flex items-center justify-center border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-all">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          {/* Stock indicator */}
          {product.stock > 0 && product.stock <= 10 && (
            <p className="text-orange-500 text-sm font-medium">⚡ Only {product.stock} left in stock!</p>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            {[
              { icon: Truck,       text: 'Free shipping over $50' },
              { icon: RotateCcw,   text: '30-day easy returns'    },
              { icon: Shield,      text: 'Secure checkout'         },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center text-center gap-1.5">
                <Icon className="w-5 h-5 text-blue-600" />
                <p className="text-xs text-gray-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      {product.reviews?.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <div className="space-y-4">
            {product.reviews.slice(0, 5).map((review: any) => (
              <div key={review._id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{review.name}</p>
                    <div className="flex mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && <p className="text-gray-600 text-sm">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
