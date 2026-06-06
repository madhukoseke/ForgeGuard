import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import ProductSection from "@/components/landing/ProductSection";
import FaqSection from "@/components/landing/FaqSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <HeroSection />
        <ProductSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
