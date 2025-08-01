// api.ts
import axios from 'axios';
import {
  LoginData,
  RegisterData,
  AuthResponse,
  State,
  Center,
  StudentDetails,
  EnrolledBatchesResponse,
  ClassMeet,
  Note,
  BatchDetails,
  PaymentRequest,
  TransactionResponse,
  TransactionsResponse,
} from '../types/auth';

const API_URL = 'https://student.iypan.com/api';

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await axios.post(`${API_URL}/students/register`, data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await axios.post(`${API_URL}/students/login`, data);
  return response.data;
};

export const getStates = async (): Promise<State[]> => {
  const response = await axios.get(`${API_URL}/students/states`);
  return response.data;
};

export const getCenters = async (stateId: string): Promise<Center[]> => {
  const response = await axios.get(`${API_URL}/students/centers?state_id=${stateId}`);
  return response.data;
};

export const getStudentDetails = async (studentId: string): Promise<StudentDetails> => {
  try {
    const response = await axios.post(`${API_URL}/students/details`, { student_id: studentId });
    return response.data.student;
  } catch (error) {
    console.error('Error fetching student details:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const getEnrolledBatches = async (token: string): Promise<EnrolledBatchesResponse> => {
  try {
    const response = await axios.get(`${API_URL}/batches/enrolled`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching enrolled batches:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const getBatchDetails = async (batchId: string, token: string): Promise<BatchDetails | null> => {
  try {
    const response = await getEnrolledBatches(token);
    const enrollment = response.enrollments.find(
      (enrollment) => enrollment.batches.batch_id === batchId
    );
    return enrollment ? enrollment.batches : null;
  } catch (error) {
    console.error('Error fetching batch details:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const getClassMeets = async (batchId: string, token: string): Promise<ClassMeet[]> => {
  try {
    const response = await axios.get(`${API_URL}/classes/gmeets/${batchId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching class meets:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const getNotes = async (batchId: string, token: string): Promise<Note[]> => {
  try {
    const response = await axios.get(`${API_URL}/classes/notes/${batchId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('API response for notes:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching notes:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// New function to submit a payment request
export const postPayment = async (paymentData: PaymentRequest, token: string): Promise<TransactionResponse> => {
  try {
    const response = await axios.post(`${API_URL}/payments/`, paymentData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting payment:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// New function to get all transactions for the student
export const getTransactions = async (token: string): Promise<TransactionsResponse> => {
  try {
    const response = await axios.get(`${API_URL}/payments/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const getBatches = async (centerId: string): Promise<any> => {
  try {
    console.log(`Requesting batches for centerId: ${centerId}`);
    const response = await axios.post(`${API_URL}/batches/list`, {
      center: centerId,
    });
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching batches:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const enrollInBatch = async (batchId: string, studentId: string): Promise<any> => {
  const response = await axios.post(`${API_URL}/batches/enroll`, {
    batch_id: batchId,
    student_id: studentId,
  });
  return response.data;
};

export const forgotPassword = async (registration_number: string) => {
  const response = await fetch(`${API_URL}/students/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ registration_number }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to process forgot password request');
  }
  
  return response.json();
};

export const resetPassword = async (token: string, newPassword: string) => {
  const response = await fetch(`${API_URL}/students/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to reset password');
  }
  
  return response.json();
};

export const fetchCourseFees = async (registrationNumber: string) => {
  const res = await axios.get(`${API_URL}/student-course-fees/${registrationNumber}`);
  return res.data;
};

export const fetchPaymentLockStatus = async (registrationNumber: string) => {
  const res = await fetch(`${API_URL}/payment-lock/${registrationNumber}`);
  return res.json();
};

export const lockPaymentType = async (registrationNumber: string, paymentType: string) => {
  try {
    const res = await fetch(`${API_URL}/payment-lock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        register_number: registrationNumber,
        payment_type: paymentType,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Error in lockPaymentType:", error);
    throw error;
  }
};



export const fetchEliteCard = async (registration_number: string) => {
  try {
    const response = await fetch(`${API_URL}/students/elite-card/${registration_number}`);
    const data = await response.json();
    return data; // { success: true/false, data: { card_type, card_number } }
  } catch (error) {
    console.error("❌ API fetchEliteCard error:", error);
    throw error;
  }
};
