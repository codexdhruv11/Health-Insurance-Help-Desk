import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Basic Health Plan",
    price: "599",
    features: [
      "₹3 Lakhs Coverage",
      "Cashless Treatment",
      "Room Rent Covered",
      "Pre-existing Disease Cover after 2 years",
      "No Claim Bonus"
    ],
    popular: false
  },
  {
    name: "Family Floater",
    price: "999",
    features: [
      "₹5 Lakhs Coverage",
      "Cashless Treatment",
      "Room Rent Covered",
      "Pre-existing Disease Cover after 1 year",
      "No Claim Bonus",
      "Maternity Cover",
      "Child Care Benefits"
    ],
    popular: true
  },
  {
    name: "Premium Health",
    price: "1499",
    features: [
      "₹10 Lakhs Coverage",
      "Cashless Treatment",
      "Premium Room",
      "Pre-existing Disease Cover",
      "Enhanced No Claim Bonus",
      "Maternity Cover",
      "International Treatment",
      "Alternative Treatment"
    ],
    popular: false
  }
]

export function PlansSection() {
  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Choose Your Health Insurance Plan
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Select from our range of comprehensive health insurance plans
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={cn(
                  "relative",
                  plan.popular && "border-2 border-blue-500"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold text-white text-center">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline justify-center">
                      <span className="text-4xl font-bold tracking-tight">₹{plan.price}</span>
                      <span className="ml-1 text-xl text-gray-500">/month</span>
                    </div>
                  </div>
                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500" />
                        <span className="ml-3 text-base text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                      Get Started
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 