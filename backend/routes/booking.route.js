import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { 
  connectToMongoDB, 
  findDocuments, 
  insertDocument, 
  updateDocument 
} from '../db/mongodb.js';
import path from 'path';
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from '../utils/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const bookingsFile = join(__dirname, '..', 'data', 'bookings.json');

// Ensure bookings file exists
if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, '[]', 'utf8');
}

// Helper function to normalize booking data
const normalizeBookingData = (booking) => {
  const normalized = { ...booking };
  
  // Ensure ID is a string
  normalized.id = String(normalized.id);
  
  // Ensure status is lowercase
  if (normalized.status) {
    normalized.status = String(normalized.status).toLowerCase();
  }
  
  return normalized;
};

// Get all bookings
router.get('/bookings', async (req, res) => {
    try {
        console.log('GET /bookings - Fetching all bookings');
        
        // Fallback to JSON file
        console.log(`Reading bookings from file: ${bookingsFile}`);
        
        // Check if file exists and create it if not
        if (!fs.existsSync(bookingsFile)) {
            console.log('Bookings file does not exist, creating empty file');
            fs.writeFileSync(bookingsFile, '[]', 'utf8');
            return res.json([]);
        }
        
        try {
            // Read file directly
            const fileContent = fs.readFileSync(bookingsFile, 'utf8');
            console.log(`Read file content length: ${fileContent.length}`);
            
            // Parse JSON safely
            let bookings = [];
            if (fileContent.trim()) {
                try {
                    bookings = JSON.parse(fileContent);
                    if (!Array.isArray(bookings)) {
                        console.log('Bookings data is not an array, resetting to empty array');
                        bookings = [];
                    }
                } catch (parseError) {
                    console.error('Error parsing bookings JSON:', parseError);
                    bookings = [];
                }
            }
            
            console.log(`Parsed ${bookings.length} bookings from JSON file`);
            
            // Normalize all booking data before sending
            const normalizedBookings = bookings.map(booking => {
                const normalized = { ...booking };
                
                // Ensure ID is a string
                normalized.id = String(normalized.id || '');
                
                // Ensure status is lowercase
                normalized.status = (booking.status || 'pending').toLowerCase();
                
                return normalized;
            });
            
            return res.json(normalizedBookings);
        } catch (fileError) {
            console.error('Error reading bookings file:', fileError);
            // If file can't be read, return empty array instead of error
            return res.json([]);
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        // Return empty array instead of error to prevent 500 on client
        return res.json([]);
    }
});

router.post('/create', async (req, res) => {
    try {
        console.log('POST /create - Creating booking with data:', JSON.stringify(req.body).substring(0, 200) + '...');

        // Read existing bookings from file
        console.log(`Reading existing bookings from file: ${bookingsFile}`);
        
        // Ensure file exists
        if (!fs.existsSync(bookingsFile)) {
            console.log('Bookings file does not exist, creating empty file');
            fs.writeFileSync(bookingsFile, '[]', 'utf8');
        }
        
        let bookings = [];
        try {
            const fileContent = fs.readFileSync(bookingsFile, 'utf8');
            bookings = JSON.parse(fileContent);
            console.log(`Read ${bookings.length} existing bookings from file`);
        } catch (readError) {
            console.error('Error reading bookings file:', readError);
            console.log('Starting with empty bookings array');
        }

        const bookingId = Date.now().toString();
        console.log(`Generated booking ID: ${bookingId}`);
        
        // Create a new booking with explicit 'pending' status
        const newBooking = {
            id: bookingId,
            hotelId: req.body.hotelId,
            hotelName: req.body.hotelName,
            guestName: req.body.guestName,
            email: req.body.email,
            phone: req.body.phone,
            numberOfGuests: req.body.numberOfGuests,
            description: req.body.description,
            checkIn: req.body.checkIn,
            checkOut: req.body.checkOut,
            totalAmount: req.body.totalAmount,
            mealPackage: req.body.mealPackage || 'none',
            guide: req.body.guide || false,
            status: 'pending', // Ensuring status is explicitly set to 'pending'
            paymentId: null,
            createdAt: new Date().toISOString()
        };

        console.log(`Created new booking with status: ${newBooking.status}`);

        // Save to JSON file
        bookings.push(newBooking);
        console.log(`Writing ${bookings.length} bookings to file`);
        
        try {
        fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
            console.log('Successfully wrote bookings to file');
        } catch (writeError) {
            console.error('Error writing bookings to file:', writeError);
            // Continue even if file write fails, we'll still try MongoDB
        }

        // Also save to MongoDB
        try {
            console.log('Saving booking to MongoDB...');
            await connectToMongoDB();
            await insertDocument('bookings', newBooking);
            console.log('Booking saved to MongoDB');
        } catch (mongoError) {
            console.error('Error saving to MongoDB:', mongoError);
            // Continue even if MongoDB save fails
        }

        console.log('Booking created successfully:', newBooking.id);
        console.log('Booking status:', newBooking.status);

        // Create fake payment URL
        const paymentUrl = `/process-payment?bookingId=${newBooking.id}&amount=${newBooking.totalAmount}`;

        res.json({
            booking: newBooking,
            paymentUrl: paymentUrl
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ 
            message: 'Error creating booking',
            error: error.message 
        });
    }
});

// Add this function to format the booking summary
const getBookingSummary = (booking) => {
  return `
    Booking ID: ${booking.id}
    Hotel: ${booking.hotelName}
    Guest: ${booking.guestName}
    Email: ${booking.email}
    Dates: ${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}
    Status: ${booking.status}
  `;
};

// Handle errors from email sending and continue with the booking process
const handleEmailSendingWithFallback = async (emailSendFunction, ...args) => {
  let emailResult = {
    success: false,
    error: null,
    fallback: true,
    dummyMode: true
  };
  
  try {
    console.log('Attempting to send email...');
    emailResult = await emailSendFunction(...args);
    
    if (emailResult.success) {
      console.log('Email sent successfully');
      if (emailResult.previewUrl) {
        console.log('Email preview URL:', emailResult.previewUrl);
      } else if (emailResult.dummyMode) {
        console.log('Email handled by dummy transport (development mode)');
      }
    } else {
      console.warn('Email sending returned unsuccessful result:', emailResult.error);
    }
  } catch (emailError) {
    console.error('Caught error during email sending:', emailError);
    emailResult = {
      success: false,
      error: emailError.message || 'Unknown email error',
      fallback: true,
      dummyMode: true
    };
  }
  
  return emailResult;
};

// Process payment (confirm booking)
router.post('/process-payment', async (req, res) => {
    try {
        console.log('Processing payment for booking:', req.body);
        const { bookingId } = req.body;
        
        if (!bookingId) {
            console.log('Missing booking ID in request');
            return res.status(400).json({ 
                success: false,
                message: 'Booking ID is required' 
            });
        }

        console.log(`Reading bookings from file: ${bookingsFile}`);
        // Check if file exists
        if (!fs.existsSync(bookingsFile)) {
            console.log('Bookings file does not exist, creating empty file');
            fs.writeFileSync(bookingsFile, '[]', 'utf8');
            return res.status(404).json({
                success: false,
                message: 'No bookings found'
            });
        }
        
        // Read bookings from JSON
        const fileContent = fs.readFileSync(bookingsFile, 'utf8');
        let bookings = [];
        try {
            bookings = JSON.parse(fileContent);
        } catch (parseError) {
            console.error('Error parsing bookings file:', parseError);
            return res.status(500).json({
                success: false,
                message: 'Error reading bookings data'
            });
        }
        
        // Ensure consistent ID comparison by converting to strings
        const stringBookingId = String(bookingId);
        console.log(`Looking for booking with ID: ${stringBookingId}`);
        console.log(`Total bookings: ${bookings.length}`);
        
        const bookingIndex = bookings.findIndex(b => String(b.id) === stringBookingId);
        console.log(`Booking index: ${bookingIndex}`);
        
        if (bookingIndex === -1) {
            console.log(`Booking not found with ID: ${stringBookingId}`);
            // List all booking IDs to help debug
            console.log('Available booking IDs:', bookings.map(b => `${b.id} (${typeof b.id})`).join(', '));
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }
        
        console.log(`Found booking at index ${bookingIndex}:`, bookings[bookingIndex]);
        
        // Update booking status in JSON - use lowercase for consistency
        bookings[bookingIndex].status = 'confirmed';
        bookings[bookingIndex].paymentId = `PAY-${Date.now()}`;
        bookings[bookingIndex].paidAt = new Date().toISOString();
        
        console.log('Writing updated bookings to file...');
        try {
        fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
            console.log('Successfully saved updated bookings');
        } catch (writeError) {
            console.error('Error writing to bookings file:', writeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to save booking updates'
            });
        }
        
        // Also update in MongoDB if available
        try {
            console.log('Updating booking in MongoDB...');
            await connectToMongoDB();
            await updateDocument('bookings', 
                { id: stringBookingId }, 
                { 
                    status: 'confirmed',
                    paymentId: bookings[bookingIndex].paymentId,
                    paidAt: bookings[bookingIndex].paidAt
                }
            );
            console.log('Successfully updated booking in MongoDB');
        } catch (mongoError) {
            console.error('Error updating MongoDB:', mongoError);
            // Continue even if MongoDB update fails
        }
        
        // Send confirmation email with error handling
        const emailResult = await handleEmailSendingWithFallback(
            sendBookingConfirmationEmail,
            bookings[bookingIndex]
        );
        
        console.log('Returning successful response');
        return res.json({
            success: true,
            message: 'Payment processed successfully',
            booking: bookings[bookingIndex],
            emailSent: emailResult ? emailResult.success : false,
            emailPreviewUrl: emailResult?.previewUrl || null,
            emailDummyMode: emailResult?.dummyMode || false,
            bookingSummary: getBookingSummary(bookings[bookingIndex])
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error processing payment',
            error: error.message 
        });
    }
});

