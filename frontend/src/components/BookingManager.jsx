import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BookingManager = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
  const [statusFilters, setStatusFilters] = useState(['pending', 'confirmed', 'cancelled']);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ lastRefresh: null, count: 0 });
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setIsRefreshing(true);
      setLoading(true);
      console.log('Fetching bookings from API...');
      
      const response = await axios.get('/api/booking/bookings', { 
        // Add timeout to prevent hanging requests
        timeout: 5000,
        // Handle errors more gracefully
        validateStatus: function (status) {
          return status < 500; // Only reject if status is 500 or greater
        }
      });
      
      console.log('Received bookings response:', response);
      
      // Handle non-200 responses gracefully
      if (response.status !== 200) {
        console.error('Error response:', response.status, response.data);
        setBookings([]);
        setSaveStatus({
          message: `Server returned error: ${response.status}`,
          type: 'error'
        });
        return;
      }
      
      // Ensure we have an array of bookings, even if the server returns null/undefined
      const bookingsData = Array.isArray(response.data) ? response.data : [];
      console.log('Received bookings data:', bookingsData);
      
      // Process bookings with consistent status values
      const processedBookings = bookingsData.map(booking => {
        // Create a copy with normalized status
        const normalized = { ...booking };
        
        // Convert ID to string for consistent comparison
        normalized.id = String(normalized.id || '');
        
        // Force lowercase status and normalize missing/invalid statuses
        const status = booking.status ? String(booking.status).toLowerCase() : '';
        if (status === 'pending' || status === 'confirmed' || status === 'cancelled') {
          normalized.status = status;
        } else {
          // If status is missing or invalid, set to pending by default
          normalized.status = 'pending';
          console.log(`Fixed invalid status for booking ${normalized.id}`);
        }
        
        return normalized;
      });
      
      console.log('Processed bookings with normalized statuses:', 
        processedBookings.map(b => `${b.id}: ${b.status}`));
      
      setBookings(processedBookings);
      setDebugInfo({
        lastRefresh: new Date().toLocaleTimeString(),
        count: processedBookings.length
      });
      
      if (processedBookings.length === 0) {
        setSaveStatus({
          message: 'No bookings found in the system',
          type: 'warning'
        });
      } else {
        // Clear any warning messages
        if (saveStatus.message === 'No bookings found in the system' ||
            saveStatus.message.includes('Error fetching bookings')) {
          setSaveStatus({ message: '', type: '' });
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      
      // More detailed error message
      let errorMessage = 'Error fetching bookings';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timed out while fetching bookings';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response received from server';
      }
      
      setSaveStatus({
        message: errorMessage,
        type: 'error'
      });
      
      // Keep existing bookings instead of clearing them on error
      // This prevents disrupting the user experience
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleStatusFilterChange = (status) => {
    if (statusFilters.includes(status)) {
      setStatusFilters(statusFilters.filter(s => s !== status));
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  const getFilteredBookings = () => {
    return bookings.filter(booking => statusFilters.includes(booking.status));
  };

  const openConfirmationModal = (bookingId) => {
    const booking = bookings.find(b => String(b.id) === String(bookingId));
    if (booking) {
      setSelectedBookingId(bookingId);
      setSelectedBooking(booking);
      setShowConfirmationModal(true);
    }
  };

  const closeConfirmationModal = () => {
    setShowConfirmationModal(false);
    setSelectedBookingId(null);
    setSelectedBooking(null);
  };

  const handleBookingConfirm = async () => {
    try {
      if (!selectedBookingId) return;
      
      // Convert ID to string for consistent comparison
      const stringBookingId = String(selectedBookingId);
      const paymentId = `PAY-${Date.now()}`;
      
      // Update state for immediate UI feedback
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          String(booking.id) === stringBookingId
            ? { 
                ...booking, 
                status: 'confirmed', 
                paymentId: paymentId,
                paidAt: new Date().toISOString()
              }
            : booking
        )
      );
      
      // Close the modal
      closeConfirmationModal();
      
      // Save the updated booking
      try {
        const response = await axios.post('/api/booking/process-payment', {
          bookingId: stringBookingId
        });
        
        // Check if email was sent and set status message accordingly
        if (response.data.emailSent) {
          if (response.data.emailPreviewUrl) {
            // Test email with preview URL
            setSaveStatus({
              message: 'Booking confirmed successfully',
              type: 'success'
            });
          } else if (response.data.emailDummyMode) {
            // Dummy email (development mode)
            setSaveStatus({
              message: 'Booking confirmed successfully',
              type: 'success'
            });
          } else {
            // Real email sent to guest
            setSaveStatus({
              message: 'Booking confirmed successfully',
              type: 'success'
            });
          }
        } else {
          // No email sent
          setSaveStatus({
            message: 'Booking confirmed successfully',
            type: 'success'
          });
        }
        
        // Refresh bookings to ensure UI matches the server state
        setTimeout(() => fetchBookings(), 1000);
      } catch (error) {
        console.error('Error saving booking:', error);
        setSaveStatus({
          message: 'Failed to confirm booking',
          type: 'error'
        });
        fetchBookings(); // Revert on error
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      setSaveStatus({
        message: 'Failed to confirm booking',
        type: 'error'
      });
    }
  };

  const openCancellationModal = (bookingId) => {
    setSelectedBookingId(bookingId);
    setCancellationReason('');
    setShowCancellationModal(true);
  };

  const closeCancellationModal = () => {
    setShowCancellationModal(false);
    setSelectedBookingId(null);
    setCancellationReason('');
  };

  const handleBookingCancel = async () => {
    try {
      if (!selectedBookingId) return;
      
      // Convert ID to string
      const stringBookingId = String(selectedBookingId);
      
      // Update state first
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          String(booking.id) === stringBookingId
            ? { 
                ...booking, 
                status: 'cancelled',
                cancellationReason: cancellationReason
              }
            : booking
        )
      );
      
      // Save the updated booking
      try {
        const response = await axios.post('/api/booking/cancel', {
          bookingId: stringBookingId,
          cancellationReason: cancellationReason || 'No specific reason provided'
        });
        
        // Check if email was sent and set status message accordingly
        if (response.data.emailSent) {
          if (response.data.emailPreviewUrl) {
            // Test email with preview URL
            setSaveStatus({
              message: 'Booking cancelled successfully',
              type: 'success'
            });
          } else if (response.data.emailDummyMode) {
            // Dummy email (development mode)
            setSaveStatus({
              message: 'Booking cancelled successfully',
              type: 'success'
            });
          } else {
            // Real email sent
            const bookingEmail = bookings.find(b => String(b.id) === stringBookingId)?.email;
            setSaveStatus({
              message: 'Booking cancelled successfully',
              type: 'success'
            });
          }
        } else {
          // No email sent
        setSaveStatus({
          message: 'Booking cancelled successfully',
          type: 'success'
        });
        }
        
        // Close the modal
        closeCancellationModal();
        
        // Refresh bookings to ensure UI matches the server state
        setTimeout(() => fetchBookings(), 1000);
      } catch (error) {
        console.error('Error cancelling booking:', error);
        setSaveStatus({
          message: 'Failed to cancel booking',
          type: 'error'
        });
        closeCancellationModal();
        fetchBookings(); // Revert on error
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setSaveStatus({
        message: 'Failed to cancel booking',
        type: 'error'
      });
      closeCancellationModal();
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusCount = (status) => {
    return bookings.filter(booking => booking.status === status).length;
  };

  if (loading && !isRefreshing) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }
  
  const filteredBookings = getFilteredBookings();
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Bookings Management</h2>
        <div>
          <button 
            onClick={fetchBookings}
            disabled={isRefreshing}
            className="flex items-center bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh Bookings
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Status message */}
      {saveStatus.message && (
        <div className={`p-3 mb-4 rounded ${saveStatus.type === 'success' ? 'bg-green-100 text-green-800' : saveStatus.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
          {saveStatus.message}
          <button 
            className="ml-3 text-sm" 
            onClick={() => setSaveStatus({ message: '', type: '' })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Show pending bookings alert if there are any */}
      {bookings.filter(b => b.status === 'pending').length > 0 && (
        <div className="p-3 mb-4 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
          <strong>Attention needed:</strong> There are {bookings.filter(b => b.status === 'pending').length} pending bookings that require confirmation or cancellation.
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Filter by status:</p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.includes('pending')}
              onChange={() => handleStatusFilterChange('pending')}
              className="form-checkbox h-4 w-4 text-yellow-600"
            />
            <span className="ml-2 text-sm font-medium">
              Pending ({getStatusCount('pending')})
            </span>
          </label>
          <label className="inline-flex items-center ml-4">
            <input
              type="checkbox"
              checked={statusFilters.includes('confirmed')}
              onChange={() => handleStatusFilterChange('confirmed')}
              className="form-checkbox h-4 w-4 text-green-600"
            />
            <span className="ml-2 text-sm font-medium">
              Confirmed ({getStatusCount('confirmed')})
            </span>
          </label>
          <label className="inline-flex items-center ml-4">
            <input
              type="checkbox"
              checked={statusFilters.includes('cancelled')}
              onChange={() => handleStatusFilterChange('cancelled')}
              className="form-checkbox h-4 w-4 text-red-600"
            />
            <span className="ml-2 text-sm font-medium">
              Cancelled ({getStatusCount('cancelled')})
            </span>
          </label>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {isRefreshing && !filteredBookings.length ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No bookings found</p>
            <p className="text-sm text-gray-400">Try creating a booking from the user interface</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow duration-200 ${
                booking.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : 
                booking.status === 'confirmed' ? 'border-green-300 bg-green-50' : 
                'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-semibold text-lg">{booking.hotelName}</h3>
                    <p className="text-sm text-gray-500">ID: {booking.id}</p>
                  </div>
                  <p className="text-gray-600">Guest: {booking.guestName}</p>
                  <p className="text-gray-600">Email: {booking.email}</p>
                  <p className="text-gray-600">Phone: {booking.phone}</p>
                  <p className="text-gray-600">
                    Dates: {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600">Guests: {booking.numberOfGuests}</p>
                  
                  {/* Meal Package Information */}
                  {booking.mealPackage && booking.mealPackage !== 'none' && (
                    <p className="text-gray-600">
                      <span className="font-medium">Meal Package:</span> {
                        booking.mealPackage === 'breakfast' ? 'Breakfast Only' : 
                        booking.mealPackage === 'halfboard' ? 'Half Board (Breakfast & Dinner)' : 
                        booking.mealPackage === 'fullboard' ? 'Full Board (All Meals)' : 
                        'None'
                      }
                    </p>
                  )}
                  
                  {/* Guide Service Information */}
                  {booking.guide && (
                    <p className="text-gray-600">
                      <span className="font-medium">Guide Service:</span> Included
                    </p>
                  )}
                  
                  {/* Special Requests / Description Field */}
                  {booking.description && (
                    <div className="mt-2 bg-white p-3 rounded border border-gray-200">
                      <p className="text-gray-700 text-sm font-medium mb-1">Special Requests / Notes:</p>
                      <p className="text-gray-600 text-sm">{booking.description}</p>
                    </div>
                  )}
                  
                  <p className="font-semibold text-indigo-600 mt-2">
                    Total Amount: ${parseFloat(booking.totalAmount).toFixed(2)}
                  </p>
                </div>
                <div className="text-right flex flex-col space-y-2 ml-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                  
                  {booking.paymentId && (
                    <p className="text-sm text-gray-500">Payment ID: {booking.paymentId}</p>
                  )}
                  
                  {booking.paidAt && (
                    <p className="text-sm text-gray-500">Paid: {new Date(booking.paidAt).toLocaleDateString()}</p>
                  )}
                  
                  {booking.cancellationReason && (
                    <p className="text-sm text-red-500">
                      <span className="font-medium">Reason:</span> {booking.cancellationReason}
                    </p>
                  )}
                  
                  {/* Only show confirm/cancel buttons for pending bookings - use lowercase comparison */}
                  {String(booking.status).toLowerCase() === 'pending' && (
                    <div className="flex space-x-2 justify-end mt-2">
                      <button 
                        onClick={() => openConfirmationModal(booking.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => openCancellationModal(booking.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmationModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Booking</h3>
            <p className="mb-4 text-gray-700">
              Are you sure you want to confirm this booking? This will finalize the reservation.
            </p>
            
            {/* Booking summary */}
            <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Booking Summary</h4>
              <p><span className="font-medium">Guest:</span> {selectedBooking.guestName}</p>
              <p><span className="font-medium">Email:</span> {selectedBooking.email}</p>
              <p><span className="font-medium">Dates:</span> {new Date(selectedBooking.checkIn).toLocaleDateString()} - {new Date(selectedBooking.checkOut).toLocaleDateString()}</p>
              
              {/* Meal Package in Confirmation Modal */}
              {selectedBooking.mealPackage && selectedBooking.mealPackage !== 'none' && (
                <p><span className="font-medium">Meal Package:</span> {
                  selectedBooking.mealPackage === 'breakfast' ? 'Breakfast Only' : 
                  selectedBooking.mealPackage === 'halfboard' ? 'Half Board (Breakfast & Dinner)' : 
                  'Full Board (All Meals)'
                }</p>
              )}
              
              {/* Guide Service in Confirmation Modal */}
              {selectedBooking.guide && (
                <p><span className="font-medium">Guide Service:</span> Included</p>
              )}
              
              <p><span className="font-medium">Amount:</span> ${parseFloat(selectedBooking.totalAmount).toFixed(2)}</p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeConfirmationModal}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleBookingConfirm}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancellation Modal */}
      {showCancellationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Cancel Booking</h3>
            <p className="mb-4 text-gray-700">
              Please provide a reason for cancelling this booking.
            </p>
            
            {/* Booking summary if available */}
            {selectedBookingId && (
              <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Booking Details</h4>
                {(() => {
                  const booking = bookings.find(b => String(b.id) === String(selectedBookingId));
                  if (booking) {
                    return (
                      <>
                        <p><span className="font-medium">Guest:</span> {booking.guestName}</p>
                        <p><span className="font-medium">Email:</span> {booking.email}</p>
                        <p><span className="font-medium">Dates:</span> {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</p>
                        
                        {/* Meal Package in Cancellation Modal */}
                        {booking.mealPackage && booking.mealPackage !== 'none' && (
                          <p><span className="font-medium">Meal Package:</span> {
                            booking.mealPackage === 'breakfast' ? 'Breakfast Only' : 
                            booking.mealPackage === 'halfboard' ? 'Half Board' : 
                            'Full Board'
                          }</p>
                        )}
                        
                        {/* Guide Service in Cancellation Modal */}
                        {booking.guide && (
                          <p><span className="font-medium">Guide Service:</span> Included</p>
                        )}
                      </>
                    );
                  }
                  return <p>Loading booking details...</p>;
                })()}
              </div>
            )}
            
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Reason for cancellation (required)"
              className="w-full border rounded p-2 mb-4 h-32"
            />
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeCancellationModal}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleBookingCancel}
                disabled={!cancellationReason.trim()}
                className={`px-4 py-2 rounded ${
                  cancellationReason.trim() 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManager;