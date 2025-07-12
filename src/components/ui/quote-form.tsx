import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';

const RELATIONSHIPS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Parent-in-law',
  'Other',
] as const;

const MEDICAL_CONDITIONS = [
  'Diabetes Type 1',
  'Diabetes Type 2',
  'Heart Disease',
  'High Blood Pressure',
  'Asthma',
  'Cancer History',
  'Kidney Disease',
  'Liver Disease',
  'Thyroid Disorder',
  'Mental Health Condition',
  'Autoimmune Disease',
  'Obesity',
] as const;

const FamilyMemberSchema = z.object({
  relationship: z.enum(RELATIONSHIPS),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  age: z.number().min(0, 'Age must be positive').max(100, 'Age must be less than 100'),
  gender: z.enum(['Male', 'Female', 'Other']),
  medicalConditions: z.array(z.enum(MEDICAL_CONDITIONS)).optional(),
  isNominee: z.boolean().optional(),
});

const QuoteFormSchema = z.object({
  age: z.number().min(18, 'Age must be at least 18').max(100, 'Age must be less than 100'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  familyMembers: z.array(FamilyMemberSchema).optional(),
  medicalConditions: z.array(z.enum(MEDICAL_CONDITIONS)).optional(),
  location: z.object({
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(6, 'Invalid pincode').max(6, 'Invalid pincode'),
  }),
});

type QuoteFormData = z.infer<typeof QuoteFormSchema>;

interface QuoteFormProps {
  onSubmit: (data: QuoteFormData) => void;
  loading?: boolean;
  defaultValues?: Partial<QuoteFormData>;
}

export function QuoteForm({ onSubmit, loading = false, defaultValues }: QuoteFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(QuoteFormSchema),
    defaultValues: {
      familyMembers: [],
      medicalConditions: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'familyMembers',
  });

  const watchFamilyMembers = watch('familyMembers');
  const hasNominee = watchFamilyMembers?.some(member => member.isNominee);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Tell us about yourself to get accurate quotes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                {...register('age', { valueAsNumber: true })}
                placeholder="Enter your age"
              />
              {errors.age && (
                <p className="text-sm text-red-600">{errors.age.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select {...register('gender')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-red-600">{errors.gender.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Your location helps us find nearby network hospitals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('location.city')}
                placeholder="Enter your city"
              />
              {errors.location?.city && (
                <p className="text-sm text-red-600">{errors.location.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                {...register('location.state')}
                placeholder="Enter your state"
              />
              {errors.location?.state && (
                <p className="text-sm text-red-600">{errors.location.state.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                {...register('location.pincode')}
                placeholder="Enter your pincode"
              />
              {errors.location?.pincode && (
                <p className="text-sm text-red-600">{errors.location.pincode.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical History */}
      <Card>
        <CardHeader>
          <CardTitle>Medical History</CardTitle>
          <CardDescription>
            Select any applicable conditions for accurate pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MEDICAL_CONDITIONS.map((condition) => (
              <label key={condition} className="flex items-center space-x-2">
                <Checkbox
                  value={condition}
                  {...register('medicalConditions')}
                />
                <span className="text-sm">{condition}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle>Family Members</CardTitle>
          <CardDescription>
            Add family members to include them in your coverage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">Family Member {index + 1}</h4>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    {...register(`familyMembers.${index}.firstName`)}
                    placeholder="Enter first name"
                  />
                  {errors.familyMembers?.[index]?.firstName && (
                    <p className="text-sm text-red-600">
                      {errors.familyMembers[index]?.firstName?.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Last Name</Label>
                  <Input
                    {...register(`familyMembers.${index}.lastName`)}
                    placeholder="Enter last name"
                  />
                  {errors.familyMembers?.[index]?.lastName && (
                    <p className="text-sm text-red-600">
                      {errors.familyMembers[index]?.lastName?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
                  <Label>Relationship</Label>
                  <Select {...register(`familyMembers.${index}.relationship`)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {rel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.familyMembers?.[index]?.relationship && (
                    <p className="text-sm text-red-600">
                      {errors.familyMembers[index]?.relationship?.message}
                    </p>
                  )}
      </div>

      <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    {...register(`familyMembers.${index}.age`, { valueAsNumber: true })}
                    placeholder="Enter age"
                  />
                  {errors.familyMembers?.[index]?.age && (
                    <p className="text-sm text-red-600">
                      {errors.familyMembers[index]?.age?.message}
                    </p>
                  )}
      </div>

      <div>
                  <Label>Gender</Label>
                  <Select {...register(`familyMembers.${index}.gender`)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.familyMembers?.[index]?.gender && (
                    <p className="text-sm text-red-600">
                      {errors.familyMembers[index]?.gender?.message}
                    </p>
                  )}
                </div>
      </div>

      <div>
                <Label>Medical Conditions</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {MEDICAL_CONDITIONS.map((condition) => (
                    <label key={condition} className="flex items-center space-x-2">
                      <Checkbox
                        value={condition}
                        {...register(`familyMembers.${index}.medicalConditions`)}
                      />
                      <span className="text-sm">{condition}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  {...register(`familyMembers.${index}.isNominee`)}
                  disabled={hasNominee && !field.isNominee}
                />
                <Label>Set as nominee</Label>
              </div>
      </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({
              firstName: '',
              lastName: '',
              relationship: 'Other',
              age: 0,
              gender: 'Other',
              medicalConditions: [],
              isNominee: false,
            })}
          >
            Add Family Member
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Generating Quotes...' : 'Get Quotes'}
      </Button>
    </form>
  );
}

