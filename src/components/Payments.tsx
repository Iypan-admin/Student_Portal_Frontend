import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  CreditCard,
  Clock,
  Check,
  Receipt,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import {
  getEnrolledBatches,
  getTransactions,
  fetchCourseFees,
  fetchPaymentLockStatus,
  lockPaymentType,
  createRazorpayOrder,
  verifyPayment,
} from "../services/api";
import { Enrollment, PaymentTransaction } from "../types/auth";
import Sidebar from "./parts/Sidebar";
import toast from "react-hot-toast";

// 🔹 Load Razorpay JS dynamically
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Payments = () => {
  const navigate = useNavigate();
  const { token, studentDetails, setToken } = useAuth();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("current");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [paymentType, setPaymentType] = useState<"full" | "emi">("full");
  const [emiMonths, setEmiMonths] = useState(1);
  const [totalFees, setTotalFees] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [finalFees, setFinalFees] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [statusApproved, setStatusApproved] = useState(false);
  const [emiPaidCount, setEmiPaidCount] = useState(0);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);

  const registrationNumber = studentDetails?.registration_number || "";

  // ✅ Payment Success Handler
  const handlePaymentSuccess = async (orderId: string, response: any) => {
    try {
      const verifyRes = await verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      if (verifyRes.success) {
        toast.success("✅ Payment verified successfully!");
        fetchTransactions();
      } else {
        toast.error("⚠️ Payment verification failed");
      }
    } catch (err) {
      console.error("Payment verification failed:", err);
      toast.error("Payment verification failed");
    }
  };

  // ✅ Fetch Course Fees
  useEffect(() => {
    if (registrationNumber) {
      fetchCourseFeesData(registrationNumber);
    }
  }, [registrationNumber]);

  const fetchCourseFeesData = async (regNum: string) => {
    try {
      const res = await fetchCourseFees(regNum);
      setResult(res);
      const fees = res.total_fees || 0;
      const discount = res.discount_percentage || 0;
      const final = res.final_fees || Math.round(fees - fees * (discount / 100));
      setTotalFees(fees);
      setDiscountPercentage(discount);
      setFinalFees(final);
      if (res.duration) setEmiMonths(res.duration);
      setError("");
    } catch (err: any) {
      setResult(null);
      setError(err.message || "Something went wrong");
    }
  };

  // ✅ Payment Lock Check
  useEffect(() => {
    const fetchLockStatus = async () => {
      if (!registrationNumber) return;
      try {
        const json = await fetchPaymentLockStatus(registrationNumber);
        if (json.success && json.data?.payment_type) {
          setPaymentType(json.data.payment_type);
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      } catch {
        console.log("Payment lock check failed.");
        setIsLocked(false);
      }
    };
    fetchLockStatus();
  }, [registrationNumber]);

  const handleLockPayment = async () => {
    if (registrationNumber) {
      try {
        await lockPaymentType(registrationNumber, paymentType);
        setIsLocked(true);
        toast.success("Payment type locked successfully.");
      } catch (error) {
        console.error("Failed to lock payment type:", error);
        toast.error("Failed to lock payment type.");
      }
    }
  };

  // ✅ Razorpay Payment
  const handlePayment = async (amount: number, currentEmi: number = 0) => {
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error("❌ Failed to load Razorpay SDK.");
        return;
      }

      const data = await createRazorpayOrder({
        amount,
        registration_number: registrationNumber,
        student_name: studentDetails?.name || "Unknown",
        email: studentDetails?.email || "student@example.com",
        contact: studentDetails?.phone || "9999999999",
        enrollment_id: selectedEnrollmentId,
        course_name: result?.course_name || "Unknown Course",
        course_duration: result?.duration || 0,
        original_fees: result?.total_fees || 0,
        discount_percentage: result?.discount_percentage || 0,
        final_fees: paymentType === "emi" ? amount : finalFees,
        payment_type: paymentType,
        emi_duration: paymentType === "emi" ? emiMonths : null,
        current_emi: paymentType === "emi" ? currentEmi : null,
      });

      if (!data?.success || !data.order || !data.key) {
        toast.error("❌ Order creation failed.");
        return;
      }

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "ISML",
        description: "Course Fee Payment",
        order_id: data.order.id,
        prefill: {
          name: studentDetails?.name || "Student",
          email: studentDetails?.email || "student@example.com",
          contact: studentDetails?.phone || "9999999999",
        },
        handler: async (response: any) => {
          await handlePaymentSuccess(data.order.id, response);
        },
        modal: {
          ondismiss: () =>
            toast.info("ℹ️ Payment popup closed without completing."),
          escape: true,
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      rzp.on("payment.failed", (response: any) => {
        console.error("Payment Failed:", response.error);
        toast.error("❌ Payment failed. Please try again.");
      });
    } catch (err) {
      console.error("Razorpay error:", err);
      toast.error("❌ Something went wrong while initiating payment.");
    }
  };

  // ✅ Fetch Enrollments
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await getEnrolledBatches(token);
        setEnrollments(response.enrollments ?? []);
        if (response.enrollments?.length > 0) {
          setSelectedEnrollmentId(response.enrollments[0].enrollment_id);
        }
      } catch (error) {
        console.error("Failed to fetch enrollments:", error);
        toast.error("Failed to load enrolled batches.");
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, [token]);

  // ✅ Fetch Transactions
  const fetchTransactions = async () => {
    if (!token || !registrationNumber) return;
    try {
      setLoading(true);
      const response = await getTransactions(token);
      console.log("Transactions API response:", response); // 🔹 ADD THIS
      const txns = response.transactions ?? [];
      setTransactions(txns);

      const fullPaid = txns.some(
        (txn) => txn.payment_type === "full" && txn.status
      );
      setStatusApproved(fullPaid);

      const emiPaid = txns.filter(
        (txn) => txn.payment_type === "emi" && txn.status
      );
      setEmiPaidCount(emiPaid.length);
      setPaidMonths(emiPaid.map((e) => e.current_emi));
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load transactions.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token, registrationNumber]);

  const handleLogout = () => {
    setToken(null);
    navigate("/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white lg:ml-72">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <nav className="bg-white shadow-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 tracking-wide">
                  Payment Management
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-blue-100 mr-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Total Payments
                  </p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {transactions.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-600">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-green-100 mr-3">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Approved
                  </p>
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
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Pending
                  </p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {transactions.filter((t) => !t.status).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="sm:hidden">
              <select
                className="block w-full rounded-md border-gray-200 py-2 pl-3 pr-10 text-base focus:border-blue-600 focus:outline-none focus:ring-blue-600 sm:text-sm"
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
                    onClick={() => setActiveTab("current")}
                    className={`${activeTab === "current"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Make Payment
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`${activeTab === "history"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Receipt className="h-5 w-5 mr-2" />
                    Transaction History
                  </button>
                </nav>
              </div>
            </div>

            {/* Payment & Transaction Content */}
            <div className="w-full mt-4">
              {activeTab === "current" && (
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-white rounded-xl shadow-md overflow-hidden h-full">
                    <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                      <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide">
                        Quick Online Payment
                      </h3>
                    </div>

                    <div className="w-full p-4">
                      {result ? (
                        <div className="bg-white p-4 rounded-md shadow mb-4">
                          {/* Registration & Course */}
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Registration Number
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={result.registration_number}
                              className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm"
                            />
                          </div>

                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Course Name
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={result.course_name}
                              className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm"
                            />
                          </div>

                          {/* Payment Type Selection */}
                          <div className="mb-4 flex items-center">
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

                            {!isLocked && (
                              <button
                                onClick={handleLockPayment}
                                className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                              >
                                Confirm Selection
                              </button>
                            )}
                          </div>

                          {/* Full Fees Section */}
                          {paymentType === "full" && (
                            <div className="bg-gray-50 p-4 rounded-md shadow mb-4">
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Original Fees
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  value={`₹${totalFees}`}
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
                                  value={`${discountPercentage}%`}
                                  className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm"
                                />
                              </div>

                              <div className="mb-4 flex items-center justify-between">
                                <input
                                  type="text"
                                  readOnly
                                  value={`₹${finalFees}`}
                                  className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm mr-4"
                                />
                                <button
                                  className={`px-4 py-2 text-sm rounded border text-white border-transparent transition duration-200 
                                  ${statusApproved ? "bg-green-400 cursor-not-allowed" : "bg-red-600 hover:bg-green-700"}`}
                                  onClick={() => handlePayment(finalFees)}
                                  disabled={statusApproved}
                                >
                                  {statusApproved ? "Paid" : "Pay"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* EMI Section */}
                          {paymentType === "emi" && (
                            <div className="bg-gray-50 p-4 rounded-md shadow mb-4 space-y-2">
                              {Array.from({ length: emiMonths }).map((_, idx) => {
                                const month = idx + 1;
                                const monthlyAmount = Math.round(finalFees / emiMonths);
                                const isPaid = paidMonths.includes(month);
                                const lastPaid = paidMonths.length > 0 ? Math.max(...paidMonths) : 0;
                                const isNextPayMonth = month === lastPaid + 1;
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
                                          ? "bg-green-400 text-white cursor-not-allowed"
                                          : isNextPayMonth
                                            ? "bg-red-600 hover:bg-green-700 text-white"
                                            : "bg-yellow-300 text-gray-800 cursor-not-allowed"}`}
                                      onClick={() => {
                                        if (isNextPayMonth && !isPaid) {
                                          handlePayment(monthlyAmount, month);
                                        }
                                      }}
                                      disabled={isDisabled}
                                    >
                                      {isPaid ? "Paid" : isNextPayMonth ? "Pay Now" : "Upcoming"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 mt-4">{error || "Loading course fee details..."}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h3 className="text-lg sm:text-xl font-semibold text-white tracking-wide">
                      Transaction History
                    </h3>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-6">
                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                          <Receipt className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-600">No transactions found</p>
                        <p className="mt-1 text-xs sm:text-sm text-gray-500">
                          Submit a payment to see it appear here
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-full align-middle">
                          <table className="min-w-full divide-y divide-gray-200 shadow-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                  Transaction ID
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                  Course Name
                                </th>
                                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                  Final Fees
                                </th>
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                  Payment Type
                                </th>
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                  Current EMI
                                </th>
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {transactions.map((txn) => (
                                <tr key={txn.payment_id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-600">{formatDate(txn.created_at)}</td>
                                  <td className="px-4 py-2 text-sm text-center text-gray-600">{txn.payment_id}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{txn.course_name}</td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-600">{txn.final_fees}</td>
                                  <td className="px-4 py-2 text-sm text-center text-gray-600">{txn.payment_type}</td>
                                  <td className="px-4 py-2 text-sm text-center text-gray-600">{txn.current_emi}</td>
                                  <td className="px-4 py-2 text-center">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full shadow-sm ${txn.status ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {txn.status ? 'Approved' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payments;
