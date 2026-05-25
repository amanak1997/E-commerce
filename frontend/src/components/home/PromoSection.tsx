import Link from 'next/link';

export function PromoSection() {
  return (
    <section className="container-max py-16">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Big sale banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-8 md:p-10">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <p className="text-rose-100 text-sm font-medium mb-2">Limited Time</p>
          <h3 className="text-white text-3xl font-bold mb-3">Up to 60% Off</h3>
          <p className="text-rose-100 mb-6">Summer clearance sale on selected items</p>
          <Link href="/products?category=sale" className="inline-flex items-center bg-white text-rose-600 font-semibold px-6 py-3 rounded-xl hover:bg-rose-50 transition-colors">
            Shop Sale
          </Link>
        </div>

        {/* New arrivals */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-8 md:p-10">
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <p className="text-violet-100 text-sm font-medium mb-2">Just Arrived</p>
          <h3 className="text-white text-3xl font-bold mb-3">New Collection</h3>
          <p className="text-violet-100 mb-6">Explore the latest trends and styles</p>
          <Link href="/products?sort=createdAt&order=desc" className="inline-flex items-center bg-white text-violet-600 font-semibold px-6 py-3 rounded-xl hover:bg-violet-50 transition-colors">
            Explore New
          </Link>
        </div>
      </div>
    </section>
  );
}
