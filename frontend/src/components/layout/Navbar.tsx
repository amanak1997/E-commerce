'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCart, Search, User, Menu, X, Package, LogOut, Settings } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { itemCount, toggleCart } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const count = itemCount();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container-max">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Package className="w-7 h-7" />
            <span>MyStore</span>
          </Link>

          {/* Search bar — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none text-sm transition-all"
              />
            </div>
          </form>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/products" className="hover:text-blue-600 transition-colors">Products</Link>
            <Link href="/products?category=sale" className="hover:text-red-500 transition-colors text-red-500">Sale</Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-6">
            {/* Cart button */}
            <button
              onClick={toggleCart}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce-in">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user?.firstName?.[0]?.toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                      <User className="w-4 h-4" /> My Account
                    </Link>
                    <Link href="/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                      <Package className="w-4 h-4" /> My Orders
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-purple-600">
                        <Settings className="w-4 h-4" /> Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="btn-secondary btn-sm text-sm">Login</Link>
                <Link href="/register" className="btn-primary btn-sm text-sm">Sign Up</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-3 animate-fade-in">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm"
              />
            </form>
            <Link href="/products" className="block py-2 text-gray-700 font-medium">Products</Link>
            <Link href="/products?category=sale" className="block py-2 text-red-500 font-medium">Sale</Link>
            {!isAuthenticated && (
              <div className="flex gap-2 pt-2">
                <Link href="/login" className="btn-secondary btn-sm flex-1 text-center">Login</Link>
                <Link href="/register" className="btn-primary btn-sm flex-1 text-center">Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
