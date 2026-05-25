import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
      </div>

      <div className="container-max relative z-10 py-20 md:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            New arrivals every week
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Shop Smarter,
            <br />
            <span className="text-yellow-300">Live Better.</span>
          </h1>

          <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
            Discover thousands of products at unbeatable prices. Free shipping on orders over $50.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold px-8 py-4 rounded-xl hover:bg-yellow-300 hover:text-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ShoppingBag className="w-5 h-5" />
              Shop Now
            </Link>
            <Link
              href="/products?featured=true"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              View Featured
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 mt-14">
            {[
              { value: '50k+', label: 'Products' },
              { value: '200k+', label: 'Happy Customers' },
              { value: '4.9★', label: 'Average Rating' },
              { value: '24/7', label: 'Support' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-blue-200 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
