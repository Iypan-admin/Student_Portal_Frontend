import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  getPaymentStatus,
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
  const [isPaying, setIsPaying] = useState(false); // for disabling buttons during payment

  const registrationNumber = studentDetails?.registration_number || "";

  // ✅ Payment Success Handler
  const handlePaymentSuccess = async (orderId: string, response: any) => {
    // 🔹 CRITICAL: Store payment data IMMEDIATELY in localStorage (before any async operations)
    // This ensures data is saved even if user closes page during 3 second wait
    const paymentData = {
      orderId,
      response,
      timestamp: new Date().toISOString(),
      verified: false // Will be set to true after verification
    };
    localStorage.setItem("pending_payment", JSON.stringify(paymentData));

    // 🔹 Show success message immediately (don't wait for verification)
    toast.success("✅ Payment successful! Verifying...");

    // 🔹 Start verification in background (fire-and-forget style)
    // Don't block the UI - webhook will also handle this
    verifyPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    })
      .then((verifyRes) => {
        if (verifyRes.success) {
          console.log("✅ Frontend verification successful");
          // Update localStorage to mark as verified
          paymentData.verified = true;
          localStorage.setItem("pending_payment", JSON.stringify(paymentData));
          
          // Update transactions in UI
          fetchTransactions();
          
          toast.success("✅ Payment verified successfully!");
        } else {
          console.log("⚠️ Frontend verification failed, but webhook will handle it");
          // Don't show error - webhook will store payment automatically
        }
      })
      .catch((err) => {
        console.error("⚠️ Frontend verification error (webhook will handle):", err);
        // Don't show error - webhook will store payment automatically
      });

    // 🔹 Wait 3 seconds before redirect (user can close page - webhook will handle storage)
    setTimeout(() => {
      // Remove page block overlay
      window.onbeforeunload = null;
      const overlay = document.getElementById("payment-block-overlay");
      if (overlay) overlay.remove();

      // Redirect to payments page
      window.location.href = "/payments";
    }, 3000); // 3 seconds delay
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
      if (!res) return toast.error("❌ Failed to load Razorpay SDK.");

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

      if (!data?.success || !data.order || !data.key) return toast.error("❌ Order creation failed.");

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
          // 🔹 Start page block immediately
          window.onbeforeunload = (e) => {
            e.preventDefault();
            e.returnValue = "⚠️ Payment is processing, please wait...";
            return "⚠️ Payment is processing, please wait...";
          };

          const overlay = document.createElement("div");
          overlay.id = "payment-block-overlay";
          overlay.style.position = "fixed";
          overlay.style.top = "0";
          overlay.style.left = "0";
          overlay.style.width = "100%";
          overlay.style.height = "100%";
          overlay.style.zIndex = "9999";
          overlay.style.backgroundColor = "rgba(255,255,255,0.4)";
          document.body.appendChild(overlay);

          // 🔹 Call the payment verification
          await handlePaymentSuccess(data.order.id, response);
        },
        modal: {
          ondismiss: () =>
            toast.error("ℹ️ Payment popup closed without completing."),
          escape: true,
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new (window as any).Razorpay(options);
      
      // 🔹 Additional error handlers
      rzp.on("payment.authorized", () => {
        console.log("✅ Payment authorized");
      });
      
      rzp.on("payment.captured", () => {
        console.log("✅ Payment captured");
      });
      
      rzp.open();

      rzp.on("payment.failed", (response: any) => {
        console.error("Payment Failed:", response.error);
        const errorDescription = response.error?.description || response.error?.reason || "";
        const errorCode = response.error?.code || "";
        
        // 🔹 Check for domain registration error
        if (errorDescription.includes("website does not match") || 
            errorDescription.includes("registered website") ||
            errorCode === "BAD_REQUEST_ERROR") {
          toast.error("❌ Payment blocked: Domain not registered in Razorpay. Please contact admin.", {
            duration: 5000,
          });
          console.error("🔴 CRITICAL: Domain registration issue in Razorpay dashboard");
          console.error("🔴 Error details:", {
            code: errorCode,
            description: errorDescription,
            fullError: response.error
          });
        } else if (errorDescription.includes("network") || errorDescription.includes("timeout")) {
          toast.error("❌ Network error. Please check your connection and try again.");
        } else if (errorDescription.includes("insufficient") || errorDescription.includes("balance")) {
          toast.error("❌ Insufficient balance. Please check your account.");
        } else {
          toast.error(`❌ Payment failed: ${errorDescription || "Unknown error"}. Please try again.`);
        }
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
      setPaidMonths(emiPaid.map((e) => e.current_emi).filter((emi): emi is number => emi !== null && emi !== undefined));
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

  // ✅ Check for pending payments on page load (if user closed page during payment)
  useEffect(() => {
    const checkPendingPayment = async () => {
      const pendingPaymentStr = localStorage.getItem("pending_payment");
      if (pendingPaymentStr && token) {
        try {
          const pendingPayment = JSON.parse(pendingPaymentStr);
          const { orderId, response, verified, timestamp } = pendingPayment;
          
          // Check if payment is older than 5 minutes (likely already processed by webhook)
          const paymentTime = new Date(timestamp).getTime();
          const now = new Date().getTime();
          const minutesDiff = (now - paymentTime) / (1000 * 60);
          
          if (minutesDiff > 5) {
            // Payment is old, likely already processed by webhook
            console.log("🔄 Old pending payment found, checking transactions...");
            fetchTransactions();
            localStorage.removeItem("pending_payment");
            return;
          }

          // If already verified, just refresh transactions
          if (verified) {
            console.log("✅ Payment already verified, refreshing transactions...");
            fetchTransactions();
            localStorage.removeItem("pending_payment");
            return;
          }

          console.log("🔄 Found pending payment, attempting verification...");
          
          const verifyRes = await verifyPayment({
            razorpay_order_id: orderId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (verifyRes.success) {
            toast.success("✅ Payment verified successfully!");
            localStorage.removeItem("pending_payment");
            fetchTransactions();
          } else {
            // 🔹 ADVANCED: Poll payment status from Razorpay API as backup
            console.log("⚠️ Verification failed, polling payment status from Razorpay...");
            
            let pollCount = 0;
            const maxPolls = 5; // Poll 5 times (25 seconds total)
            const pollInterval = 5000; // 5 seconds between polls
            
            const pollPaymentStatus = async () => {
              try {
                const statusRes = await getPaymentStatus(response.razorpay_payment_id);
                
                if (statusRes.success && statusRes.payment?.in_database) {
                  // Payment found in database (webhook stored it)
                  console.log("✅ Payment found in database via polling!");
                  toast.success("✅ Payment confirmed!");
                  localStorage.removeItem("pending_payment");
                  fetchTransactions();
                  return true; // Stop polling
                }
                
                pollCount++;
                if (pollCount < maxPolls) {
                  // Continue polling
                  setTimeout(pollPaymentStatus, pollInterval);
                } else {
                  // Max polls reached, check transactions one last time
                  console.log("⚠️ Max polls reached, checking transactions...");
                  fetchTransactions();
                  setTimeout(() => {
                    fetchTransactions(); // Check again after 5 more seconds
                    localStorage.removeItem("pending_payment");
                  }, 5000);
                }
              } catch (pollErr) {
                console.error("Polling error:", pollErr);
                pollCount++;
                if (pollCount < maxPolls) {
                  setTimeout(pollPaymentStatus, pollInterval);
                } else {
                  fetchTransactions();
                  localStorage.removeItem("pending_payment");
                }
              }
            };
            
            // Start polling after 3 seconds (give webhook time)
            setTimeout(pollPaymentStatus, 3000);
          }
        } catch (err) {
          console.error("Pending payment verification failed:", err);
          
          // 🔹 ADVANCED: Poll payment status as backup
          try {
            const pendingPayment = JSON.parse(pendingPaymentStr);
            if (pendingPayment?.response?.razorpay_payment_id) {
              let pollCount = 0;
              const maxPolls = 5;
              const pollInterval = 5000;
              
              const pollPaymentStatus = async () => {
                try {
                  const statusRes = await getPaymentStatus(pendingPayment.response.razorpay_payment_id);
                
                if (statusRes.success && statusRes.payment?.in_database) {
                  console.log("✅ Payment found in database via polling!");
                  toast.success("✅ Payment confirmed!");
                  localStorage.removeItem("pending_payment");
                  fetchTransactions();
                  return true;
                }
                
                pollCount++;
                if (pollCount < maxPolls) {
                  setTimeout(pollPaymentStatus, pollInterval);
                } else {
                  fetchTransactions();
                  localStorage.removeItem("pending_payment");
                }
              } catch (pollErr) {
                console.error("Polling error:", pollErr);
                pollCount++;
                if (pollCount < maxPolls) {
                  setTimeout(pollPaymentStatus, pollInterval);
                } else {
                  fetchTransactions();
                  localStorage.removeItem("pending_payment");
                }
              }
            };
            
            setTimeout(pollPaymentStatus, 3000);
            } else {
              // No payment ID, just check transactions
              setTimeout(() => {
                fetchTransactions();
                localStorage.removeItem("pending_payment");
              }, 3000);
            }
          } catch (parseErr) {
            // Failed to parse, just check transactions
            setTimeout(() => {
              fetchTransactions();
              localStorage.removeItem("pending_payment");
            }, 3000);
          }
        }
      }
    };

    if (token && registrationNumber) {
      // Wait a bit for webhook to process (if user closed page)
      setTimeout(() => {
        checkPendingPayment();
      }, 2000); // 2 second delay to allow webhook to process
    }
  }, [token, registrationNumber]);

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
                                {/* Full Fees */}
                                <button
                                  className={`px-4 py-2 text-sm rounded border text-white border-transparent transition duration-200 
  ${statusApproved || isPaying || !isLocked ? "bg-green-400 cursor-not-allowed" : "bg-red-600 hover:bg-green-700"}`}
                                  onClick={async () => {
                                    setIsPaying(true); // disable button immediately
                                    await handlePayment(finalFees);
                                    setIsPaying(false);
                                  }}
                                  disabled={statusApproved || isPaying || !isLocked}
                                >
                                  {statusApproved ? "Paid" : isPaying ? "Processing..." : !isLocked ? "Please Confirm Selection" : "Pay"}
                                </button>
                              </div>
                              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
                                <div className="flex">
                                  <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-xs sm:text-sm text-blue-700 space-y-1">
                                      ⚠️ Important Payment Instructions:<br />
                                      1. After completing the payment, the page will automatically redirect in ~5 seconds.<br />
                                      2. <strong>Do not refresh or close the page</strong> until the redirection occurs.<br />
                                      3. After redirection, you will see the payment marked as <strong>Verified</strong> on the top right.<br />
                                      4. Please wait patiently until verification completes; closing or refreshing may cause payment issues.
                                    </p>
                                  </div>
                                </div>
                              </div>

                            </div>
                          )}

                          {/* EMI Section */}
                          {paymentType === "emi" && (
                            <div className="bg-gray-50 p-4 rounded-md shadow mb-4 space-y-2">

                              {/* EMI Month Buttons */}
                              {Array.from({ length: emiMonths }).map((_, idx) => {
                                const month = idx + 1;
                                const monthlyAmount = Math.round(finalFees / emiMonths);
                                const isPaid = paidMonths.includes(month);
                                const lastPaid = paidMonths.length > 0 ? Math.max(...paidMonths) : 0;
                                // For EMI: Only enable first month initially, then sequential after payments
                                const isNextPayMonth = paidMonths.length === 0 ? month === 1 : month === lastPaid + 1;
                                // Disable if not locked, already paid, not next month, or currently paying
                                const isDisabled = !isLocked || isPaid || !isNextPayMonth || isPaying;

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
                                          : !isLocked
                                            ? "bg-gray-400 text-white cursor-not-allowed"
                                            : isNextPayMonth
                                              ? isPaying ? "bg-yellow-400 text-white cursor-not-allowed" : "bg-red-600 hover:bg-green-700 text-white"
                                              : "bg-yellow-300 text-gray-800 cursor-not-allowed"}`}
                                      onClick={async () => {
                                        if (isNextPayMonth && !isPaid && isLocked) {
                                          setIsPaying(true);
                                          await handlePayment(monthlyAmount, month);
                                          setIsPaying(false);
                                        }
                                      }}
                                      disabled={isDisabled}
                                    >
                                      {isPaid ? "Paid" : !isLocked ? "Please Confirm Selection" : isNextPayMonth ? (isPaying ? "Processing..." : "Pay Now") : "Upcoming"}
                                    </button>
                                  </div>
                                );
                              })}

                              {/* ⚠️ Payment Disclaimer at bottom */}
                              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
                                <div className="flex">
                                  <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-xs sm:text-sm text-blue-700 space-y-1">
                                      ⚠️ Important Payment Instructions:<br />
                                      1. After completing the payment, the page will automatically redirect in ~5 seconds.<br />
                                      2. <strong>Do not refresh or close the page</strong> until the redirection occurs.<br />
                                      3. After redirection, you will see the payment marked as <strong>Verified</strong> on the top right.<br />
                                      4. Please wait patiently until verification completes; closing or refreshing may cause payment issues.
                                    </p>
                                  </div>
                                </div>
                              </div>

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
        </main >
      </div >
    </div >
  );
};

export default Payments;
