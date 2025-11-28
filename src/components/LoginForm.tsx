import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogIn, Key } from 'lucide-react';
import { login, forgotPassword, resetPassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User } from 'lucide-react';

const LoginForm = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [formData, setFormData] = useState({
    registration_number: '',
    password: '',
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login(formData);
      setToken(response.token);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error details:', error);
      // Show actual error message from backend
      const errorMessage = error.message || error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registration_number) {
      toast.error('Please enter your registration number');
      return;
    }

    try {
      await forgotPassword(formData.registration_number);
      toast.success('Password reset instructions sent to your email');
      setShowForgotPassword(false);
      setShowResetPassword(true);
    } catch (error) {
      toast.error('Failed to process forgot password request');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await resetPassword(resetToken, newPassword);
      toast.success('Password reset successful! Please login with your new password');
      setShowResetPassword(false);
      setResetToken('');
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Forgot Password</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your registration number to receive password reset instructions
            </p>
          </div>
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-6">
            <div>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm"
                placeholder="Registration Number"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Login
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Send Instructions
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter the reset token from your email and your new password
            </p>
          </div>
          <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
            <div className="space-y-4">
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm"
                placeholder="Reset Token"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm"
                placeholder="New Password"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Login
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Password
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50"
      style={{
        backgroundImage: 'url("/solid-blue-background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
      {/* Header */}
      <div className="w-full bg-white shadow-sm py-2">
        <div className="max-w-7xl mx-auto px-4">
          <img
            src="/logo.png"
            alt="ISML Logo"
            className="h-12 md:h-16"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-2xl rounded-2xl p-8 sm:p-10">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600 mb-8">
                Sign in to continue your learning journey
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Registration Number Field with icon on right */}
                <div className="relative mb-4">
                  <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    id="registration_number"
                    name="registration_number"
                    type="text"
                    required
                    className="appearance-none block w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter your registration number"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  />
                  {/* User icon on right */}
                  <User className="absolute right-3 top-[38px] text-gray-400" size={18} />
                </div>


                {/* Password Field with show/hide toggle */}
                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="appearance-none block w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {/* Toggle icon */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Sign in
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-all duration-200"
              >
                Forgot password?
              </button>
              <button
                onClick={() => navigate('/register')}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-all duration-200"
              >
                Create account
              </button>
            </div>
          </div>

          {/* Trust Indicators */}

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-4">
            <a
              href="https://www.indianschoolformodernlanguages.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
            >
              Terms & Conditions
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="https://www.indianschoolformodernlanguages.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
            >
              Privacy Policy
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="https://www.indianschoolformodernlanguages.com/shipping"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
            >
              Shipping Policy
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="https://www.indianschoolformodernlanguages.com/refund"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
            >
              Refund & Cancellation Policy
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="https://www.indianschoolformodernlanguages.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
            >
              Contact Us
            </a>
          </div>
          <p className="text-center text-sm text-gray-500">
            © 2025 Indian School for Modern Languages. All rights reserved.
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Version 1.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LoginForm;