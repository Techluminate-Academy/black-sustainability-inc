import { createMocks } from 'node-mocks-http';
import sendVerification from '../auth/send-verification';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('Send Verification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends verification email successfully', async () => {
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        code: '123456',
      },
    });

    await sendVerification(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: 'Verification email sent successfully',
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.any(String),
        html: expect.stringContaining('123456'),
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
      error: 'Email and verification code are required',
    });
  });

  it('handles email sending failure', async () => {
    const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP error'));
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        code: '123456',
      },
    });

    await sendVerification(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to send verification email',
    });
  });
});
