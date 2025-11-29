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
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Teachers</h1>

      <input
        type="text"
        placeholder="Search teacher by email..."
        className="border p-2 w-full max-w-sm rounded mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p>Loading teachers...</p>
      ) : (
        <table className="w-full border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 border">Email</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="border">
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
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                      onClick={() => handleResetPassword(teacher.email)}
                    >
                      Reset Password
                    </button>

                    {teacher.status === "active" || !teacher.status ? (
                      <button
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                        onClick={() => handleDeactivate(teacher.id)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded"
                        onClick={() => handleActivate(teacher.id)}
                      >
                        Activate
                      </button>
                    )}

                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded"
                      onClick={() => handleDelete(teacher.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 text-center border" colSpan={3}>
                  No teachers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageTeachers;
