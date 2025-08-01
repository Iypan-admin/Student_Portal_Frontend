import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotes } from '../services/api';
import { Note } from '../types/auth';
import Classbar from './parts/Classbar';
import toast from 'react-hot-toast';

const Notes = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { token, setToken } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notes for the batch
  useEffect(() => {
    const fetchNotes = async () => {
      if (batchId && token) {
        try {
          setLoading(true);
          setError(null);
          const fetchedNotes = await getNotes(batchId, token);
          console.log('Fetched notes:', fetchedNotes); // Debug: Log the API response
          setNotes(fetchedNotes || []); // Ensure notes is always an array
        } catch (error: any) {
          console.error('Failed to fetch notes:', error);
          const errorMessage =
            error.response?.data?.message || 'Failed to load notes. Please try again later.';
          setError(errorMessage);
          toast.error(errorMessage);
        } finally {
          setLoading(false);
        }
      } else {
        setError('Missing batch ID or authentication token.');
        toast.error('Missing batch ID or authentication token.');
        setLoading(false);
      }
    };

    fetchNotes();
  }, [batchId, token]);

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex">
      <Classbar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-[calc(68rem/4)]">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 tracking-wide">
                  Class Notes & Resources
                </h1>
              </div>
              <div className="flex items-center">
                
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-lg font-semibold text-white tracking-wide">Available Resources</h2>
            </div>
            
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-medium">No notes available for this batch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map((note) => (
                    <div
                      key={note.notes_id}
                      className="border rounded-lg p-5 shadow-sm hover:shadow-md 
                        transition-all duration-300 bg-gray-50"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {note.title || 'Untitled Note'}
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Date:</span>{' '}
                          {note.created_at
                            ? new Date(note.created_at).toLocaleDateString()
                            : 'N/A'}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Description:</span>{' '}
                          {note.note || 'No description available.'}
                        </p>
                      </div>
                      {note.link && (
                        <div className="mt-4">
                          <a
                            href={note.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm 
                              font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                          >
                            View Resource
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notes;