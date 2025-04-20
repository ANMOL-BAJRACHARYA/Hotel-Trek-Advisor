import { useState, useEffect } from 'react';
import axios from 'axios';
import BookingManager from '../components/BookingManager';
import MapUpload from '../components/admin/MapUpload';
import { Link, useNavigate } from 'react-router-dom';

// Admin-specific navbar component
const AdminNavbar = ({ currentUser, refreshCurrentUser }) => {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    email: '',
    phone: ''
  });
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      });
    }
  }, [currentUser]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/admin/login');
  };
  
  const handleProfileUpdate = async () => {
    try {
      setUpdating(true);
      setUpdateMessage('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await axios.post('/api/users/update-profile', profileData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUpdateMessage('Profile updated successfully!');
      setEditMode(false);
      
      // Refresh user data
      if (refreshCurrentUser) {
        refreshCurrentUser();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setUpdateMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-gray-800 to-black p-4 shadow-md mb-6">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-white text-2xl font-bold mr-2">🏨</span>
          <span className="text-white text-xl font-bold">Hotel Trek Admin</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/admin" className="text-white hover:text-gray-300 transition px-3 py-2">
            Dashboard
          </Link>
          
          {currentUser && (
            <div 
              className="flex items-center bg-gray-700 rounded-full px-3 py-1 mr-2 cursor-pointer hover:bg-gray-600 transition-colors"
              onClick={() => setShowProfileModal(true)}
            >
              <div className="flex items-center space-x-2">
                <div className="bg-indigo-500 rounded-full h-8 w-8 flex items-center justify-center">
                  <span className="text-white font-medium">{currentUser.username.charAt(0).toUpperCase()}</span>
                </div>
                <div className="text-white">
                  <p className="text-sm font-medium">{currentUser.username}</p>
                  <p className="text-xs text-gray-300">{currentUser.role}</p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-md transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Admin Profile Modal */}
      {showProfileModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Admin Profile</h3>
                <button 
                  onClick={() => {
                    setShowProfileModal(false);
                    setEditMode(false);
                    setUpdateMessage('');
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-indigo-500 rounded-full h-20 w-20 flex items-center justify-center">
                  <span className="text-white text-3xl font-medium">{currentUser.username.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              
              {updateMessage && (
                <div className={`mb-4 p-2 rounded text-sm ${updateMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {updateMessage}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="font-medium">{currentUser.username}</p>
                </div>
                
                <div className="border-b pb-2">
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium">{currentUser.role}</p>
                </div>
                
                <div className="border-b pb-2">
                  <p className="text-sm text-gray-500">Email</p>
                  {editMode ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="font-medium">{currentUser.email || 'admin@hoteltrek.com'}</p>
                  )}
                </div>
                
                <div className="border-b pb-2">
                  <p className="text-sm text-gray-500">Contact</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="font-medium">{currentUser.phone || '+1 (555) 123-4567'}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-3 bg-gray-50 flex justify-between">
              {editMode ? (
                <>
                  <button 
                    onClick={() => setEditMode(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleProfileUpdate}
                    disabled={updating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setEditMode(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button 
                    onClick={() => {
                      setShowProfileModal(false);
                      setEditMode(false);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('hotels');
  const [images, setImages] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchImages();
    fetchCurrentUser();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get('/api/admin/images');
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentUser(response.data);
        
        // Redirect to change password page if it's first login
        if (response.data.isFirstLogin) {
          setActiveTab('password');
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select an image');
      return;
    }

    if (!title || !location || !price) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', location);
    formData.append('price', price);

    try {
      await axios.post('/api/admin/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setTitle('');
      setDescription('');
      setLocation('');
      setPrice('');
      setSelectedFile(null);
      // Reset the file input
      document.getElementById('imageInput').value = '';
      fetchImages();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return;

    try {
      await axios.delete(`/api/admin/images/${imageId}`);
      fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error deleting hotel');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('Token used for authorization:', token);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('User data from localStorage:', { ...userData, password: '[REDACTED]' });
      
      if (!token) {
        alert('You are not logged in. Please log in again.');
        return;
      }
      
      console.log('Sending password change request...');
      
      let success = false;
      let errorMessage = '';
      
      // First try the standard route with authentication
      try {
        const response = await axios.post('/api/users/change-password', {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Password change response:', response.data);
        success = true;
      } catch (error) {
        console.error('Standard password change failed:', error);
        
        if (error.response?.status === 401) {
          console.log('Authentication failed, trying simplified route...');
          
          // If authentication fails, try the simplified route
          try {
            const username = userData.username || token;
            const simplifiedResponse = await axios.post('/api/users/simple-change-password', {
              username,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
            console.log('Simplified password change response:', simplifiedResponse.data);
            success = true;
          } catch (simplifiedError) {
            console.error('Simplified password change also failed:', simplifiedError);
            errorMessage = simplifiedError.response?.data?.message || 'Failed to change password';
          }
        } else {
          errorMessage = error.response?.data?.message || 'Failed to change password';
        }
      }
      
      if (success) {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      alert('Password changed successfully');
      
      if (currentUser?.isFirstLogin) {
        setActiveTab('hotels');
        fetchCurrentUser();
        }
      } else {
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.message || 'Failed to change password');
    }
  };

  // Handle emergency password reset
  const handleEmergencyReset = async () => {
    try {
      if (!confirm("WARNING: This will reset your password without verifying your current password. Continue?")) {
        return;
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        alert('New password must be at least 6 characters');
        return;
      }
      
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const username = userData.username || token || 'admin';
      
      console.log('Attempting emergency password reset for username:', username);
      
      const response = await axios.post('/api/users/reset-password', {
        username: username,
        newPassword: passwordData.newPassword
      });
      
      console.log('Emergency password reset response:', response.data);
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      alert('Password reset successfully');
      
      if (currentUser?.isFirstLogin) {
        setActiveTab('hotels');
        fetchCurrentUser();
      }
    } catch (error) {
      console.error('Emergency password reset failed:', error);
      alert(`Emergency reset failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const refreshCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentUser(response.data);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <AdminNavbar currentUser={currentUser} refreshCurrentUser={refreshCurrentUser} />
      <div className="container mx-auto px-4 py-4">
      <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      </div>

      {/* Tab Navigation */}
        <div className="mb-8 bg-white rounded-lg shadow-md">
          <nav className="flex">
          <button
            onClick={() => setActiveTab('hotels')}
              className={`py-4 px-6 font-medium text-sm rounded-tl-lg ${
              activeTab === 'hotels'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Hotels
          </button>
          <button
            onClick={() => setActiveTab('maps')}
              className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'maps'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
           Maps
          </button>
          <button
            onClick={() => setActiveTab('password')}
              className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'password'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
           Change Password
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
              className={`py-4 px-6 font-medium text-sm rounded-tr-lg ${
              activeTab === 'bookings'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Bookings
          </button>
        </nav>
      </div>

      {activeTab === 'hotels' ? (
        <>
          {/* Hotel Upload Form */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Hotel</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Hotel Name *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Location *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., Kathmandu, Nepal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price per Night *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[$,]/g, '');
                      // Only allow numbers and decimal point
                      if (/^\d*\.?\d*$/.test(value)) {
                        setPrice(value);
                      }
                    }}
                    className="block w-full rounded-md border border-gray-300 pl-7 pr-12 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">/night</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  rows="3"
                  placeholder="Describe the hotel and its amenities"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Hotel Image *</label>
                <input
                  id="imageInput"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Adding Hotel...' : 'Add Hotel'}
              </button>
            </form>
          </div>

          {/* Hotel Listings */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Hotel Listings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((hotel) => (
                <div key={hotel.id} className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <div className="relative">
                    <img
                      src={hotel.path}
                      alt={hotel.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 m-2 rounded-full">
                      ${hotel.price}/night
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800">{hotel.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {hotel.location}
                    </p>
                    <p className="text-gray-500 text-sm mt-2 line-clamp-2">{hotel.description}</p>
                    <button
                      onClick={() => handleDelete(hotel.id)}
                      className="mt-4 w-full bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors duration-200"
                    >
                      Delete Hotel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : activeTab === 'maps' ? (
       <MapUpload />
       ) : 
       activeTab === 'password' ? (
      <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
              <div className="space-y-2">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Change Password
            </button>
                
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Having trouble changing your password?</p>
                  <button
                    type="button"
                    onClick={handleEmergencyReset}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Emergency Password Reset
                  </button>
                  <p className="text-xs text-gray-400 mt-1">Note: This will reset your password without verifying your current password.</p>
                </div>
              </div>
          </form>
        </div>
      ) : 
       
      (
        <BookingManager />
      )}
      </div>
    </div>
  );
};

export default AdminPanel;
