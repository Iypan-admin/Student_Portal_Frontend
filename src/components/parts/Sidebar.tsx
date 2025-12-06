import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStudentDetails, fetchEliteCard } from '../../services/api';
import { StudentDetails } from '../../types/auth';
import { Menu, X } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const { token, tokenData, setToken } = useAuth();
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [eliteCard, setEliteCard] = useState(null);



  useEffect(() => {
    const getEliteCard = async () => {
      if (studentDetails?.registration_number) {
        try {
          const data = await fetchEliteCard(studentDetails.registration_number);
          if (data.success) {
            setEliteCard(data.data);
          }
        } catch (err) {
          console.error("Elite Card Fetch Error:", err);
        }
      }
    };

    getEliteCard();
  }, [studentDetails]);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (token && tokenData?.student_id) {
        try {
          setLoading(true);
          const details = await getStudentDetails(tokenData.student_id);
          setStudentDetails(details);
        } catch (error) {
          console.error('Failed to fetch student details:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudentDetails();
  }, [token, tokenData]);

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  return (
    <>
      {/* Hamburger Button - Enhanced styling with rounded background */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white/90 backdrop-blur-sm 
          rounded-full text-gray-700 hover:text-blue-800 transition-all duration-300 
          shadow-md hover:shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar - Refined gradient and shadow */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 
          lg:translate-x-0 ${!isOpen ? '-translate-x-full' : 'translate-x-0'}
          w-72 lg:w-64 bg-gradient-to-b from-blue-950 to-blue-900 text-white 
          flex flex-col shadow-2xl`}
      >
        {/* Header - Added logo/icon space and better typography */}
        <div className="pt-6 px-6">
          <div className="flex items-center gap-3 mb-6">
            {/* Placeholder for logo/icon */}
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">S</span>
            </div>
            <h2 className="text-xl font-semibold tracking-wide">Student Portal</h2>
          </div>
        </div>

        {/* Main Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-4">
          <ul className="space-y-1">
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Payments', href: '/payments' },
            ].map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="block py-2.5 px-4 rounded-lg text-sm font-medium 
                    hover:bg-blue-800/50 hover:text-blue-100 transition-all 
                    duration-200 ease-in-out"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Student Profile Section with Logout */}
        <div className="sticky bottom-0 p-3 md:p-6 lg:p-6 bg-blue-950/80 backdrop-blur-sm 
  border-t border-blue-800/50 space-y-2 md:space-y-4 lg:space-y-4">

          {/* Title */}
          <h3 className="text-sm md:text-base lg:text-base font-semibold mb-2 md:mb-3 lg:mb-3 text-blue-200 tracking-wide">
            Student Profile
          </h3>

          {/* Student Basic Details */}
          {loading ? (
            <p className="text-xs md:text-sm lg:text-sm text-blue-300/70 italic animate-pulse">
              Loading details...
            </p>
          ) : studentDetails ? (
            <div className="space-y-1 md:space-y-1.5 lg:space-y-1.5 text-xs md:text-sm lg:text-sm">
              <p className="flex items-center gap-1 md:gap-2 lg:gap-2">
                <span className="font-medium text-blue-200 w-12 md:w-16 lg:w-16">Name:</span>
                <span className="text-blue-100">{studentDetails.name}</span>
              </p>
              <p className="flex items-center gap-1 md:gap-2 lg:gap-2">
                <span className="font-medium text-blue-200 w-12 md:w-16 lg:w-16">Email:</span>
                <span className="text-blue-100">{studentDetails.email}</span>
              </p>
              <p className="flex items-center gap-1 md:gap-2 lg:gap-2">
                <span className="font-medium text-blue-200 w-12 md:w-16 lg:w-16">Reg No:</span>
                <span className="text-blue-100">{studentDetails.registration_number}</span>
              </p>
              <p className="flex items-center gap-1 md:gap-2 lg:gap-2">
                <span className="font-medium text-blue-200 w-12 md:w-16 lg:w-16">Center:</span>
                <span className="text-blue-100">{studentDetails.center.center_name}</span>
              </p>

              {/* 🎖️ Elite Card Details Section */}
              <div className="pt-2 md:pt-3 lg:pt-3 mt-2 md:mt-3 lg:mt-3 border-t border-blue-800/30">
                <h4 className="text-xs md:text-sm lg:text-sm font-semibold text-blue-300 mb-1 md:mb-2 lg:mb-2">
                  Elite Card Details
                </h4>
                <p className="flex items-center gap-1 md:gap-2 lg:gap-2">
                  <span className="font-medium text-blue-200 w-12 md:w-16 lg:w-16">Card Type:</span>
                  <span className="text-blue-100">{eliteCard?.card_type || 'N/A'}</span>
                </p>
                <p className="flex items-center gap-1 md:gap-2 lg:gap-2">
                  <span className="font-medium text-blue-200 w-12 md:w-16 lg:w-16">Card No:</span>
                  <span className="text-blue-100">{eliteCard?.card_number || 'N/A'}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs md:text-sm lg:text-sm text-red-400 font-medium">
              Unable to load details.
            </p>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full mt-2 md:mt-4 lg:mt-4 py-2 md:py-2.5 lg:py-2.5 px-3 md:px-4 lg:px-4 rounded-lg text-xs md:text-sm lg:text-sm font-medium
      bg-red-600/20 hover:bg-red-600/70 text-red-100
      transition-all duration-200 ease-in-out
      border border-red-500/30 hover:border-red-500/50"
          >
            Logout
          </button>
        </div>

      </div>
    </>
  );
};

export default Sidebar;