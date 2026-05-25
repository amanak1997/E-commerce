import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { PromoSection } from '@/components/home/PromoSection';
import { TrustBadges } from '@/components/home/TrustBadges';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustBadges />
      <CategoryGrid />
      <FeaturedProducts />
      <PromoSection />
    </>
  );
}
