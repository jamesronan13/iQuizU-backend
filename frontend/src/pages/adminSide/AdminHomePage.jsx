import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Upload, BarChart3, Home, UserPlus, CheckCircle, X } from "lucide-react";
import { auth, db } from "../../firebase/firebaseConfig";
import { createUserWithEmailAndPassword, updateCurrentUser, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { setAccountCreationFlag } from "../../App";
import LOGO from "../../assets/iQuizU.svg";

export default function AdminHomePage() {
  const navigate = useNavigate();

  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // ✅ CRITICAL: Set flag BEFORE creating account
    setAccountCreationFlag(true);

    try {
      // ✅ Step 1: Save current admin user
      const currentAdmin = auth.currentUser;

      // ✅ Step 2: Create teacher account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        teacherEmail,
        teacherPassword
      );
      const teacherUser = userCredential.user;

      // ✅ Step 3: Store teacher info in Firestore
      await setDoc(doc(db, "users", teacherUser.uid), {
        email: teacherEmail,
        uid: teacherUser.uid,
        authUID: teacherUser.uid,
        role: "teacher",
        createdAt: new Date().toISOString(),
      });

      // ✅ Step 4: Restore admin session (IMPORTANT!)
      await updateCurrentUser(auth, currentAdmin);

      // ✅ Step 5: Reset form and show success
      setSuccessMsg(`Teacher account created successfully: ${teacherEmail}`);
      setShowSuccessDialog(true);
      setTeacherEmail("");
      setTeacherPassword("");

      // Auto-close dialog after 3 seconds
      setTimeout(() => {
        setShowSuccessDialog(false);
        setSuccessMsg("");
      }, 3000);
    } catch (error) {
      console.error("Error creating teacher:", error);
      if (error.code === "auth/email-already-in-use") {
        setErrorMsg("That email is already in use.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMsg("Invalid email format.");
      } else if (error.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else {
        setErrorMsg("Failed to create teacher account. Please try again.");
      }

      // Auto-clear error message after 5 seconds
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setLoading(false);
      
      // ✅ CRITICAL: Release flag AFTER everything is done
      setTimeout(() => {
        setAccountCreationFlag(false);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-Outfit">
      {/* ✅ Success Dialog Modal */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-slideUp">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Success!</h3>
              </div>
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-600 text-lg mb-6">
              {successMsg}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-64 bg-accent text-white flex flex-col py-10">
        <div className="flex flex-row gap-2 items-center px-10 mb-4">
          <img src={LOGO} alt="Logo" className="h-10 w-10"/>
          <div>
            <h1 className="text-2xl font-bold cursor-default">iQuizU</h1>
            <p className="text-sm -mt-1 cursor-default">Admin</p>
          </div>
        </div>
        
        <nav className="flex flex-col space-y-6 mt-2 px-6">
          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accentHover hover:text-primary transition">
            <Home size={20} />
            <span>Dashboard</span>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accentHover hover:text-primary transition">
            <Upload size={20} />
            <span>Upload Module</span>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accentHover hover:text-primary transition">
            <BarChart3 size={20} />
            <span>Analytics</span>
          </button>
        </nav>

        <div className="mt-auto px-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-600 bg-red-500 text-white w-full justify-center transition"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Welcome, Admin 👋</h2>

        {/* Dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">Total Quizzes</h3>
            <p className="text-4xl font-bold text-primary">15</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">Active Students</h3>
            <p className="text-4xl font-bold text-primary">120</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">Modules Uploaded</h3>
            <p className="text-4xl font-bold text-primary">8</p>
          </div>
        </div>

        {/* ✅ Create Teacher Account Section */}
        <div className="bg-white p-8 rounded-xl shadow-lg mb-10">
          <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <UserPlus size={22} /> Create Teacher Account
          </h3>

          <form onSubmit={handleCreateTeacher} className="flex flex-col gap-4 max-w-md">
            <input
              type="email"
              placeholder="Teacher Email"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Temporary Password (min. 6 characters)"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? "Creating Account..." : "Create Teacher Account"}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Admin notes */}
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold mb-4 text-gray-800">Admin Notes</h3>
          <p className="text-gray-600">
            This is your admin control panel. From here, you can upload course modules, generate quizzes, create teacher accounts,
            and monitor student performance.
          </p>
        </div>
      </main>
    </div>
  );
}