// Cancel booking
router.post('/cancel', async (req, res) => {
    try {
        console.log('Cancelling booking:', req.body);
        const { bookingId, cancellationReason } = req.body;
        
        if (!bookingId) {
            console.log('Missing booking ID in request');
            return res.status(400).json({ 
                success: false,
                message: 'Booking ID is required' 
            });
        }

        if (!cancellationReason || cancellationReason.trim() === '') {
            console.log('Missing cancellation reason in request');
            return res.status(400).json({ 
                success: false,
                message: 'Cancellation reason is required' 
            });
        }
        
        console.log(`Reading bookings from file: ${bookingsFile}`);
        // Check if file exists
        if (!fs.existsSync(bookingsFile)) {
            console.log('Bookings file does not exist, creating empty file');
            fs.writeFileSync(bookingsFile, '[]', 'utf8');
            return res.status(404).json({
                success: false,
                message: 'No bookings found'
            });
        }
        
        // Read bookings from JSON
        const fileContent = fs.readFileSync(bookingsFile, 'utf8');
        let bookings = [];
        try {
            bookings = JSON.parse(fileContent);
        } catch (parseError) {
            console.error('Error parsing bookings file:', parseError);
            return res.status(500).json({
                success: false,
                message: 'Error reading bookings data'
            });
        }
        
        // Ensure consistent ID comparison by converting to strings
        const stringBookingId = String(bookingId);
        console.log(`Looking for booking with ID: ${stringBookingId}`);
        console.log(`Total bookings: ${bookings.length}`);
        
        const bookingIndex = bookings.findIndex(b => String(b.id) === stringBookingId);
        console.log(`Booking index: ${bookingIndex}`);
        
        if (bookingIndex === -1) {
            console.log(`Booking not found with ID: ${stringBookingId}`);
            // List all booking IDs to help debug
            console.log('Available booking IDs:', bookings.map(b => `${b.id} (${typeof b.id})`).join(', '));
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        console.log(`Found booking at index ${bookingIndex}:`, bookings[bookingIndex]);
        
        // Update booking status to cancelled in JSON - use lowercase for consistency
        bookings[bookingIndex].status = 'cancelled';
        bookings[bookingIndex].cancelledAt = new Date().toISOString();
        bookings[bookingIndex].cancellationReason = cancellationReason;
        
        console.log('Writing updated bookings to file...');
        try {
            fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
            console.log('Successfully saved updated bookings');
        } catch (writeError) {
            console.error('Error writing to bookings file:', writeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to save booking updates'
            });
        }
        
        // Also update in MongoDB if available
        try {
            console.log('Updating booking in MongoDB...');
            await connectToMongoDB();
            await updateDocument('bookings', 
                { id: stringBookingId }, 
                { 
                    status: 'cancelled',
                    cancelledAt: bookings[bookingIndex].cancelledAt,
                    cancellationReason: bookings[bookingIndex].cancellationReason
                }
            );
            console.log('Successfully updated booking in MongoDB');
        } catch (mongoError) {
            console.error('Error updating MongoDB:', mongoError);
            // Continue even if MongoDB update fails
        }
        
        // Send cancellation email with error handling
        const emailResult = await handleEmailSendingWithFallback(
            sendBookingCancellationEmail,
            bookings[bookingIndex], 
            bookings[bookingIndex].cancellationReason
        );
        
        console.log('Returning successful response');
        return res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking: bookings[bookingIndex],
            emailSent: emailResult ? emailResult.success : false,
            emailPreviewUrl: emailResult?.previewUrl || null,
            emailDummyMode: emailResult?.dummyMode || false,
            bookingSummary: getBookingSummary(bookings[bookingIndex])
        });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error cancelling booking',
            error: error.message 
        });
    }
});

