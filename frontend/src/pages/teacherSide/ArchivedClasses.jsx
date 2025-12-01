import { useState, useEffect } from "react";
import { collection, query, where, getDocs,setDoc, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Archive, RefreshCw, Trash2, Calendar, Users, BookOpen, Loader2 } from "lucide-react";

export default function ArchivedClasses({ user }) {
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchArchivedClasses();
  }, [user]);

  const fetchArchivedClasses = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, "archivedClasses"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const classList = [];
      querySnapshot.forEach((docSnapshot) => {
        classList.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });

      classList.sort((a, b) => {
        const dateA = a.archivedAt?.toDate() || new Date(0);
        const dateB = b.archivedAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setArchivedClasses(classList);
    } catch (error) {
      console.error("Error fetching archived classes:", error);
    } finally {
      setLoading(false);
    }
  };
const handleRestore = async (classItem) => {
  setRestoring(classItem.id);
  try {
    const originalClassId = classItem.originalClassId || classItem.id;
    
    // Step 1: Prepare class data for restoration
    const classData = { ...classItem };
    delete classData.id;
    delete classData.archivedAt;
    delete classData.archivedBy;
    delete classData.originalClassId;
    delete classData.studentSnapshot;
    classData.status = "active";
    
    // Step 2: Restore class to active classes collection
    const classRef = doc(db, "classes", originalClassId);
    await setDoc(classRef, classData);
    console.log("✅ Class restored to active classes");
    
    // Step 3: Restore students - add classId back to their classIds array
    // IMPORTANT: We restore ALL students from the snapshot, regardless of their current account status
    if (classItem.studentSnapshot?.students && classItem.studentSnapshot.students.length > 0) {
      const studentUpdatePromises = classItem.studentSnapshot.students.map(async (studentInfo) => {
        try {
          const studentRef = doc(db, "users", studentInfo.id);
          const studentDoc = await getDoc(studentRef);
          
          if (studentDoc.exists()) {
            const student = studentDoc.data();
            const updatedClassIds = student.classIds || [];
            
            // Add classId back if not already there
            if (!updatedClassIds.includes(originalClassId)) {
              updatedClassIds.push(originalClassId);
            }
            
            // Update student document - keep their hasAccount and authUID intact
            await updateDoc(studentRef, {
              classIds: updatedClassIds
            });
            console.log(`✅ Restored ${studentInfo.name} to class (Account: ${student.hasAccount ? 'Active' : 'None'})`);
          } else {
            console.warn(`⚠️ Student ${studentInfo.name} (${studentInfo.id}) not found in database`);
          }
        } catch (error) {
          console.error(`❌ Error restoring student ${studentInfo.name}:`, error);
        }
      });
      
      await Promise.all(studentUpdatePromises);
      console.log(`✅ All ${classItem.studentSnapshot.students.length} students re-enrolled`);
    }
    
    // Step 4: Delete from archivedClasses
    await deleteDoc(doc(db, "archivedClasses", classItem.id));
    console.log("✅ Removed from archived classes");
    
    // Step 5: Refresh and notify
    await fetchArchivedClasses();
    window.dispatchEvent(new Event('classesUpdated'));
    
    const studentCount = classItem.studentSnapshot?.students?.length || 0;
    alert(`✅ Class "${classItem.name}" restored successfully!\n\n${studentCount} students have been re-enrolled with their accounts intact.`);
  } catch (error) {
    console.error("❌ Error restoring class:", error);
    alert("❌ Failed to restore class: " + error.message);
  } finally {
    setRestoring(null);
  }
};

  const handleDelete = async (classId) => {
    setDeleting(classId);
    try {
      await deleteDoc(doc(db, "archivedClasses", classId));
      fetchArchivedClasses();
      alert("Class permanently deleted!");
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class. Please try again.");
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-row gap-3 justify-center items-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
          <p className="text-subtext">Loading archived classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-2 md:p-8 font-Outfit animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Archived Classes</h1>
          </div>
          <p className="text-gray-600">
            Manage your archived classes. You can restore or permanently delete them.
          </p>
        </div>

        {/* Classes Grid */}
        {archivedClasses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center animate-slideIn">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Archived Classes</h2>
            <p className="text-gray-500">
              Classes you archive will appear here for safekeeping.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideIn">
            {archivedClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="bg-gradient-to-r from-blue-700 to-blue-400 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-bold text-white truncate flex-1">
                      {classItem.name}
                    </h3>
                  </div>
                  <p className="text-white/90 text-sm">
                    {classItem.subject || "No subject"}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{classItem.studentCount || 0} students</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Archived: {formatDate(classItem.archivedAt)}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleRestore(classItem)}
                      disabled={restoring === classItem.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl transition-all font-medium"
                    >
                      {restoring === classItem.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>Restore</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(classItem.id)}
                      disabled={deleting === classItem.id}
                      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl transition-all font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 text-center animate-slideUp">
            <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Permanently Delete Class?
            </h2>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. All class data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 active:scale-95 hover:scale-105 duration-200 text-gray-800 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 hover:scale-105 duration-200 disabled:bg-gray-300 text-white font-medium transition-all"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}