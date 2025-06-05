import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreeSignupForm from '../FreeSignupForm';
import { FreeFormData, IndustryOption } from '../types';

// Mock the image import
jest.mock('@/public/png/bsn-logo.png', () => ({
  src: '/img/test.jpg',
  height: 100,
  width: 100,
  blurDataURL: 'data:image/jpeg;base64,',
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Remove fetchPriority to avoid React warning
    const { fetchPriority, ...rest } = props;
    return <img {...rest} />;
  }
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

// Mock Google Places Autocomplete
jest.mock('react-google-places-autocomplete', () => ({
  __esModule: true,
  default: ({ selectProps }: any) => (
    <input
      data-testid="google-places-autocomplete"
      onChange={(e) => selectProps.onChange({ 
        label: e.target.value,
        value: { 
          place_id: 'test-place-id',
          structured_formatting: {
            main_text: e.target.value,
            secondary_text: 'Test Location'
          }
        }
      })}
    />
  )
}));

describe('FreeSignupForm', () => {
  const mockFormData: FreeFormData = {
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    latitude: null,
    longitude: null,
    primaryIndustry: '',
    organizationName: '',
    bio: '',
    form: ''
  };

  const mockIndustryOptions: IndustryOption[] = [
    { id: '1', name: 'Technology' },
    { id: '2', name: 'Healthcare' }
  ];

  const defaultProps = {
    formData: mockFormData,
    errors: {},
    industryOptions: mockIndustryOptions,
    isSubmitting: false,
    isSubmitted: false,
    onFieldChange: jest.fn(),
    onAddressSelect: jest.fn(),
    onSubmit: jest.fn(),
    touched: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(<FreeSignupForm {...defaultProps} />);

    // Check for required field labels
    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Last Name *')).toBeInTheDocument();
    expect(screen.getByText('Email *')).toBeInTheDocument();
    expect(screen.getByText('Address *')).toBeInTheDocument();
    expect(screen.getByText('Primary Industry House *')).toBeInTheDocument();

    // Check for optional fields
    expect(screen.getByText('Organization Name (optional)')).toBeInTheDocument();
    expect(screen.getByText('Bio (optional)')).toBeInTheDocument();
  });

  it('displays error messages when fields have errors', () => {
    const propsWithErrors = {
      ...defaultProps,
      errors: {
        firstName: 'First name is required',
        email: 'Invalid email format'
      }
    };

    render(<FreeSignupForm {...propsWithErrors} />);

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('calls onFieldChange when input values change', async () => {
    render(<FreeSignupForm {...defaultProps} />);
    
    const firstNameInput = screen.getByLabelText('First Name *');
    await userEvent.type(firstNameInput, 'John');

    // Check that onFieldChange was called with the final value
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('firstName', 'n');
    expect(defaultProps.onFieldChange).toHaveBeenCalledTimes(4); // Once for each character
  });

  it('calls onSubmit when form is submitted', async () => {
    render(<FreeSignupForm {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('shows loading state when isSubmitting is true', () => {
    const submittingProps = {
      ...defaultProps,
      isSubmitting: true
    };

    render(<FreeSignupForm {...submittingProps} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows thank you message when form is submitted', () => {
    const submittedProps = {
      ...defaultProps,
      isSubmitted: true
    };

    render(<FreeSignupForm {...submittedProps} />);
    
    expect(screen.getByText('Thank you!')).toBeInTheDocument();
    expect(screen.getByText(/Your free listing is now on our map/)).toBeInTheDocument();
  });

  it('handles address selection', async () => {
    render(<FreeSignupForm {...defaultProps} />);
    
    const addressInput = screen.getByTestId('google-places-autocomplete');
    await userEvent.type(addressInput, '123 Test St');

    expect(defaultProps.onAddressSelect).toHaveBeenCalledWith(expect.objectContaining({
      label: '123 Test St',
      value: expect.objectContaining({
        place_id: 'test-place-id'
      })
    }));
  });

  it('shows form-wide error when present', () => {
    const propsWithFormError = {
      ...defaultProps,
      errors: {
        form: 'Failed to submit form. Please try again.'
      }
    };

    render(<FreeSignupForm {...propsWithFormError} />);
    
    expect(screen.getByText('Failed to submit form. Please try again.')).toBeInTheDocument();
  });
}); 