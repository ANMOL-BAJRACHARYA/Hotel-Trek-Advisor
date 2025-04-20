import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Booking from "./pages/Booking";
import Profile from "./pages/Profile";
import OfflineMaps from "./pages/OfflineMaps";
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute';
import QRCode from "react-qr-code";

// Layout component for the app with conditional navbar
const AppLayout = ({ children, pathname }) => {
  const isAdminRoute = pathname.startsWith('/admin');
  
  return (
    <div className="flex flex-col min-h-screen">
      {!isAdminRoute && <Navbar />}
      <div className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <AppLayout pathname="/">
              <Home />
            </AppLayout>
          } />
          <Route path="/search" element={
            <AppLayout pathname="/search">
              <Search />
            </AppLayout>
          } />
          <Route path="/booking" element={
            <AppLayout pathname="/booking">
              <UserProtectedRoute>
                <Booking />
              </UserProtectedRoute>
            </AppLayout>
          } />
          <Route path="/profile" element={
            <AppLayout pathname="/profile">
              <UserProtectedRoute>
                <Profile />
              </UserProtectedRoute>
            </AppLayout>
          } />
          <Route path="/offline-maps" element={
            <AppLayout pathname="/offline-maps">
              <OfflineMaps />
            </AppLayout>
          } />
          <Route path="/admin/login" element={
            <AppLayout pathname="/admin/login">
              <AdminLogin />
            </AppLayout>
          } />
          <Route path="/admin/dashboard" element={
            <AppLayout pathname="/admin/dashboard">
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
