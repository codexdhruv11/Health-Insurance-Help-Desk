import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteForm } from '@/components/ui/quote-form';
import { vi } from 'vitest';

describe('QuoteForm', () => {
  const mockOnSubmit = vi.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields correctly', () => {
    render(<QuoteForm {...defaultProps} />);

    // Personal Information
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();

    // Location
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pincode/i)).toBeInTheDocument();

    // Medical Conditions
    expect(screen.getByText(/medical conditions/i)).toBeInTheDocument();

    // Family Members
    expect(screen.getByText(/add family member/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    render(<QuoteForm {...defaultProps} />);
    const user = userEvent.setup();

    // Fill personal information
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/age/i), '30');
    await user.click(screen.getByLabelText(/gender/i));
    await user.click(screen.getByText('Male'));
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');

    // Fill location
    await user.type(screen.getByLabelText(/city/i), 'New York');
    await user.type(screen.getByLabelText(/state/i), 'NY');
    await user.type(screen.getByLabelText(/pincode/i), '100001');

    // Select medical conditions
    await user.click(screen.getByText('Diabetes Type 2'));
    await user.click(screen.getByText('High Blood Pressure'));

    // Submit form
    await user.click(screen.getByRole('button', { name: /get quotes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        gender: 'Male',
        email: 'john@example.com',
        phone: '1234567890',
        location: {
          city: 'New York',
          state: 'NY',
          pincode: '100001',
        },
        medicalConditions: ['Diabetes Type 2', 'High Blood Pressure'],
        familyMembers: [],
      });
    });
  });

  it('shows validation errors for invalid data', async () => {
    render(<QuoteForm {...defaultProps} />);
    const user = userEvent.setup();

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /get quotes/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/age must be at least 18/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/phone number must be at least 10 digits/i)).toBeInTheDocument();
      expect(screen.getByText(/city is required/i)).toBeInTheDocument();
      expect(screen.getByText(/state is required/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid pincode/i)).toBeInTheDocument();
    });
  });

  it('handles adding and removing family members', async () => {
    render(<QuoteForm {...defaultProps} />);
    const user = userEvent.setup();

    // Add family member
    await user.click(screen.getByText(/add family member/i));

    // Fill family member details
    await user.type(screen.getByLabelText(/family member first name/i), 'Jane');
    await user.type(screen.getByLabelText(/family member last name/i), 'Doe');
    await user.type(screen.getByLabelText(/family member age/i), '25');
    await user.click(screen.getByLabelText(/family member gender/i));
    await user.click(screen.getByText('Female'));
    await user.click(screen.getByLabelText(/family member relationship/i));
    await user.click(screen.getByText('Spouse'));

    // Select medical conditions for family member
    await user.click(screen.getByText('Asthma'));

    // Mark as nominee
    await user.click(screen.getByLabelText(/mark as nominee/i));

    // Fill rest of the form
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/age/i), '30');
    await user.click(screen.getByLabelText(/gender/i));
    await user.click(screen.getByText('Male'));
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.type(screen.getByLabelText(/city/i), 'New York');
    await user.type(screen.getByLabelText(/state/i), 'NY');
    await user.type(screen.getByLabelText(/pincode/i), '100001');

    // Submit form
    await user.click(screen.getByRole('button', { name: /get quotes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        familyMembers: [{
          firstName: 'Jane',
          lastName: 'Doe',
          age: 25,
          gender: 'Female',
          relationship: 'Spouse',
          medicalConditions: ['Asthma'],
          isNominee: true,
        }],
      }));
    });

    // Remove family member
    await user.click(screen.getByRole('button', { name: /remove family member/i }));

    expect(screen.queryByText('Jane')).not.toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    render(<QuoteForm {...defaultProps} loading={true} />);

    expect(screen.getByRole('button', { name: /get quotes/i })).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('pre-fills form with default values', () => {
    const defaultValues = {
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      gender: 'Male',
      email: 'john@example.com',
      phone: '1234567890',
      location: {
        city: 'New York',
        state: 'NY',
        pincode: '100001',
      },
      medicalConditions: ['Diabetes Type 2'],
      familyMembers: [{
        firstName: 'Jane',
        lastName: 'Doe',
        age: 25,
        gender: 'Female',
        relationship: 'Spouse',
        medicalConditions: ['Asthma'],
        isNominee: true,
      }],
    };

    render(<QuoteForm {...defaultProps} defaultValues={defaultValues} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/age/i)).toHaveValue(30);
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('1234567890');
    expect(screen.getByLabelText(/city/i)).toHaveValue('New York');
    expect(screen.getByLabelText(/state/i)).toHaveValue('NY');
    expect(screen.getByLabelText(/pincode/i)).toHaveValue('100001');

    // Check family member
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Spouse')).toBeInTheDocument();
  });
}); 