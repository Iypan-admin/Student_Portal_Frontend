import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBatchDetails } from '../../services/api';
import { BatchDetails } from '../../types/auth';
import { Menu, X, LogOut } from 'lucide-react';

const Classbar = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (batchId && token) {
        try {
          setLoading(true);
          const details = await getBatchDetails(batchId, token);
          setBatchDetails(details);
        } catch (error) {
          console.error('Failed to fetch batch details:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBatchDetails();
  }, [batchId, token]);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <>
      {/* Hamburger Button - Matches Sidebar styling */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white/90 backdrop-blur-sm 
          rounded-full text-gray-700 hover:text-blue-800 transition-all duration-300 
          shadow-md hover:shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Classbar - Dark blue gradient matching Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-blue-950 to-blue-900 
          text-white flex flex-col shadow-2xl transition-transform duration-300 
          ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Header - Matches Sidebar with icon placeholder */}
        <div className="pt-6 px-6">
          <div className="flex items-center gap-3 mb-6">
            {/* Placeholder for icon, blue to match Sidebar */}
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">C</span>
            </div>
            <h2 className="text-xl font-semibold tracking-wide">Class Portal</h2>
          </div>
        </div>

        {/* Main Content - Menu styling matches Sidebar */}
        <div className="flex-1 overflow-y-auto px-4">
          <ul className="space-y-1">
            {[
              { label: 'Class Schedule', href: `/class/${batchId}` },
              { label: 'Resources', href: `/class/${batchId}/resources` },
              { label: 'Chat', href: `/class/${batchId}/chat` },
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

        {/* Batch Info with Back to Dashboard Button */}
        <div className="sticky bottom-0 p-6 bg-blue-950/80 backdrop-blur-sm border-t border-blue-800/50">
          <h3 className="text-base font-semibold mb-3 text-blue-200 tracking-wide">
            Batch Information
          </h3>
          {loading ? (
            <p className="text-sm text-blue-300/70 italic animate-pulse">
              Loading details...
            </p>
          ) : batchDetails ? (
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2">
                <span className="font-medium text-blue-200 w-20">Batch:</span>
                <span className="text-blue-100">{batchDetails.batch_name}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium text-blue-200 w-20">Teacher:</span>
                <span className="text-blue-100">
                  {batchDetails.teachers?.users?.name || 'Not assigned'}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium text-blue-200 w-20">Course:</span>
                <span className="text-blue-100">{batchDetails.courses.course_name}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium text-blue-200 w-20">Program:</span>
                <span className="text-blue-100">{batchDetails.courses.program}</span>
              </p>

              {/* Back to Dashboard Button */}
              <button
                onClick={handleBackToDashboard}
                className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 px-4 
                  bg-blue-600/20 hover:bg-blue-600/70 rounded-lg text-sm font-medium 
                  text-blue-100 transition-all duration-200 ease-in-out
                  border border-blue-500/30 hover:border-blue-500/50"
              >
                <LogOut className="h-4 w-4 rotate-180" />
                Back to Dashboard
              </button>
            </div>
          ) : (
            <p className="text-sm text-red-400 font-medium">
              Unable to load details.
            </p>
          )}
        </div>

      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Classbar;