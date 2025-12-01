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
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Loader2 } from "lucide-react";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(list);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to: " + email);
    } catch (error) {
      console.error(error);
      alert("Failed to send reset email.");
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Inactive" });
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const handleActivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Active" });
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-6 px-2 md:p-8 font-Outfit animate-fadeIn">
      <h1 className="text-2xl text-title font-bold">Manage Students</h1>
      <p className="text-md md:text-xl text-subtext">All your student details, accessible and easy to manage.</p>

      <input
        type="text"
        placeholder="Search student by name..."
        className="border p-2 w-full max-w-sm rounded mb-4 mt-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex flex-row items-center justify-center gap-3 mt-10">
          <Loader2 className="text-blue-500 animate-spin" />
          <p className="text-subtext">Loading students...</p>
        </div>
        
      ) : (
        <table className="w-full border items-start text-left rounded-lg overflow-hidden shadow-lg animate-slideIn">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 border">Name</th>
              <th className="p-3 border">Email</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id} className="border">
                  <td className="p-3 border">{student.name}</td>
                  <td className="p-3 border">{student.emailAddress}</td>
                  <td
                    className={`p-3 border font-bold ${
                      student.status === "Active" || !student.status
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {student.status || "Active"}
                  </td>
                  <td className="p-3 border space-x-2">
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                      onClick={() => handleResetPassword(student.emailAddress)}
                    >
                      Reset Password
                    </button>

                    {student.status === "Active" || !student.status ? (
                      <button
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                        onClick={() => handleDeactivate(student.id)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded"
                        onClick={() => handleActivate(student.id)}
                      >
                        Activate
                      </button>
                    )}

                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded"
                      onClick={() => handleDelete(student.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 text-center border" colSpan={4}>
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageStudents;
