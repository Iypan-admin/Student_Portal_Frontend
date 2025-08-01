import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import Classbar from './parts/Classbar';

interface ChatMessage {
  id: number;
  text: string;
  batch_id: string;
  created_at: string;
}

const Chat: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages for the batch
  const fetchMessages = async () => {
    if (!batchId) {
      setError('Invalid batch ID');
      setLoading(false);
      return;
    }

    const url = `https://chat.iypan.com/chats/${batchId}`;
    console.log('Fetching messages from:', url); // Debug log

    try {
      setError(null);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      const data: ChatMessage[] = await response.json();
      setMessages(data);
    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
      let errorMessage = 'Failed to load messages. Please try again.';
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to the server. Ensure the backend is running at http://localhost:3030.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages on mount and when batchId changes
  useEffect(() => {
    fetchMessages();
  }, [batchId]);

  if (!batchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h1 className="text-2xl font-semibold text-gray-900">Error</h1>
            <p className="mt-2 text-gray-600">No batch ID provided.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex">
      <Classbar />
      <div className="flex-1 flex flex-col lg:ml-[calc(68rem/4)]">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 tracking-wide">
                  Class Chat
                </h1>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-lg font-semibold text-white tracking-wide">Messages</h2>
            </div>

            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="mt-4 text-gray-500 font-medium">No messages in this batch yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="border rounded-lg p-4 shadow-sm hover:shadow-md 
                        transition-all duration-300 bg-gray-50"
                    >
                      <p className="text-gray-800 text-sm">{message.text}</p>
                      <div className="flex items-center mt-3 text-xs text-gray-500">
                        <Clock className="h-4 w-4 mr-2" />
                        {new Date(message.created_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
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

export default Chat;