import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteForm } from '@/components/ui/quote-form';
import { jest } from '@jest/globals';

describe('QuoteForm', () => {
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      render(<QuoteForm {...defaultProps} />);
      
      // Submit without filling any fields
      fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/age is required/i)).toBeInTheDocument();
        expect(screen.getByText(/gender is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/city is required/i)).toBeInTheDocument();
        expect(screen.getByText(/state is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate age range', async () => {
      render(<QuoteForm {...defaultProps} />);
      
      // Try invalid age
      await userEvent.type(screen.getByLabelText(/age/i), '150');
      fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

      await waitFor(() => {
        expect(screen.getByText(/age must be between 0 and 120/i)).toBeInTheDocument();
      });

      // Try negative age
      await userEvent.clear(screen.getByLabelText(/age/i));
      await userEvent.type(screen.getByLabelText(/age/i), '-5');

      await waitFor(() => {
        expect(screen.getByText(/age must be between 0 and 120/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<QuoteForm {...defaultProps} />);
      
      // Try invalid email
      await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
      fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      render(<QuoteForm {...defaultProps} />);
      
      // Try invalid phone number
      await userEvent.type(screen.getByLabelText(/phone/i), '123');
      fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
      });
    });

    it('should validate pincode format', async () => {
      render(<QuoteForm {...defaultProps} />);
      
      // Try invalid pincode
      await userEvent.type(screen.getByLabelText(/pincode/i), '12');
      fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid pincode/i)).toBeInTheDocument();
      });
    });

    it('should validate family member details', async () => {
      render(<QuoteForm {...defaultProps} />);
      
      // Add family member without details
      fireEvent.click(screen.getByText(/add family member/i));
      fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

      await waitFor(() => {
        expect(screen.getByText(/family member name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/relationship is required/i)).toBeInTheDocument();
        expect(screen.getByText(/age is required/i)).toBeInTheDocument();
      });
    });

    it('should validate medical conditions selection', async () => {
      render(<QuoteForm {...defaultProps} />);
      
      // Check medical conditions without selecting any
      const checkbox = screen.getByLabelText(/do you have any medical conditions/i);
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

      await waitFor(() => {
        expect(screen.getByText(/please select at least one medical condition/i)).toBeInTheDocument();
      });
    });
  });

  it('should submit form with valid data', async () => {
    render(<QuoteForm {...defaultProps} />);
    
    // Fill form with valid data
    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/age/i), '30');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'MALE');
    await userEvent.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
    await userEvent.type(screen.getByLabelText(/phone/i), '1234567890');
    await userEvent.type(screen.getByLabelText(/city/i), 'Mumbai');
    await userEvent.type(screen.getByLabelText(/state/i), 'Maharashtra');
    await userEvent.type(screen.getByLabelText(/pincode/i), '400001');

    fireEvent.click(screen.getByRole('button', { name: /get quotes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        gender: 'MALE',
        email: 'john.doe@example.com',
        phone: '1234567890',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      }));
    });
  });
}); 