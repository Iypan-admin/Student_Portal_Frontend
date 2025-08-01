import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, Calendar, Clock, CheckCircle, CalendarDays, CalendarClock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClassMeets } from '../services/api';
import { ClassMeet } from '../types/auth';
import Classbar from './parts/Classbar';

const Class = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { token, setToken } = useAuth();
  const [classMeets, setClassMeets] = useState<ClassMeet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'previous', or 'upcoming'

  // Fetch Google Meet classes for the batch
  useEffect(() => {
    const fetchClassMeets = async () => {
      if (batchId && token) {
        try {
          setLoading(true);
          const meets = await getClassMeets(batchId, token);
          setClassMeets(meets);
        } catch (error) {
          console.error('Failed to fetch class meets:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchClassMeets();
  }, [batchId, token]);

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  // Filter classes based on the active tab
  const currentClasses = classMeets.filter(meet => {
    const today = new Date().toLocaleDateString();
    const meetDate = new Date(meet.date).toLocaleDateString();
    return meetDate === today;
  });

  const previousClasses = classMeets.filter(meet => {
    const today = new Date();
    const meetDate = new Date(meet.date);
    return meetDate < today && meetDate.toLocaleDateString() !== today.toLocaleDateString();
  });

  const upcomingClasses = classMeets.filter(meet => {
    const today = new Date();
    const meetDate = new Date(meet.date);
    return meetDate > today;
  });

  // Get the classes to display based on active tab
  const getClassesToDisplay = () => {
    switch (activeTab) {
      case 'current':
        return currentClasses;
      case 'previous':
        return previousClasses;
      case 'upcoming':
        return upcomingClasses;
      default:
        return currentClasses;
    }
  };

  // Count totals for stat cards
  const totalClasses = classMeets.length;
  const totalCompletedClasses = previousClasses.length;
  const totalUpcomingClasses = upcomingClasses.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex">
      <Classbar />
      
      {/* Main Content Area - Added left margin for desktop */}
      <div className="flex-1 flex flex-col lg:ml-[calc(68rem/4)]"> {/* 16rem (Sidebar) + 18rem (Classbar) = 34rem */}
        {/* Navigation Bar */}
        <nav className="bg-white shadow-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 tracking-wide">
                  Class Schedule
                </h1>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium 
                    text-gray-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg 
                    transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content - Adjusted container max-width and padding */}
        <main className="flex-1 w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Dashboard Stats - White cards with blue accents */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-blue-100 mr-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalClasses}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-green-100 mr-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalCompletedClasses}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-yellow-100 mr-3">
                  <CalendarClock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalUpcomingClasses}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="sm:hidden">
              <select
                className="block w-full rounded-md border-gray-200 py-2 pl-3 pr-10 text-base 
                  focus:border-blue-600 focus:outline-none focus:ring-blue-600 sm:text-sm"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                <option value="current">Today's Classes</option>
                <option value="previous">Previous Classes</option>
                <option value="upcoming">Upcoming Classes</option>
              </select>
            </div>
            <div className="hidden sm:block">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('current')}
                    className={`${
                      activeTab === 'current'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Today's Classes
                  </button>
                  <button
                    onClick={() => setActiveTab('previous')}
                    className={`${
                      activeTab === 'previous'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <CalendarDays className="h-5 w-5 mr-2" />
                    Previous Classes
                  </button>
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`${
                      activeTab === 'upcoming'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <CalendarClock className="h-5 w-5 mr-2" />
                    Upcoming Classes
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Content wrapper with consistent width */}
          <div className="w-full">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : getClassesToDisplay().length === 0 ? (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                  <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide">
                    {activeTab === 'current' ? "Today's Classes" : 
                     activeTab === 'previous' ? "Previous Classes" : "Upcoming Classes"}
                  </h3>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="text-center py-6 sm:py-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                      {activeTab === 'current' ? <Calendar className="h-6 w-6 text-blue-600" /> : 
                       activeTab === 'previous' ? <CalendarDays className="h-6 w-6 text-blue-600" /> :
                       <CalendarClock className="h-6 w-6 text-blue-600" />}
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-600">No classes found</p>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500">
                      {activeTab === 'current' ? "No classes scheduled for today." : 
                       activeTab === 'previous' ? "No previous classes found." : "No upcoming classes scheduled."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                  <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide">
                    {activeTab === 'current' ? "Today's Classes" : 
                     activeTab === 'previous' ? "Previous Classes" : "Upcoming Classes"}
                  </h3>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getClassesToDisplay().map((meet) => (
                      <div
                        key={meet.meet_id}
                        className={`border rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 ${
                          activeTab === 'current' ? 'bg-blue-50' : 
                          activeTab === 'previous' ? 'bg-gray-50' : 'bg-green-50'
                        }`}
                      >
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 tracking-tight">
                          {meet.title}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                            <p className="text-xs sm:text-sm text-gray-700">{meet.date}</p>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-500 mr-2" />
                            <p className="text-xs sm:text-sm text-gray-700">{meet.time}</p>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 mt-3">
                          <span className="font-medium">Note:</span> {meet.note}
                        </p>
                        <div className="mt-4">
                          <a
                            href={meet.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block px-4 py-2 text-white text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                              activeTab === 'current' 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : activeTab === 'previous'
                                  ? 'bg-gray-600 hover:bg-gray-700'
                                  : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            {activeTab === 'previous' ? 'View Recording' : 'Join Meeting'}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Class;