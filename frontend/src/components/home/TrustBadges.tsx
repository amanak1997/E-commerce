import { Truck, RotateCcw, ShieldCheck, Headphones } from 'lucide-react';

const badges = [
  { icon: Truck,       title: 'Free Shipping',     desc: 'On orders over $50'    },
  { icon: RotateCcw,   title: '30-Day Returns',     desc: 'Hassle-free returns'   },
  { icon: ShieldCheck, title: 'Secure Payment',     desc: 'SSL protected checkout' },
  { icon: Headphones,  title: '24/7 Support',       desc: 'Always here to help'   },
];

export function TrustBadges() {
  return (
    <section className="bg-white border-y border-gray-100">
      <div className="container-max py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-gray-500 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
