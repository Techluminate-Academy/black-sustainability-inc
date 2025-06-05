import { renderHook, act } from '@testing-library/react';
import { useFreeSignupForm } from '../useFreeSignupForm';
import AirtableUtils from '../airtableUtils';

// Mock console.error to reduce noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (args[0].includes('Warning: An update to TestComponent')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock AirtableUtils
jest.mock('../airtableUtils', () => ({
  fetchTableMetadata: jest.fn().mockResolvedValue([
    {
      fieldName: 'PRIMARY INDUSTRY HOUSE',
      options: [
        { id: '2', name: 'Healthcare' },
        { id: '1', name: 'Technology' }
      ]
    }
  ]),
  submitToAirtable: jest.fn().mockResolvedValue(undefined)
}));

// Mock geocoding functions
jest.mock('react-google-places-autocomplete', () => ({
  geocodeByPlaceId: jest.fn().mockResolvedValue([{
    geometry: {
      location: {
        lat: () => 40.7128,
        lng: () => -74.0060
      }
    }
  }]),
  getLatLng: jest.fn().mockResolvedValue({ lat: 40.7128, lng: -74.0060 })
}));

describe('useFreeSignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty form data and no errors', () => {
    const { result } = renderHook(() => useFreeSignupForm());

    expect(result.current.formData).toEqual({
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
    });
    expect(result.current.errors).toEqual({});
  });

  it('loads industry options on mount', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    // Wait for the useEffect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(AirtableUtils.fetchTableMetadata).toHaveBeenCalled();
    expect(result.current.industryOptions).toEqual([
      { id: '2', name: 'Healthcare' },
      { id: '1', name: 'Technology' }
    ]);
  });

  it('handles field changes correctly', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    await act(async () => {
      result.current.handleFieldChange('firstName', 'John');
    });

    expect(result.current.formData.firstName).toBe('John');
    expect(result.current.errors.firstName).toBeUndefined();
  });

  it('validates required fields on submit', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.errors).toEqual({
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
      email: 'Enter a valid email.',
      address: 'Address is required.',
      primaryIndustry: 'Primary industry is required.'
    });
    expect(AirtableUtils.submitToAirtable).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    await act(async () => {
      // Fill in other required fields first
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('primaryIndustry', 'Technology');
      await result.current.handleAddressSelect({
        label: '123 Test St',
        value: {
          place_id: 'test-place-id',
          structured_formatting: {
            main_text: '123 Test St',
            secondary_text: 'New York, NY'
          }
        }
      });
      // Set invalid email last
      result.current.handleFieldChange('email', 'invalid-email');
      // Validate only email field
      result.current.validate(['email']);
    });

    expect(result.current.errors).toEqual({
      email: 'Enter a valid email.'
    });
  });

  it('handles address selection and geocoding', async () => {
    const { result } = renderHook(() => useFreeSignupForm());
    const mockAddress = {
      label: '123 Test St',
      value: {
        place_id: 'test-place-id',
        structured_formatting: {
          main_text: '123 Test St',
          secondary_text: 'New York, NY'
        }
      }
    };

    await act(async () => {
      await result.current.handleAddressSelect(mockAddress);
    });

    expect(result.current.formData.address).toBe('123 Test St');
    expect(result.current.formData.latitude).toBe(40.7128);
    expect(result.current.formData.longitude).toBe(-74.0060);
  });

  it('submits form successfully when all fields are valid', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    // Fill in all required fields
    await act(async () => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('primaryIndustry', 'Technology');
      
      await result.current.handleAddressSelect({
        label: '123 Test St',
        value: {
          place_id: 'test-place-id',
          structured_formatting: {
            main_text: '123 Test St',
            secondary_text: 'New York, NY'
          }
        }
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(Object.keys(result.current.errors)).toHaveLength(0);
    expect(result.current.isSubmitted).toBe(true);
    expect(AirtableUtils.submitToAirtable).toHaveBeenCalledWith(expect.objectContaining({
      'FIRST NAME': 'John',
      'LAST NAME': 'Doe',
      'EMAIL ADDRESS': 'john@example.com',
      'PRIMARY INDUSTRY HOUSE': 'Technology',
      'Address': '123 Test St',
      'Latitude': 40.7128,
      'Longitude': -74.0060,
      'Featured': 'checked'
    }));
  });

  it('handles submission errors', async () => {
    const mockError = new Error('Submission failed');
    (AirtableUtils.submitToAirtable as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useFreeSignupForm());

    // Fill in all required fields
    await act(async () => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('primaryIndustry', 'Technology');
      await result.current.handleAddressSelect({
        label: '123 Test St',
        value: {
          place_id: 'test-place-id',
          structured_formatting: {
            main_text: '123 Test St',
            secondary_text: 'New York, NY'
          }
        }
      });
    });

    // Submit form
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.errors.form).toBe('Failed to submit form. Please try again.');
    expect(result.current.isSubmitted).toBe(false);
  });
}); 