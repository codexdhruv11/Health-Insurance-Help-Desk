import { Card, CardContent } from "@/components/ui/card"
import { Shield, Heart, Clock, BadgeIndianRupee } from "lucide-react"

const features = [
  {
    name: "Comprehensive Coverage",
    description: "Get coverage for pre and post hospitalization expenses, including medicines and check-ups",
    icon: Shield,
  },
  {
    name: "Cashless Treatment",
    description: "Access our network of 10,000+ hospitals for hassle-free cashless treatment",
    icon: BadgeIndianRupee,
  },
  {
    name: "24/7 Support",
    description: "Round-the-clock assistance for claims and emergencies",
    icon: Clock,
  },
  {
    name: "Family Coverage",
    description: "Protect your entire family under a single policy with additional benefits",
    icon: Heart,
  },
]

export function FeaturesSection() {
  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Why Choose Our Health Insurance?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Get the best coverage with premium benefits and hassle-free claims
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.name} className="border-2 hover:border-blue-500 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-center">
                    <feature.icon className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="mt-4 text-xl font-medium text-gray-900 text-center">
                    {feature.name}
                  </h3>
                  <p className="mt-2 text-base text-gray-500 text-center">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 