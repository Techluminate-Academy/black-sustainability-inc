import { renderHook, act, waitFor } from '@testing-library/react';
import { FALLBACK_INDUSTRY_OPTIONS } from '@/constants/industry-house-options';
import { useFreeSignupForm } from '../useFreeSignupForm';
import AirtableUtils from '../airtableUtils';
import * as freeSignupService from '../freeSignupService';

// Mock the signup service
jest.mock('../freeSignupService');
const mockedSignupService = freeSignupService as jest.Mocked<typeof freeSignupService>;

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

describe('useFreeSignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty form data and no errors', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    // Let the mount effect settle to avoid act() warnings
    await waitFor(() => {
      expect(AirtableUtils.fetchTableMetadata).toHaveBeenCalled();
    });

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
      photo: null,
      logo: null,
      form: '',
      membershipStatusNotes: 'Free',
      affiliatedEntity: '',
    });
    expect(result.current.errors).toEqual({});
  });

  it('loads industry options on mount', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    await waitFor(() => {
      expect(result.current.industryOptions).toHaveLength(2);
    });

    expect(AirtableUtils.fetchTableMetadata).toHaveBeenCalled();
    expect(result.current.industryOptions).toEqual([
      { id: '2', name: 'Healthcare' },
      { id: '1', name: 'Technology' }
    ]);
  });

  it('keeps the mandatory industry dropdown usable when metadata fails', async () => {
    (AirtableUtils.fetchTableMetadata as jest.Mock).mockRejectedValueOnce(
      new Error('Metadata unavailable')
    );

    const { result } = renderHook(() => useFreeSignupForm());

    await waitFor(() => {
      expect(AirtableUtils.fetchTableMetadata).toHaveBeenCalled();
    });

    expect(result.current.industryOptions).toEqual(FALLBACK_INDUSTRY_OPTIONS);
    expect(result.current.industryOptions.length).toBeGreaterThan(0);
    expect(result.current.errors.primaryIndustry).toBeUndefined();
  });

  it('keeps fallback Industry House options when metadata returns an empty list', async () => {
    (AirtableUtils.fetchTableMetadata as jest.Mock).mockResolvedValueOnce([
      {
        fieldName: 'PRIMARY INDUSTRY HOUSE',
        options: [],
      },
    ]);

    const { result } = renderHook(() => useFreeSignupForm());

    await waitFor(() => {
      expect(AirtableUtils.fetchTableMetadata).toHaveBeenCalled();
    });

    expect(result.current.industryOptions).toEqual(FALLBACK_INDUSTRY_OPTIONS);
    expect(result.current.industryOptions.length).toBeGreaterThan(0);
  });

  it('handles field changes correctly', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    await act(async () => {
      result.current.handleFieldChange('firstName', 'John');
    });

    expect(result.current.formData.firstName).toBe('John');
    expect(result.current.errors.firstName).toBeUndefined();
  });

  it('handles file changes correctly', async () => {
    const { result } = renderHook(() => useFreeSignupForm());
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    await act(async () => {
      await result.current.handleFileChange('photo', file);
    });

    expect(result.current.formData.photo).toBe(file);
    expect(result.current.errors).toEqual({});
  });

  it('validates file type', async () => {
    const { result } = renderHook(() => useFreeSignupForm());
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.handleFileChange('photo', file);
    });

    expect(result.current.errors.photo).toBe('Please upload a valid image file (JPEG, PNG, GIF, or WEBP)');
  });

  it('validates file size', async () => {
    const { result } = renderHook(() => useFreeSignupForm());
    const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });

    await act(async () => {
      await result.current.handleFileChange('photo', largeFile);
    });
    
    expect(result.current.errors.photo).toBe('File size must be less than 5MB');
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
      primaryIndustry: 'Primary industry is required.',
      photo: 'Profile photo is required.'
    });
    expect(freeSignupService.sendToAirtable).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    await act(async () => {
      result.current.handleFieldChange('email', 'invalid-email');
    });

    expect(result.current.errors.email).toBe('Enter a valid email.');
  });

  it('handles address selection and geocoding', async () => {
    const { result } = renderHook(() => useFreeSignupForm());
    const mockAddress = {
      label: '123 Test St',
      latitude: 40.7128,
      longitude: -74.0060,
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

  it('clears the address error as soon as a valid suggestion is selected', async () => {
    const { result } = renderHook(() => useFreeSignupForm());

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.errors.address).toBe('Address is required.');

    await act(async () => {
      await result.current.handleAddressSelect({
        label: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
        value: {
          place_id: 'test-place-id',
          structured_formatting: {
            main_text: '123 Test St',
            secondary_text: 'New York, NY'
          }
        }
      });
    });

    expect(result.current.errors.address).toBeUndefined();
  });

  it('handles submission errors', async () => {
    const mockError = new Error('Submission failed');
    mockedSignupService.sendToAirtable.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useFreeSignupForm());
    const mockPhoto = new File(['photo'], 'photo.png', { type: 'image/png' });

    // Fill in all required fields
    await act(async () => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('primaryIndustry', 'Technology');
      await result.current.handleFileChange('photo', mockPhoto);
      await result.current.handleAddressSelect({
        label: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
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

    expect(result.current.errors.form).toBe('An unexpected error occurred during submission.');
    expect(result.current.isSubmitted).toBe(false);
  });

  it('submits form successfully when all fields are valid', async () => {
    const { result } = renderHook(() => useFreeSignupForm());
    const mockPhoto = new File(['photo'], 'photo.png', { type: 'image/png' });

    // Mock the upload response
    mockedSignupService.uploadFile.mockResolvedValue('http://cloudinary.com/photo.png');

    // Fill in all required fields
    await act(async () => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('primaryIndustry', 'Technology');
      await result.current.handleFileChange('photo', mockPhoto);
      
      await result.current.handleAddressSelect({
        label: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
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

    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitted).toBe(true);
    expect(freeSignupService.uploadFile).toHaveBeenCalledWith(mockPhoto);
    expect(freeSignupService.sendToAirtable).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      primaryIndustry: 'Technology',
      address: '123 Test St',
      latitude: 40.7128,
      longitude: -74.0060,
      photoUrl: 'http://cloudinary.com/photo.png',
    }));
  });
});
