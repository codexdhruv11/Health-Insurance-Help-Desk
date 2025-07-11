import { MainNav } from "@/components/layout/MainNav"
import { HeroSection } from "@/components/sections/HeroSection"
import { FeaturesSection } from "@/components/sections/FeaturesSection"
import { PlansSection } from "@/components/sections/PlansSection"

export default function Home() {
  return (
    <div className="min-h-screen">
      <MainNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PlansSection />
      </main>
    </div>
  )
} 