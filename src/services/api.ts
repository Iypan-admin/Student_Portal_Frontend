// api.ts
import axios from "axios";
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
} from "../types/auth";

// const API_URL = "http://localhost:3006/api";
const API_URL = "https://student.iypan.com/api"

// Axios instance
const API = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});
// 🔐 Global response interceptor – AUTO LOGOUT on token expiry
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired. Logging out...");

      // Clear auth data
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// ------------------------ AUTH ------------------------
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await API.post("/students/register", data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await API.post("/students/login", data);
    return response.data;
  } catch (error: any) {
    console.error("Login API Error:", error.response?.data || error.message);
    // Throw error with backend message for better error handling
    throw new Error(error.response?.data?.error || error.message || "Login failed");
  }
};

// ------------------------ STUDENT / CENTER ------------------------
export const getStates = async (): Promise<State[]> => {
  const response = await API.get("/students/states");
  return response.data;
};

export const getCenters = async (stateId: string): Promise<Center[]> => {
  const response = await API.get(`/students/centers?state_id=${stateId}`);
  return response.data;
};

export const getStudentDetails = async (studentId: string): Promise<StudentDetails> => {
  try {
    const response = await API.post("/students/details", { student_id: studentId });
    return response.data.student;
  } catch (error: any) {
    console.error("Error fetching student details:", error.response?.data || error.message);
    throw error;
  }
};

// ------------------------ BATCHES ------------------------
export const getEnrolledBatches = async (token: string): Promise<EnrolledBatchesResponse> => {
  try {
    const response = await API.get("/batches/enrolled", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching enrolled batches:", error.response?.data || error.message);
    throw error;
  }
};

export const getBatchDetails = async (batchId: string, token: string): Promise<BatchDetails | null> => {
  const response = await getEnrolledBatches(token);
  const enrollment = response.enrollments.find(
    (e) => e.batches.batch_id === batchId
  );
  return enrollment ? enrollment.batches : null;
};

export const getClassMeets = async (batchId: string, token: string): Promise<ClassMeet[]> => {
  try {
    const response = await API.get(`/classes/gmeets/${batchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching class meets:", error.response?.data || error.message);
    throw error;
  }
};

export const getNotes = async (batchId: string, token: string): Promise<Note[]> => {
  try {
    const response = await API.get(`/classes/notes/${batchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching notes:", error.response?.data || error.message);
    throw error;
  }
};

export const getBatches = async (centerId: string): Promise<any> => {
  try {
    const response = await API.post("/batches/list", { center: centerId });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching batches:", error.response?.data || error.message);
    throw error;
  }
};

export const enrollInBatch = async (batchId: string, studentId: string): Promise<any> => {
  const response = await API.post("/batches/enroll", { batch_id: batchId, student_id: studentId });
  return response.data;
};

// ------------------------ PASSWORD ------------------------
export const forgotPassword = async (registration_number: string) => {
  const res = await fetch(`${API_URL}/students/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registration_number }),
  });
  if (!res.ok) throw new Error("Failed to process forgot password request");
  return res.json();
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await fetch(`${API_URL}/students/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) throw new Error("Failed to reset password");
  return res.json();
};

// ------------------------ FEES / PAYMENTS ------------------------
export const fetchCourseFees = async (registrationNumber: string) => {
  const res = await API.get(`/student-course-fees/${registrationNumber}`);
  return res.data;
};

export const fetchPaymentLockStatus = async (registrationNumber: string) => {
  const res = await fetch(`${API_URL}/payment-lock/${registrationNumber}`);
  return res.json();
};

export const lockPaymentType = async (registrationNumber: string, paymentType: string) => {
  const res = await fetch(`${API_URL}/payment-lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ register_number: registrationNumber, payment_type: paymentType }),
  });
  if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
  return res.json();
};

export const postPayment = async (paymentData: PaymentRequest, token: string): Promise<TransactionResponse> => {
  try {
    const response = await API.post("/payments/", paymentData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error submitting payment:", error.response?.data || error.message);
    throw error;
  }
};

export const getTransactions = async (token: string): Promise<TransactionsResponse> => {
  try {
    // Remove trailing slash
    const response = await axios.get(`${API_URL}/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Make sure transactions is always an array
    const transactionsData = Array.isArray(response.data.transactions) ? response.data.transactions : [];

    // Normalize status to boolean
    const transactions = transactionsData.map((txn: any) => ({
      ...txn,
      status: txn.status === true || txn.status === "true",
    }));

    return { transactions };
  } catch (error: any) {
    console.error('Error fetching transactions:', error.response?.data || error.message);
    return { transactions: [] }; // fallback to empty array
  }
};


// ------------------------ ELITE CARD ------------------------
export const fetchEliteCard = async (registration_number: string) => {
  try {
    const res = await fetch(`${API_URL}/students/elite-card/${registration_number}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("API fetchEliteCard error:", error);
    throw error;
  }
};

// ------------------------ RAZORPAY ------------------------
export const createRazorpayOrder = async (payload: any) => {
  try {
    const { data } = await API.post("/razorpay/create-order", payload);
    return data;
  } catch (error: any) {
    console.error("API createRazorpayOrder error:", error.response?.data || error.message);
    return { success: false, message: "Failed to create order" };
  }
};

export const verifyPayment = async (paymentData: any) => {
  try {
    const { data } = await API.post("/razorpay/verify", paymentData);
    return data;
  } catch (error: any) {
    console.error("Verify Payment Error:", error.response?.data || error.message);
    return { success: false, message: "Verification failed" };
  }
};

export const getPaymentStatus = async (paymentId: string) => {
  try {
    const { data } = await API.get(`/razorpay/status/${paymentId}`);
    return data;
  } catch (error: any) {
    console.error("Get Payment Status Error:", error.response?.data || error.message);
    return { success: false, message: "Could not fetch status" };
  }
};

// 🔹 Advanced: Reconcile payments (find missed payments)
export const reconcilePayments = async (enrollmentId?: string, orderId?: string) => {
  try {
    const params = new URLSearchParams();
    if (enrollmentId) params.append("enrollment_id", enrollmentId);
    if (orderId) params.append("order_id", orderId);
    
    const { data } = await API.get(`/razorpay/reconcile?${params.toString()}`);
    return data;
  } catch (error: any) {
    console.error("Reconcile Payments Error:", error.response?.data || error.message);
    return { success: false, message: "Could not reconcile payments" };
  }
};
// ------------------------ NOTIFICATIONS ------------------------

// Fetch unread notifications
export const getNotifications = async (token: string | null) => {
  if (!token) {
    console.error("No token provided for fetching notifications.");
    return { success: false, data: [] };
  }

  try {
    const response = await API.get("/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // { success: true, data: [...] }
  } catch (error: any) {
    console.error(
      "Error fetching notifications:",
      error.response?.data || error.message
    );
    return { success: false, data: [] };
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (id: string, token: string | null) => {
  if (!token) {
    console.error("No token provided for marking notification as read.");
    return { success: false };
  }

  try {
    // Use {} instead of null for PATCH data
    const response = await API.patch(`/notifications/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // { success: true, data: [...] }
  } catch (error: any) {
    console.error(
      "Error marking notification as read:",
      error.response?.data || error.message
    );
    return { success: false };
  }
};
