'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart,
  Users, Settings, BarChart3, Tag, LogOut,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin',          label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products',   icon: Package },
  { href: '/admin/orders',   label: 'Orders',     icon: ShoppingCart },
  { href: '/admin/users',    label: 'Customers',  icon: Users },
  { href: '/admin/analytics',label: 'Analytics',  icon: BarChart3 },
  { href: '/admin/categories',label: 'Categories', icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
    } else if (!isAuthenticated) {
      router.push('/login?redirect=/admin');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <Package className="w-7 h-7 text-blue-400" />
            MyStore Admin
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center font-bold">
              {user?.firstName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => router.push('/'))}
            className="w-full flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm py-2 px-3 rounded-lg hover:bg-gray-800 transition-all"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
