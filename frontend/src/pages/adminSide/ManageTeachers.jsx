// src/pages/adminSide/ManageTeachers.jsx
import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import { 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword,
  updateCurrentUser 
} from "firebase/auth";
import { UserPlus, CheckCircle, X } from "lucide-react";
import { setAccountCreationFlag } from "../../App";

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Create Teacher states
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Fetch all teachers from "users" collection where role === "teacher"
  const fetchTeachers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "teacher"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeachers(list);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Create Teacher Account
  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
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
        status: "active",
        createdAt: new Date().toISOString(),
      });

      // ✅ Step 4: Restore admin session (IMPORTANT!)
      await updateCurrentUser(auth, currentAdmin);

      // ✅ Step 5: Reset form and show success
      setSuccessMsg(`Teacher account created successfully: ${teacherEmail}`);
      setShowSuccessDialog(true);
      setTeacherEmail("");
      setTeacherPassword("");

      // Refresh teacher list
      fetchTeachers();

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
      setCreateLoading(false);
      
      // ✅ CRITICAL: Release flag AFTER everything is done
      setTimeout(() => {
        setAccountCreationFlag(false);
      }, 1000);
    }
  };

  // Reset teacher password
  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to: " + email);
    } catch (error) {
      console.error(error);
      alert("Failed to send reset email.");
    }
  };

  // Deactivate teacher
  const handleDeactivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "inactive" });
      fetchTeachers();
    } catch (error) {
      console.error(error);
    }
  };

  // Activate teacher
  const handleActivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "active" });
      fetchTeachers();
    } catch (error) {
      console.error(error);
    }
  };

  // Delete teacher
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this teacher?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchTeachers();
    } catch (error) {
      console.error(error);
    }
  };

  // Filter teachers by search
  const filteredTeachers = teachers.filter((t) =>
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 font-Outfit">
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

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Manage Teachers</h1>

      {/* ✅ Create Teacher Account Section */}
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
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
            disabled={createLoading}
            className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {createLoading ? "Creating Account..." : "Create Teacher Account"}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Teacher List Section */}
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Teacher List</h3>
        
        <input
          type="text"
          placeholder="Search teacher by email..."
          className="border p-3 w-full max-w-sm rounded-lg mb-4 focus:ring-2 focus:ring-primary outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="text-gray-600">Loading teachers...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border text-left font-semibold">Email</th>
                  <th className="p-3 border text-left font-semibold">Status</th>
                  <th className="p-3 border text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="border hover:bg-gray-50">
                      <td className="p-3 border">{teacher.email}</td>
                      <td
                        className={`p-3 border font-bold ${
                          teacher.status === "active"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {teacher.status || "active"}
                      </td>
                      <td className="p-3 border space-x-2">
                        <button
                          className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
                          onClick={() => handleResetPassword(teacher.email)}
                        >
                          Reset Password
                        </button>

                        {teacher.status === "active" || !teacher.status ? (
                          <button
                            className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition text-sm"
                            onClick={() => handleDeactivate(teacher.id)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition text-sm"
                            onClick={() => handleActivate(teacher.id)}
                          >
                            Activate
                          </button>
                        )}

                        <button
                          className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                          onClick={() => handleDelete(teacher.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-3 text-center border text-gray-600" colSpan={3}>
                      No teachers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageTeachers;