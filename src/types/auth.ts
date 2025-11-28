// auth.ts

// ------------------------ AUTH ------------------------
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TokenPayload {
  student_id: string;
  center: string;
  state: string;
  iat: number;
  exp: number;
}

// ------------------------ STUDENT ------------------------
export interface StudentDetails {
  student_id: string;
  created_at: string;
  registration_number: string;
  name: string;
  email: string;
  password: string;
  phone: number;
  status: boolean;
  state: {
    state_id: string;
    created_at: string;
    state_name: string;
    state_admin: string;
    academic_coordinator: string;
  };
  center: {
    state: string;
    center_id: string;
    created_at: string;
    center_name: string;
    center_admin: string;
  };
}

// ------------------------ AUTH FORMS ------------------------
export interface RegisterData {
  name: string;
  state: string;
  center: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginData {
  registration_number: string;
  password: string;
}

// ------------------------ STATE & CENTER ------------------------
export interface State {
  state_id: string;
  state_name: string;
}

export interface Center {
  center_id: string;
  center_name: string;
}

// ------------------------ BATCHES & COURSES ------------------------
export interface Batch {
  batch_id: string;
  created_at: string;
  batch_name: string;
  language: string;
  type: string;
  duration: number;
  center: string;
  teacher: string;
}

export interface Course {
  course_name: string;
  type: string;
  language: string;
  level: string;
  mode: string;
  program: string;
}

export interface BatchDetails {
  batch_id: string;
  batch_name: string;
  created_at: string;
  duration: string;
  courses: Course;
  centers: {
    center_id: string;
    center_name: string;
  };
  teachers: {
    teacher_id: string;
    users: {
      name: string;
    };
  };
}

// ------------------------ ENROLLMENTS ------------------------
export interface Enrollment {
  enrollment_id: string;
  created_at: string;
  student: string;
  status: boolean;
  end_date: string;
  batches: BatchDetails;
}

export interface EnrolledBatchesResponse {
  enrollments: Enrollment[];
}

// ------------------------ CLASSES ------------------------
export interface ClassMeet {
  meet_id: string;
  created_at: string;
  batch_id: string;
  meet_link: string;
  date: string;
  time: string;
  current: boolean;
  note: string;
  title: string;
}

export interface Note {
  notes_id: string;
  created_at: string;
  link: string;
  batch_id: string;
  title: string;
  note: string;
}

// ------------------------ PAYMENTS ------------------------
export interface PaymentRequest {
  enrollment_id: string;
  transaction_id: string;
  duration: number;
}

export interface PaymentTransaction {
  payment_id: string;
  created_at: string;
  transaction_id?: string; // Optional (legacy field)
  duration?: number; // Optional (legacy field)
  status: boolean; // Admin approval
  enrollment_id: string;
  registration_number?: string;
  student_name?: string;
  email?: string;
  contact?: string;
  course_name?: string;
  course_duration?: number;
  original_fees?: number;
  discount_percentage?: number;
  final_fees?: number;
  payment_type?: "full" | "emi";
  emi_duration?: number | null;
  current_emi?: number | null;
  order_id?: string;
  bank_rrn?: string | null;
  // Optional relation if needed
  enrollment?: {
    enrollment_id: string;
    batch: string;
    student: string;
    status: boolean;
    end_date: string | null;
    created_at: string;
  };
}

export interface TransactionResponse {
  message: string;
  transaction: PaymentTransaction[];
}

export interface TransactionsResponse {
  transactions: PaymentTransaction[];
}
