import { createMocks } from 'node-mocks-http';
import sendVerification from '../../pages/api/auth/send-verification';
import nodemailer from 'nodemailer';
import axios from 'axios';

jest.mock('nodemailer');
jest.mock('axios');
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({
    db: {
      collection: jest.fn().mockReturnValue({
        replaceOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      }),
    },
  }),
}));

describe('Send Verification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends verification email successfully', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // -> code "100000"

    const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        records: [
          {
            id: 'rec123',
            fields: {
              'FIRST NAME': 'Test',
              'LAST NAME': 'User',
              'EMAIL ADDRESS': 'test@example.com',
            },
          },
        ],
      },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
      },
    });

    await sendVerification(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Verification code sent to your email',
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.any(String),
        html: expect.stringContaining('100000'),
      })
    );
  });

  it('handles missing email or code', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    await sendVerification(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Email is required',
    });
  });

  it('handles email sending failure', async () => {
    const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP error'));
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        records: [
          {
            id: 'rec123',
            fields: {
              'FIRST NAME': 'Test',
              'LAST NAME': 'User',
              'EMAIL ADDRESS': 'test@example.com',
            },
          },
        ],
      },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
      },
    });

    await sendVerification(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to send verification code',
      details: expect.any(String),
    });
  });
});
