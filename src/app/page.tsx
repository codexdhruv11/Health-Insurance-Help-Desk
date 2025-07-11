import { MainNav } from "@/components/layout/MainNav"
import { HeroSection } from "@/components/sections/HeroSection"
import { FeaturesSection } from "@/components/sections/FeaturesSection"
import { PlansSection } from "@/components/sections/PlansSection"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col" suppressHydrationWarning>
      <MainNav />
      <main className="flex-1" suppressHydrationWarning>
        <HeroSection />
        <FeaturesSection />
        <PlansSection />
      </main>
    </div>
  )
} 