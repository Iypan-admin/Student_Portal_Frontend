import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './parts/Sidebar';
import {
  getStudentDetails,
  getEnrolledBatches,
  getNotifications,
  markNotificationAsRead,
} from '../services/api';
import { Enrollment } from '../types/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const { setToken, token, tokenData, studentDetails, setStudentDetails } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch student details
  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!tokenData?.student_id) return;
      try {
        const details = await getStudentDetails(tokenData.student_id);
        setStudentDetails(details);
      } catch (err) {
        console.error('Failed to fetch student details:', err);
      }
    };
    fetchStudentDetails();
  }, [tokenData, setStudentDetails]);

  // Fetch enrolled batches
  useEffect(() => {
    const fetchEnrolledBatches = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await getEnrolledBatches(token);
        setEnrollments(res.enrollments || []);
      } catch (err) {
        console.error('Failed to fetch enrolled batches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEnrolledBatches();
  }, [token]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      try {
        setNotifLoading(true);
        const res = await getNotifications(token);
        if (res.success) setNotifications(res.data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setNotifLoading(false);
      }
    };
    fetchNotifications();
  }, [token]);

  // Handle notification click
  const handleNotificationClick = async (notifId: string) => {
    if (!token) return;
    try {
      const res = await markNotificationAsRead(notifId, token);
      if (res.success) {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        setShowDropdown(false);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  const handleTileClick = (enrollment: Enrollment) => {
    if (enrollment.status) {
      navigate(`/class/${enrollment.batches.batch_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white lg:ml-72">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <nav className="bg-white shadow-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left Section */}
              <h1 className="text-xl font-semibold text-gray-900 tracking-wide flex items-center">
                Student Dashboard
              </h1>

              {/* Right Section */}
              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <div className="relative mr-10 sm:mr-6 lg:mr-0">
                  <button
                    className="relative p-2 rounded-full hover:bg-gray-100"
                    onClick={() => setShowDropdown(prev => !prev)}
                  >
                    <Bell className="w-6 h-6 text-gray-700" />
                    {notifications.length > 0 && (
                      <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      {notifLoading ? (
                        <p className="p-2 text-sm text-gray-500">Loading...</p>
                      ) : notifications.length === 0 ? (
                        <p className="p-2 text-sm text-gray-500">No notifications</p>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            className="p-3 border-b text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleNotificationClick(notif.id)}
                          >
                            {notif.message}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>


        {/* Dashboard Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto py-8 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8 tracking-wide">
              Your Enrolled Batches
            </h2>

            {loading ? (
              <p className="text-gray-500 text-lg italic animate-pulse">Loading batches...</p>
            ) : enrollments.length === 0 ? (
              <p className="text-gray-500 text-lg italic">You are not enrolled in any batches.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map(enrollment => (
                  <div
                    key={enrollment.enrollment_id}
                    className={`bg-white border border-gray-100 rounded-xl p-6 shadow-md transition-all duration-300 ${enrollment.status
                      ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                      : 'opacity-75 cursor-not-allowed'
                      }`}
                    onClick={() => handleTileClick(enrollment)}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 tracking-tight">
                      {enrollment.batches.batch_name}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 w-20">Teacher:</span>
                        <span>{enrollment.batches.teachers?.users?.name || 'Not assigned'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 w-20">Course:</span>
                        <span>{enrollment.batches.courses.course_name}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 w-20">Program:</span>
                        <span>{enrollment.batches.courses.program}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 w-20">Mode:</span>
                        <span>{enrollment.batches.courses.mode}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 w-20">Duration:</span>
                        <span>{enrollment.batches.duration}</span>
                      </p>
                      <div className="mt-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${enrollment.status
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {enrollment.status ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
