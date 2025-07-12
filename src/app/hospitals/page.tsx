'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Hospital {
  id: string;
  name: string;
  address: any;
  location: any;
  specialties: string[];
  facilities: string[];
  emergencyServices: boolean;
  rating: number;
  networkPlans: Array<{
    planId: string;
    planName: string;
    insurerId: string;
    insurerName: string;
    cashless: boolean;
  }>;
}

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    specialty: '',
    cashless: false,
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.city) params.append('city', filters.city);
      if (filters.specialty) params.append('specialties', JSON.stringify([filters.specialty]));
      if (filters.cashless) params.append('cashless', 'true');

      const response = await fetch(`/api/hospitals?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setHospitals(data.hospitals || []);
      } else {
        setError('Failed to fetch hospitals');
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      setError('Error fetching hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchHospitals();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading hospitals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Network Hospitals</h1>
      
      {/* Search and Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Hospitals</CardTitle>
          <CardDescription>Find hospitals in our network</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search hospitals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Input
                placeholder="City"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              />
              <Input
                placeholder="Specialty"
                value={filters.specialty}
                onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
              />
              <Button type="submit">Search</Button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cashless"
                checked={filters.cashless}
                onChange={(e) => setFilters({ ...filters, cashless: e.target.checked })}
              />
              <label htmlFor="cashless" className="text-sm">Cashless only</label>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Hospitals Grid */}
      <div className="grid gap-6">
        {hospitals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hospitals found. Try adjusting your search criteria.</p>
          </div>
        ) : (
          hospitals.map((hospital) => (
            <Card key={hospital.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{hospital.name}</CardTitle>
                    <CardDescription>
                      {hospital.address?.city}, {hospital.address?.state}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">⭐ {hospital.rating || 'N/A'}</div>
                    {hospital.emergencyServices && (
                      <Badge variant="destructive" className="mt-1">
                        Emergency Services
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Specialties */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Specialties:</h4>
                  <div className="flex flex-wrap gap-2">
                    {hospital.specialties.slice(0, 5).map((specialty, index) => (
                      <Badge key={index} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                    {hospital.specialties.length > 5 && (
                      <Badge variant="outline">
                        +{hospital.specialties.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Facilities */}
                {hospital.facilities && hospital.facilities.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Facilities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {hospital.facilities.slice(0, 3).map((facility, index) => (
                        <Badge key={index} variant="outline">
                          {facility}
                        </Badge>
                      ))}
                      {hospital.facilities.length > 3 && (
                        <Badge variant="outline">
                          +{hospital.facilities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Network Plans */}
                {hospital.networkPlans && hospital.networkPlans.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Available Plans:</h4>
                    <div className="space-y-2">
                      {hospital.networkPlans.slice(0, 3).map((plan, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{plan.planName}</span>
                            <span className="text-sm text-gray-600 ml-2">by {plan.insurerName}</span>
                          </div>
                          {plan.cashless && (
                            <Badge variant="outline" className="text-green-600">
                              Cashless
                            </Badge>
                          )}
                        </div>
                      ))}
                      {hospital.networkPlans.length > 3 && (
                        <div className="text-sm text-gray-600">
                          +{hospital.networkPlans.length - 3} more plans available
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
