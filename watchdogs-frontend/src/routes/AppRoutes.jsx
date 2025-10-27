import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from '@components/common/LoadingScreen';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';

// Lazy load pages for better performance
const HomePage = lazy(() => import('@pages/Home/HomePage'));
const SignIn = lazy(() => import('@pages/Auth/SignIn/SignIn'));
const SignUp = lazy(() => import('@pages/Auth/SignUp/SignUp'));
const Dashboard = lazy(() => import('@pages/Dashboard/Dashboard'));
const Profile = lazy(() => import('@pages/Profile/ProfilePage'));
const Settings = lazy(() => import('@pages/Settings/SettingsPage'));
const Alerts = lazy(() => import('@pages/Alerts/AlertsPage'));
const Emergency = lazy(() => import('@pages/Emergency/EmergencyPage'));
const NotFound = lazy(() => import('@pages/NotFound/NotFound'));
const DigitalIDGenerationPage = lazy(() => import('@pages/DigitalID/DigitalIDGenerationPage'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <HomePage />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signin" 
          element={
            <PublicRoute restricted>
              <SignIn />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signup" 
          element={
            <PublicRoute restricted>
              <SignUp />
            </PublicRoute>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/alerts" 
          element={
            <PrivateRoute>
              <Alerts />
            </PrivateRoute>
          } 
        />

        <Route 
        path="/generate-digital-id" 
        element={
        <PrivateRoute>
          <DigitalIDGenerationPage />
        </PrivateRoute>
      } 
      />
        
        <Route 
          path="/emergency" 
          element={
            <PrivateRoute>
              <Emergency />
            </PrivateRoute>
          } 
        />
        
        {/* Fallback Routes */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;