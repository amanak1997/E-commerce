'use client';

import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

export function CartDrawer() {
  const { isOpen, closeCart, items, updateQuantity, removeItem, subtotal, total } = useCartStore();

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeCart]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sub = subtotal();
  const tot = total();
  const shipping = sub >= 50 ? 0 : 9.99;
  const tax = Math.round(sub * 0.08 * 100) / 100;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg">Shopping Cart</h2>
            {items.length > 0 && (
              <span className="badge-blue">{items.reduce((s, i) => s + i.quantity, 0)}</span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Your cart is empty</p>
              <button onClick={closeCart} className="btn-primary btn-sm">
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}:${item.variant?.value}`} className="flex gap-4 py-4 border-b border-gray-50 last:border-0">
                <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-2xl">🛍️</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeCart}
                    className="font-medium text-sm text-gray-900 hover:text-blue-600 line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  {item.variant && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.variant.name}: {item.variant.value}
                    </p>
                  )}
                  <p className="font-bold text-blue-600 mt-1">${(item.price * item.quantity).toFixed(2)}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant?.value)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant?.value)}
                        disabled={item.quantity >= item.stock}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-r-lg disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id, item.variant?.value)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer summary */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-6 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${sub.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${tot.toFixed(2)}</span>
              </div>
            </div>

            {sub < 50 && (
              <p className="text-xs text-center text-gray-500 bg-yellow-50 rounded-lg p-2">
                Add ${(50 - sub).toFixed(2)} more for free shipping! 🚚
              </p>
            )}

            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              Checkout <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={closeCart}
              className="w-full btn-secondary btn-sm text-center"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
