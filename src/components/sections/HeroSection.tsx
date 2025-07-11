import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export function HeroSection() {
  return (
    <div className="relative bg-blue-600 py-20">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-90" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Find the Perfect Health Insurance Plan
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-gray-100 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
            Compare plans from top insurers and get the best coverage for you and your family
          </p>
        </div>
        
        <div className="mt-10">
          <Card className="mx-auto max-w-2xl">
            <CardContent className="p-6">
              <form className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
                <Input
                  className="flex-grow"
                  type="text"
                  placeholder="Enter your city"
                />
                <Input
                  className="flex-grow"
                  type="number"
                  placeholder="Enter your age"
                />
                <Button type="submit" size="lg">
                  Get Quotes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 