import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export function HeroSection() {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-blue-100/20">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Find the Perfect Health Insurance Plan
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Compare plans from top insurers and get the best coverage for you and your family
          </p>
          <Card className="mt-8 shadow-lg">
            <CardContent className="p-6">
              <form className="flex flex-col gap-4 md:flex-row md:gap-6">
                <Input
                  type="text"
                  placeholder="Enter your city"
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Enter your age"
                  className="flex-1"
                />
                <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Get Quotes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="flex flex-col gap-4 rounded-2xl bg-white/60 p-8 ring-1 ring-gray-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Comprehensive Coverage</h3>
                <p className="text-sm text-gray-600">Get coverage for pre and post hospitalization expenses, including medicines and check-ups</p>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl bg-white/60 p-8 ring-1 ring-gray-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Cashless Treatment</h3>
                <p className="text-sm text-gray-600">Access our network of 10,000+ hospitals for hassle-free cashless treatment</p>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl bg-white/60 p-8 ring-1 ring-gray-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Quick Claims</h3>
                <p className="text-sm text-gray-600">Fast and efficient claims processing with minimal documentation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 