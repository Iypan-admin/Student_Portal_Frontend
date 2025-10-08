import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { register, getStates, getCenters, getBatches, enrollInBatch } from '../services/api';
import { State, Center, Batch } from '../types/auth';
import { Eye, EyeOff } from 'lucide-react';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [states, setStates] = useState<State[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [showBatchPopup, setShowBatchPopup] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    center: '',
    email: '',
    password: '',
    phone: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCenterDisabled, setIsCenterDisabled] = useState(false);


  useEffect(() => {
    const fetchStates = async () => {
      try {
        const data = await getStates();
        setStates(data);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStateId = e.target.value;

    // Clear existing center and disable flag
    setFormData({ ...formData, state: selectedStateId, center: '' });
    setIsCenterDisabled(false); // reset to false initially

    if (selectedStateId) {
      try {
        const data = await getCenters(selectedStateId);
        setCenters(data);

        const selectedState = states.find((s) => s.state_id === selectedStateId);
        const isOnlineMode = selectedState?.state_name.toLowerCase() === 'online';

        // If mode is Online and only one center is available → auto-select and disable
        if (isOnlineMode && data.length === 1) {
          setFormData((prev) => ({
            ...prev,
            center: data[0].center_id,
          }));
          setIsCenterDisabled(true); // 💥 make center dropdown disabled
        }
      } catch (error) {
        console.error('Error fetching centers:', error);
      }
    } else {
      setCenters([]);
    }
  };



  const fetchBatches = async (centerId: string) => {
    try {
      const data = await getBatches(centerId);
      setBatches(data.batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setBatches([]);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: ''
    };

    // Name validation
    if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
      isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
      isValid = false;
    }

    // Confirm password validation
    if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Phone validation
    const phoneRegex = /^\+?\d{7,15}$/; // supports + and 7–15 digits
    if (!phoneRegex.test(formData.phone)) {
    newErrors.phone = 'Please enter a valid phone number (7–15 digits)';
    isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      const response = await register(formData);
      setStudentId(response.student.student_id);
      await fetchBatches(formData.center);
      setShowBatchPopup(true);
      toast.success('Registration successful! Please select a batch.');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    }
  };

  const handleBatchEnroll = async () => {
    if (!selectedBatch || !studentId) {
      toast.error('Please select a batch.');
      return;
    }
    try {
      await enrollInBatch(selectedBatch, studentId);
      toast.success('Enrollment successful, pending approval!');
      setShowBatchPopup(false);
      navigate('/login');
    } catch (error) {
      toast.error('Enrollment failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50"
      style={{
        backgroundImage: 'url("/solid-blue-background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed' // This makes the background image fixed
      }}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm py-2 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <img
            src="/logo.png"
            alt="ISML Logo"
            className="h-12 md:h-16"
          />
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors duration-200"
          >
            Already have an account?
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 mt-24 mb-16">
        <div className="max-w-xl w-full">
          <div className="bg-white shadow-2xl rounded-2xl p-8 sm:p-10">
            <div>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 tracking-tight">
                Register your account
              </h2>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className={`appearance-none block w-full px-4 py-3 border ${errors.name ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm`}
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select
                    id="state"
                    name="state"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm"
                    value={formData.state}
                    onChange={handleStateChange}
                  >
                    <option value="">Select Mode</option>
                    {states.map((state) => (
                      <option key={state.state_id} value={state.state_id}>
                        {state.state_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="center" className="block text-sm font-medium text-gray-700 mb-1">
                    Center
                  </label>
                  <select
                    id="center"
                    name="center"
                    required
                    disabled={!formData.state || isCenterDisabled} // ✅ updated here
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm"
                    value={formData.center}
                    onChange={(e) => setFormData({ ...formData, center: e.target.value })}
                  >
                    <option value="">Select Center</option>
                    {centers.map((center) => (
                      <option key={center.center_id} value={center.center_id}>
                        {center.center_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={`appearance-none block w-full px-4 py-3 border ${errors.email ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm`}
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                {/* Password Field */}
                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={`appearance-none block w-full px-4 py-3 border ${errors.password ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm`}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                {/* Confirm Password Field */}
                <div className="relative mt-4">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={`appearance-none block w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm`}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[38px] text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className={`appearance-none block w-full px-4 py-3 border ${errors.phone ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm`}
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Batch Selection Popup */}
      {showBatchPopup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 tracking-tight">
              Select a Batch
            </h3>
            <select
              className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 sm:text-sm"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_name}
                  {batch.courses ? ` (${batch.courses.language}, ${batch.courses.type}, ${batch.duration})` : ''}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowBatchPopup(false)}
                className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchEnroll}
                className="py-2 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Enroll
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Indian School for Modern Languages. All rights reserved.
          </p>
          <p className="text-center text-sm text-gray-500">
            Version 1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
