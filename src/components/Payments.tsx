import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CreditCard, Clock, Check, AlertCircle, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getEnrolledBatches, postPayment, getTransactions, fetchCourseFees,
  fetchPaymentLockStatus,
  lockPaymentType,
  fetchEliteCard,
} from '../services/api';
import { Enrollment, PaymentRequest, PaymentTransaction } from '../types/auth';
import Sidebar from './parts/Sidebar';
import toast from 'react-hot-toast';


const Payments = () => {
  const navigate = useNavigate();
  const { token, tokenData, setToken, studentDetails } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [transactionId, setTransactionId] = useState('');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [step, setStep] = useState(1);
  const [eliteCard, setEliteCard] = useState(null);
  const enrollment = enrollments.find(
    (e) => e.enrollment_id === selectedEnrollmentId
  ) || null;

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [paymentType, setPaymentType] = useState("full");
  const [emiMonths, setEmiMonths] = useState(1);
  const [paidMonths, setPaidMonths] = useState([]);
  const [totalFees, setTotalFees] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [finalFees, setFinalFees] = useState(0);
  const [isLocked, setIsLocked] = useState(false); // To track if selection is locked
  const [statusApproved, setStatusApproved] = useState(false);
  const [emiPaidCount, setEmiPaidCount] = useState(0);




  // Auto-fetch fees when component mounts
  useEffect(() => {
    const studentDetailsString = localStorage.getItem('studentDetails');

    if (studentDetailsString) {
      try {
        const studentDetails = JSON.parse(studentDetailsString);
        const regNum = studentDetails.registration_number;

        if (regNum) {
          setRegistrationNumber(regNum);
          getCourseFeesFromAPI(regNum); // 👈 Updated call
        } else {
          setError('Registration number not found in studentDetails');
        }
      } catch (err) {
        setError('Invalid studentDetails format');
      }
    } else {
      setError('No login information found');
    }
  }, []);


  // Fetch fees from backend API
  const getCourseFeesFromAPI = async (regNum: string) => {
    try {
      const res = await fetchCourseFees(regNum); // imported from api.ts

      setResult(res);

      const fees = res.total_fees || 0;
      const discount = res.discount_percentage || 0;
      const final = res.final_fees || Math.round(fees - (fees * (discount / 100)));

      setTotalFees(fees);
      setDiscountPercentage(discount);
      setFinalFees(final);

      if (res.duration) {
        setEmiMonths(res.duration);
      }

      setPaidMonths([]);
      setError('');
    } catch (err: any) {
      setResult(null);
      setError(err.message || 'Something went wrong');
    }
  };


  useEffect(() => {
    const fetchLockStatus = async () => {
      if (!result?.registration_number) return;

      try {
        const json = await fetchPaymentLockStatus(result.registration_number);
        if (json.success && json.data?.payment_type) {
          setPaymentType(json.data.payment_type);
          setIsLocked(true); // Lock the payment UI
        } else {
          setIsLocked(false); // Not locked yet
        }
      } catch (err) {
        console.log("Payment lock check failed or not locked yet.");
        setIsLocked(false); // Optional: unlock if error
      }
    };

    fetchLockStatus();
  }, [result]);


  const handleLockPayment = async () => {
    if (registrationNumber) {
      try {
        await lockPaymentType(registrationNumber, paymentType); // Use the imported function
        console.log("Payment type locked successfully.");
      } catch (error) {
        console.error("Failed to lock payment type:", error);
      }
    }
  };



  useEffect(() => {
    const fetchEnrollments = async () => {
      if (token) {
        try {
          setLoading(true);
          const response = await getEnrolledBatches(token);
          setEnrollments(response.enrollments);
          if (response.enrollments.length > 0) {
            setSelectedEnrollmentId(response.enrollments[0].enrollment_id);
          }
        } catch (error) {
          console.error('Failed to fetch enrollments:', error);
          toast.error('Failed to load enrolled batches.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchEnrollments();
  }, [token]);
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



  const fetchTransactions = async () => {
    if (token) {
      try {
        setLoading(true);
        const response = await getTransactions(token);
        setTransactions(response.transactions);

        const txns = response.transactions;
        setTransactions(txns);

        // ✅ Mark as paid if ANY transaction is approved, regardless of duration
        const isAnyPaymentDone = txns.some((txn) => txn.status === true);
        setStatusApproved(isAnyPaymentDone);

        // ✅ Count EMI payments only (duration > 0 && status === true)
        const emiPaid = txns.filter(
          (txn) => txn.status === true && txn.duration > 0
        );
        setEmiPaidCount(emiPaid.length);

      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        toast.error('Failed to load transactions.');
      } finally {
        setLoading(false);
      }
    }
  };







  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentId || !transactionId || !duration) {
      toast.error('Please fill all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const paymentData: PaymentRequest = {
        enrollment_id: selectedEnrollmentId,
        transaction_id: transactionId,
        duration,
      };
      const response = await postPayment(paymentData, token!);
      toast.success(response.message);
      setTransactionId('');
      fetchTransactions();
    } catch (error) {
      console.error('Failed to submit payment:', error);
      toast.error('Payment submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white transition-all duration-300 ease-in-out lg:ml-72">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header - Matches Dashboard */}
        <nav className="bg-white shadow-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 tracking-wide">
                  Payment Management
                </h1>
              </div>
              <div className="flex items-center">

              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Dashboard Stats - White cards with blue accents */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-blue-100 mr-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Payments</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{transactions.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-green-100 mr-3">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {transactions.filter((t) => t.status).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-yellow-100 mr-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {transactions.filter((t) => !t.status).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs - Consistent styling with better mobile support */}
          <div className="mb-6">
            <div className="sm:hidden">
              <select
                className="block w-full rounded-md border-gray-200 py-2 pl-3 pr-10 text-base 
                  focus:border-blue-600 focus:outline-none focus:ring-blue-600 sm:text-sm"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                <option value="current">Make Payment</option>
                <option value="history">Transaction History</option>
              </select>
            </div>
            <div className="hidden sm:block">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('current')}
                    className={`${activeTab === 'current'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Make Payment
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`${activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Receipt className="h-5 w-5 mr-2" />
                    Transaction History
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Content wrapper with consistent width */}
          <div className="w-full">
            {/* Payment Options Page */}
            {activeTab === 'current' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Quick Online Payment */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden h-full">
                  <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide">
                      Quick Online Payment
                    </h3>
                  </div>


                  <div className="aspect-video sm:aspect-[4/5] w-full">
                    {/* Step 1: Show Course & Center only */}
                    {step === 1 && (
                      <>
                        {result ? (
                          <div className="bg-white p-4 rounded-md shadow mt-4">
                            {/* Registration Number */}
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Registration Number
                              </label>
                              <input
                                type="text"
                                readOnly
                                value={result.registration_number}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                              />
                            </div>

                            {/* Course Name */}
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Course Name
                              </label>
                              <input
                                type="text"
                                readOnly
                                value={result.course_name}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                              />
                            </div>

                            <div className="mb-4 flex items-center">
                              {/* Radio Buttons */}
                              <label className="mr-4 font-medium text-gray-700 flex items-center">
                                <input
                                  type="radio"
                                  name="paymentType"
                                  value="full"
                                  checked={paymentType === "full"}
                                  disabled={isLocked}
                                  onChange={() => {
                                    setPaymentType("full");
                                    setPaidMonths([]);
                                  }}
                                  className="mr-1"
                                />
                                Full Fees
                              </label>

                              {result.duration > 1 && (
                                <label className="mr-4 font-medium text-gray-700 flex items-center">
                                  <input
                                    type="radio"
                                    name="paymentType"
                                    value="emi"
                                    checked={paymentType === "emi"}
                                    disabled={isLocked}
                                    onChange={() => {
                                      setPaymentType("emi");
                                      setPaidMonths([]);
                                    }}
                                    className="mr-1 ml-4"
                                  />
                                  Monthly Fees
                                </label>
                              )}

                              {paymentType && !isLocked && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const resJson = await lockPaymentType(result.registration_number, paymentType);
                                      if (resJson.success) {
                                        setIsLocked(true);
                                      } else {
                                        console.error("Lock failed:", resJson.message);
                                      }
                                    } catch (err) {
                                      console.error("Error locking payment:", err);
                                    }
                                  }}
                                  className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  Confirm Selection
                                </button>
                              )}
                            </div>




                            {/* Full Fees Display */}
                            {paymentType === "full" && (
                              <div className="bg-gray-50 p-4 rounded-md shadow mb-4">
                                <div className="mb-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Original Fees
                                  </label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={`₹${result.total_fees}`}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm"
                                  />
                                </div>

                                <div className="mb-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Discount Percentage
                                  </label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={`${result.discount_percentage}%`}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm"
                                  />
                                </div>

                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Final Fees (After Discount)
                                  </label>
                                  <div className="flex items-center justify-between">
                                    <input
                                      type="text"
                                      readOnly
                                      value={`₹${result.final_fees}`}
                                      className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm mr-4"
                                    />
                                    <button
                                      className={`
                                        px-4 py-2 text-sm rounded border text-white border-transparent transition duration-200 
                                        ${statusApproved ? 'bg-green-400 cursor-not-allowed' : 'bg-red-600 hover:bg-green-700'}
                                           `}
                                      onClick={() => setStep(2)}
                                      disabled={statusApproved}
                                    >
                                      {statusApproved ? 'Paid' : 'Pay'}
                                    </button>







                                  </div>
                                </div>
                              </div>
                            )}



                            {paymentType === "emi" && (
                              <div className="bg-gray-50 p-4 rounded-md shadow mb-4">
                                {/* EMI Duration Display */}
                                <div className="mb-3">
                                  <label className="block mb-1 text-sm font-medium text-gray-700">
                                    EMI Duration
                                  </label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={`${emiMonths} month${emiMonths > 1 ? "s" : ""}`}
                                    className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                                  />
                                </div>
                                <div className="mb-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Discount Percentage
                                  </label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={`${result.discount_percentage}%`}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm"
                                  />
                                </div>

                                {/* Monthly EMI Buttons */}
                                <div className="space-y-2">
                                  {Array.from({ length: emiMonths }).map((_, idx) => {
                                    const month = idx + 1;
                                    const monthlyAmount = Math.round(finalFees / emiMonths);

                                    // ✅ Get all EMI payments that are marked paid
                                    const paidDurations = transactions
                                      .filter((txn) => txn.status === true && txn.duration > 0)
                                      .map((txn) => txn.duration);

                                    const isPaid = paidDurations.includes(month);
                                    const lastPaid = paidDurations.length > 0 ? Math.max(...paidDurations) : 0;

                                    // ✅ Only allow the next unpaid EMI month to be paid
                                    const isNextPayMonth = month === lastPaid + 1;

                                    // ✅ Disable button if already paid or it's not the next EMI month
                                    const isDisabled = isPaid || !isNextPayMonth;

                                    return (
                                      <div
                                        key={month}
                                        className="flex items-center justify-between px-4 py-2 border rounded-md bg-white shadow-sm"
                                      >
                                        <div className="text-sm font-medium text-gray-800">
                                          Month {month} - ₹{monthlyAmount}
                                        </div>

                                        <button
                                          className={`px-4 py-1 text-sm font-medium rounded transition duration-200 
          ${isPaid
                                              ? 'bg-green-400 text-white cursor-not-allowed'
                                              : isNextPayMonth
                                                ? 'bg-red-600 hover:bg-green-700 text-white'
                                                : 'bg-yellow-300 text-gray-800 cursor-not-allowed'
                                            }`}
                                          onClick={() => {
                                            if (isNextPayMonth && !isPaid) setStep(2);
                                          }}
                                          disabled={isDisabled}
                                        >
                                          {isPaid
                                            ? 'Paid'
                                            : isNextPayMonth
                                              ? 'Pay Now'
                                              : 'Upcoming'}
                                        </button>
                                      </div>
                                    );
                                  })}



                                </div>
                              </div>
                            )}





                          </div>
                        ) : error ? (
                          <div className="text-red-600 mt-4 font-medium">
                            ⚠️ Error: {error}
                          </div>
                        ) : (
                          <p className="text-gray-500 mt-4">Loading course fee details...</p>
                        )}
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <AlertCircle className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <p className="text-xs sm:text-sm text-blue-700">
                                1. Make secure payment through Razorpay in the next step<br />
                                2. Copy the transaction ID received after payment<br />
                                3. Submit the ID in the manual payment form to complete registration
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Step 2: Razorpay iframe only */}
                    {step === 2 && (
                      <div className="flex flex-col h-full">
                        <div className="flex justify-start mb-2">
                          <button
                            className="px-3 py-1 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                            onClick={() => setStep(1)}
                          >
                            ← Back
                          </button>
                        </div>
                        <iframe
                          src="https://pages.razorpay.com/learnwithisml"
                          className="w-full h-full border-0 rounded-lg"
                          title="Razorpay Payment Form"
                          allowFullScreen
                        />
                      </div>
                    )}


                  </div>
                </div>


                {/* Right Column - Manual Payment */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden h-full">
                  <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide">
                      Submit Manual Payment
                    </h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    <form onSubmit={handleSubmitPayment} className="space-y-4 sm:space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Enrollment
                        </label>
                        <select
                          value={selectedEnrollmentId}
                          onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-200 rounded-md 
                            shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                          disabled={loading || enrollments.length === 0}
                        >
                          {enrollments.length === 0 ? (
                            <option>No enrollments available</option>
                          ) : (
                            enrollments.map((enrollment) => (
                              <option key={enrollment.enrollment_id} value={enrollment.enrollment_id}>
                                {enrollment.batches.batch_name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-200 rounded-md 
                            shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                          placeholder="Enter transaction ID from your payment"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (months)
                        </label>
                        <input
                          type="number"
                          id="duration"
                          name="duration"
                          className="block w-full px-3 py-2 border border-gray-200 rounded-md 
                            shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                          placeholder="Enter duration in months (0-12)"
                          value={duration}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (value >= 0 && value <= 12) {
                              setDuration(value);
                            }
                          }}
                          min="0"
                          max="12"
                          required
                        />
                      </div>
                      {/* Duration Input Field */}
                      <button
                        type="submit"
                        disabled={submitting || loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent 
                          rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 
                          hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 
                          focus:ring-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed 
                          transition-all duration-200"
                      >
                        {submitting ? 'Processing...' : 'Submit Payment'}
                      </button>
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm text-blue-700">
                              After making a payment through any method, submit the transaction ID here to register your payment.
                            </p>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction History Page - Using same width constraints as payment tab */}
            {activeTab === 'history' && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                  <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide">
                    Transaction History
                  </h3>
                </div>
                <div className="p-4 sm:p-6">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                        <Receipt className="h-6 w-6 text-blue-600" />
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-600">No transactions found</p>
                      <p className="mt-1 text-xs sm:text-sm text-gray-500">Submit a payment to see it appear here</p>
                    </div>
                  ) : (
                    <div className="mt-2 sm:mt-4">
                      <div className="overflow-x-auto -mx-4 sm:-mx-6">
                        <div className="inline-block min-w-full py-2 align-middle px-4 sm:px-6">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Date
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Transaction ID
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Batch
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {transactions.map((transaction) => (
                                <tr key={transaction.payment_id} className="hover:bg-blue-50/50">
                                  <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                    {formatDate(transaction.created_at)}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                    {transaction.transaction_id}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                    {enrollments.find((e) => e.enrollment_id === transaction.enrollment_id)?.batches
                                      ?.batch_name || 'N/A'}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${transaction.status
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                        }`}
                                    >
                                      {transaction.status ? 'Approved' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main >
      </div >
    </div >
  );
};

export default Payments;