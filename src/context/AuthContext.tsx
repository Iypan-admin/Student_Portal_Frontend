// authcontext.ts
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TokenPayload, StudentDetails } from '../types/auth';

// Update the AuthContextType to include the decoded token data and student details
interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  tokenData: TokenPayload | null;
  studentDetails: StudentDetails | null; // Add studentDetails
  setStudentDetails: (details: StudentDetails | null) => void; // Add setter for studentDetails
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  isAuthenticated: false,
  tokenData: null,
  studentDetails: null,
  setStudentDetails: () => {},
});

// Function to decode the JWT token
const decodeToken = (token: string): TokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [tokenData, setTokenData] = useState<TokenPayload | null>(() => {
    const savedToken = localStorage.getItem('token');
    return savedToken ? decodeToken(savedToken) : null;
  });
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(() => {
    const savedDetails = localStorage.getItem('studentDetails');
    return savedDetails ? JSON.parse(savedDetails) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      const decoded = decodeToken(token);
      setTokenData(decoded);
      // Optionally, save tokenData to localStorage if needed
      localStorage.setItem('tokenData', JSON.stringify(decoded));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenData');
      setTokenData(null);
    }
  }, [token]);

  useEffect(() => {
    if (studentDetails) {
      localStorage.setItem('studentDetails', JSON.stringify(studentDetails));
    } else {
      localStorage.removeItem('studentDetails');
    }
  }, [studentDetails]);

  return (
    <AuthContext.Provider value={{ token, setToken, isAuthenticated: !!token, tokenData, studentDetails, setStudentDetails }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);