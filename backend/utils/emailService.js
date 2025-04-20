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
    // Check if we should use Ethereal for testing
    if (USE_ETHEREAL) {
      console.log('Using Ethereal test account as specified in .env');
      // Create a test account on ethereal.email for development
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
      
      console.log('Created ethereal test account for email testing');
      return transporter;
    }

    // Check if we have credentials
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.log('Email credentials not provided, falling back to ethereal test account');
      // Create a test account on ethereal.email for development
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
      
      console.log('Created ethereal test account for email testing');
      return transporter;
    }
    
    // Create a real transporter with the provided credentials
    if (EMAIL_SERVICE === 'gmail') {
      // Use service configuration for Gmail
      transporter = nodemailer.createTransport({
        service: EMAIL_SERVICE,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
      });
    } else {
      // Use custom SMTP configuration
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
      });
    }
    
    console.log('Email transporter initialized with real credentials');
    return transporter;
  } catch (error) {
    console.error('ERROR INITIALIZING EMAIL TRANSPORTER:', error);
    return null;
  }
};

// Initialize the transporter when the module is loaded
initializeTransporter();

// Format dates for email
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

// Send a booking confirmation email
export const sendBookingConfirmationEmail = async (bookingDetails) => {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      await initializeTransporter();
    }
    
    // If transporter still not available, log and return
    if (!transporter) {
      console.log('Email transporter not available, logging email details instead');
      console.log('Would send confirmation email to:', bookingDetails.email);
      console.log('Booking details:', {
        id: bookingDetails.id,
        guestName: bookingDetails.guestName,
        hotelName: bookingDetails.hotelName,
        checkIn: formatDate(bookingDetails.checkIn),
        checkOut: formatDate(bookingDetails.checkOut)
      });
      
      return { 
        success: true, 
        messageId: 'dummy-message-id',
        dummyMode: true,
        message: 'Email functionality is disabled'
      };
    }

    // Prepare booking details URL for QR code
    const bookingUrl = `http://192.168.1.71:3000/booking/details/${bookingDetails.id}`;
    console.log('[QR DEBUG] Booking details URL for QR:', bookingUrl);
    const qrImage = await QRCode.toBuffer(bookingUrl);
    console.log('[QR DEBUG] QR image buffer length:', qrImage.length);

    // Prepare email content
    const emailSubject = `Booking Confirmation - ${bookingDetails.hotelName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568;">Booking Confirmation</h2>
        <p>Dear ${bookingDetails.guestName},</p>
        <p>Thank you for choosing ${bookingDetails.hotelName}. Your booking has been confirmed.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4a5568;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${bookingDetails.id}</p>
          <p><strong>Hotel:</strong> ${bookingDetails.hotelName}</p>
          <p><strong>Check-in:</strong> ${formatDate(bookingDetails.checkIn)}</p>
          <p><strong>Check-out:</strong> ${formatDate(bookingDetails.checkOut)}</p>
          <p><strong>Number of Guests:</strong> ${bookingDetails.numberOfGuests}</p>
          <p><strong>Total Amount:</strong> $${bookingDetails.totalAmount}</p>
        </div>
        
        <p>If you have any questions or need to make changes to your reservation, please contact us on +977-9860557005 or mail us at bajracharyaanmol5@gmail.com.</p>
        <p>We look forward to welcoming you!</p>
        <p>Best regards,<br>The ${bookingDetails.hotelName} Team</p>
        <div style="text-align:center;margin:20px 0;">
          <img src="cid:bookingqrcode" alt="Booking QR Code" style="width:180px;height:180px;"/>
        </div>
        <p><strong>Scan this QR code to view your booking details online in a mobile-friendly format.</strong></p>
        <p>Or <a href="${bookingUrl}" target="_blank">click here to view your booking details</a>.</p>
      </div>
    `;

    // Send the email with QR code attachment
    console.log('[EMAIL DEBUG] Sending confirmation email with QR attachment to:', bookingDetails.email);
    const info = await transporter.sendMail({
      from: `"${bookingDetails.hotelName}" <${EMAIL_FROM}>`,
      to: bookingDetails.email,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: 'booking-details-qr.png',
          content: qrImage,
          contentType: 'image/png',
          cid: 'bookingqrcode', // used for inline image
        },
      ],
    });
    console.log('[EMAIL DEBUG] Email sent. Info:', info);
    console.log('Confirmation email sent successfully:', info.messageId);
    
    // If using ethereal, provide the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }

    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      dummyMode: false
    };
  } catch (error) {
    console.error('ERROR IN SEND BOOKING CONFIRMATION EMAIL:', error);
    return {
      success: false,
      error: error.message,
      dummyMode: false
    };
  }
};

// Send a booking cancellation email
export const sendBookingCancellationEmail = async (bookingDetails, cancellationReason) => {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      await initializeTransporter();
    }
    
    // If transporter still not available, log and return
    if (!transporter) {
      console.log('Email transporter not available, logging email details instead');
      console.log('Would send cancellation email to:', bookingDetails.email);
      console.log('Booking details:', {
        id: bookingDetails.id,
        guestName: bookingDetails.guestName,
        hotelName: bookingDetails.hotelName,
        checkIn: formatDate(bookingDetails.checkIn),
        checkOut: formatDate(bookingDetails.checkOut),
        cancellationReason: cancellationReason
      });
      
      return { 
        success: true, 
        messageId: 'dummy-message-id',
        dummyMode: true,
        message: 'Email functionality is disabled'
      };
    }

    // Prepare email content
    const emailSubject = `Booking Cancellation - ${bookingDetails.hotelName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568;">Booking Cancellation</h2>
        <p>Dear ${bookingDetails.guestName},</p>
        <p>We would like to inform you that your booking at ${bookingDetails.hotelName} has been cancelled.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4a5568;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${bookingDetails.id}</p>
          <p><strong>Hotel:</strong> ${bookingDetails.hotelName}</p>
          <p><strong>Check-in:</strong> ${formatDate(bookingDetails.checkIn)}</p>
          <p><strong>Check-out:</strong> ${formatDate(bookingDetails.checkOut)}</p>
          <p><strong>Cancellation Reason:</strong> ${cancellationReason || 'Not specified'}</p>
        </div>
        
        <p>If you have any questions regarding this cancellation, please don't hesitate to contact us.</p>
        <p>We hope to have the opportunity to welcome you in the future.</p>
        <p>Best regards,<br>The ${bookingDetails.hotelName} Team</p>
      </div>
    `;

    // Send the email
    const info = await transporter.sendMail({
      from: `"${bookingDetails.hotelName}" <${EMAIL_FROM}>`,
      to: bookingDetails.email,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log('Cancellation email sent successfully:', info.messageId);
    
    // If using ethereal, provide the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }

    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      dummyMode: false
    };
  } catch (error) {
    console.error('ERROR IN SEND BOOKING CANCELLATION EMAIL:', error);
    return {
      success: false,
      error: error.message,
      dummyMode: false
    };
  }
};

// Log email service status
if (USE_ETHEREAL) {
  console.log('Email service loaded in TEST mode');
  console.log('Using Ethereal test email service (emails will be viewable via preview URL)');
} else if (EMAIL_USER && EMAIL_PASSWORD) {
  console.log('Email service loaded in ENABLED mode');
  console.log(`Using email provider: ${EMAIL_SERVICE}`);
  console.log(`Email will be sent from: ${EMAIL_FROM}`);
} else {
  console.log('Email service loaded in DISABLED mode');
  console.log('No emails will be sent from the system');
}

// Initialize the transporter when the module is loaded
initializeTransporter();

export default {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail
}; 