// Update booking status
router.put('/status/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, cancellationReason } = req.body;

        console.log('Updating booking status:', { bookingId, status });
        console.log('Bookings file path:', bookingsFile);

        if (!bookingId || !status) {
            console.log('Missing required fields:', { bookingId, status });
            return res.status(400).json({ 
                success: false,
                message: 'Booking ID and status are required' 
            });
        }

        // Check if bookings file exists
        if (!fs.existsSync(bookingsFile)) {
            console.log('Bookings file does not exist, creating empty file');
            fs.writeFileSync(bookingsFile, '[]', 'utf8');
        }

        // Read bookings from JSON
        console.log('Reading bookings file...');
        const bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8'));
        console.log('Current bookings:', bookings);

        const bookingIndex = bookings.findIndex(b => b.id === bookingId);
        console.log('Found booking at index:', bookingIndex);
        
        if (bookingIndex === -1) {
            console.log('Booking not found:', bookingId);
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }
        
        // Update booking status in JSON
        const oldStatus = bookings[bookingIndex].status;
        bookings[bookingIndex].status = status;
        bookings[bookingIndex].updatedAt = new Date().toISOString();
        
        // Add cancellation reason if provided and status is cancelled
        if (status === 'cancelled' && cancellationReason) {
            bookings[bookingIndex].cancellationReason = cancellationReason;
        }
        
        console.log(`Updating booking ${bookingId} status from ${oldStatus} to ${status}`);
        
        // Write back to JSON file
        console.log('Writing updated bookings to file...');
        fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
        console.log('Successfully wrote to file');
        
        // Update in MongoDB
        try {
            await connectToMongoDB();
            const updateData = { 
                status: status,
                updatedAt: bookings[bookingIndex].updatedAt
            };
            
            // Include cancellation reason if applicable
            if (status === 'cancelled' && cancellationReason) {
                updateData.cancellationReason = cancellationReason;
            }
            
            await updateDocument('bookings', { id: bookingId }, updateData);
            console.log('Booking status updated in MongoDB');
        } catch (mongoError) {
            console.error('Error updating MongoDB:', mongoError);
            // Continue even if MongoDB update fails
        }
        
        // Send appropriate email based on new status with error handling
        let emailResult = null;
        
        if (status === 'confirmed' && oldStatus !== 'confirmed') {
            emailResult = await handleEmailSendingWithFallback(
                sendBookingConfirmationEmail,
                bookings[bookingIndex]
            );
        } else if (status === 'cancelled' && oldStatus !== 'cancelled') {
            emailResult = await handleEmailSendingWithFallback(
                sendBookingCancellationEmail,
                bookings[bookingIndex], 
                bookings[bookingIndex].cancellationReason || 'No reason provided'
            );
        }
        
        // Return success response
        console.log('Returning successful response');
        return res.json({
            success: true,
            message: `Booking status updated to ${status}`,
            booking: bookings[bookingIndex],
            emailSent: emailResult ? emailResult.success : false,
            emailPreviewUrl: emailResult?.previewUrl || null,
            emailDummyMode: emailResult?.dummyMode || false
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error updating booking status',
            error: error.message 
        });
    }
});

export default router;
