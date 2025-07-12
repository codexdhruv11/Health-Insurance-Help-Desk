import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function PublicDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Health Insurance Help Desk</h1>
        <p className="text-xl text-gray-600 mb-8">Find the perfect health insurance plan for you and your family</p>
        <div className="flex justify-center gap-4">
          <Link href="/quote">
            <Button size="lg">Get a Quote</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline">Sign Up</Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Compare Plans</CardTitle>
            <CardDescription>Compare different insurance plans side by side</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Make informed decisions by comparing benefits, premiums, and coverage across multiple plans.
            </p>
            <Link href="/compare">
              <Button variant="secondary" className="w-full">Compare Now</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Find Hospitals</CardTitle>
            <CardDescription>Locate network hospitals near you</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Search our extensive network of hospitals and healthcare providers.
            </p>
            <Link href="/hospitals">
              <Button variant="secondary" className="w-full">Search Hospitals</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expert Support</CardTitle>
            <CardDescription>Get help from insurance experts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Our team of experts is here to help you choose the right insurance plan.
            </p>
            <Link href="/auth/register">
              <Button variant="secondary" className="w-full">Get Started</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Why Choose Us?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Easy Comparison</h3>
              <p className="text-gray-600">Compare multiple insurance plans side by side to find the best fit.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Instant Quotes</h3>
              <p className="text-gray-600">Get personalized insurance quotes in minutes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-gray-600 mb-6">Create an account to save your quotes and manage your insurance plans.</p>
        <Link href="/auth/register">
          <Button size="lg">Create Free Account</Button>
        </Link>
      </div>
    </div>
  )
} 