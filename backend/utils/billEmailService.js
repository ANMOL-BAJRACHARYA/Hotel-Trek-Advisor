import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Load environment variables
dotenv.config();

// Email configuration
const USE_ETHEREAL = process.env.USE_ETHEREAL === 'true';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'hotel@example.com';

console.log('Email configuration:', {
  useEthereal: USE_ETHEREAL,
  service: EMAIL_SERVICE,
  user: EMAIL_USER,
  password: EMAIL_PASSWORD ? 'Provided' : 'Missing',
  from: EMAIL_FROM
});

// Initialize the email transporter
let transporter = null;

const initializeTransporter = async () => {
  try {
    if (USE_ETHEREAL) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return transporter;
    }
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return transporter;
    }
    transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });
    return transporter;
  } catch (error) {
    console.error('Failed to initialize email transporter:', error);
    transporter = null;
  }
};

/**
 * Send a bill email with a QR code linking to the hosted bill
 * @param {string} guestEmail - The guest's email address
 * @param {string} billUrl - The URL where the bill is hosted
 * @param {object} bookingDetails - Optional: Booking details for personalization
 */
export const sendBillEmail = async (guestEmail, billUrl, bookingDetails = {}) => {
  try {
    if (!transporter) {
      await initializeTransporter();
    }
    if (!transporter) {
      console.log('Email transporter not available, bill email not sent.');
      return { success: false, error: 'Transporter not available' };
    }
    // Generate QR code for the bill URL
    const qrImage = await QRCode.toBuffer(billUrl);

    // Email subject and HTML
    const hotelName = bookingDetails.hotelName || 'Our Hotel';
    const guestName = bookingDetails.guestName || 'Guest';
    const emailSubject = `Your Bill from ${hotelName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568;">Thank you for staying at ${hotelName}!</h2>
        <p>Dear ${guestName},</p>
        <p>Your bill is ready. You can view it online by scanning the QR code below with your mobile device:</p>
        <div style="text-align: center; margin: 20px 0;">
          <img src="cid:billqrcode" alt="Bill QR Code" style="width: 180px; height: 180px;"/>
        </div>
        <p><strong>Scan this QR code to view your bill in a mobile-friendly format.</strong></p>
        <p>Or <a href="${billUrl}" target="_blank">click here to view your bill</a>.</p>
        <p>We hope you enjoyed your stay!</p>
        <p>Best regards,<br>The ${hotelName} Team</p>
      </div>
    `;

    // Send the email with embedded QR code (inline image)
    const info = await transporter.sendMail({
      from: `"${hotelName}" <${EMAIL_FROM}>`,
      to: guestEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: 'bill-qr.png',
          content: qrImage,
          contentType: 'image/png',
          cid: 'billqrcode', // same as in img src
        },
      ],
    });
    console.log('[BILL EMAIL] Sent bill email to', guestEmail, 'Info:', info);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[BILL EMAIL] Error sending bill email:', error);
    return { success: false, error: error.message };
  }
};
