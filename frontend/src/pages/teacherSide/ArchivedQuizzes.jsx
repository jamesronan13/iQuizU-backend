import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Archive, RefreshCw, Trash2, Calendar, FileText, Award } from "lucide-react";

export default function ArchivedQuizzes({ user }) {
  const [archivedQuizzes, setArchivedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchArchivedQuizzes();
  }, [user]);

  const fetchArchivedQuizzes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, "archivedQuizzes"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const quizList = [];
      querySnapshot.forEach((docSnapshot) => {
        quizList.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });

      quizList.sort((a, b) => {
        const dateA = a.archivedAt?.toDate() || new Date(0);
        const dateB = b.archivedAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setArchivedQuizzes(quizList);
    } catch (error) {
      console.error("Error fetching archived quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (quiz) => {
    setRestoring(quiz.id);
    try {
      const originalQuizId = quiz.originalQuizId || quiz.id;
      
      // Create new document in quizzes collection
      const quizRef = doc(db, "quizzes", originalQuizId);
      const quizData = { ...quiz };
      delete quizData.id;
      delete quizData.archivedAt;
      delete quizData.archivedBy;
      delete quizData.originalQuizId;
      quizData.status = "published"; // or "draft" depending on your logic
      
      await updateDoc(quizRef, quizData);
      
      // Delete from archivedQuizzes
      await deleteDoc(doc(db, "archivedQuizzes", quiz.id));
      
      // Refresh list
      fetchArchivedQuizzes();
      
      alert("Quiz restored successfully!");
    } catch (error) {
      console.error("Error restoring quiz:", error);
      alert("Failed to restore quiz. Please try again.");
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (quizId) => {
    setDeleting(quizId);
    try {
      await deleteDoc(doc(db, "archivedQuizzes", quizId));
      fetchArchivedQuizzes();
      alert("Quiz permanently deleted!");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz. Please try again.");
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

  const getModeColor = (mode) => {
    switch (mode) {
      case "Published":
        return "bg-green-100 text-green-700";
      case "Draft":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-Outfit">Loading archived quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-Outfit">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-gray-800">Archived Quizzes</h1>
          </div>
          <p className="text-gray-600">
            Manage your archived quizzes. You can restore or permanently delete them.
          </p>
        </div>

        {/* Quizzes Grid */}
        {archivedQuizzes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Archived Quizzes</h2>
            <p className="text-gray-500">
              Quizzes you archive will appear here for safekeeping.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-bold text-white truncate flex-1">
                      {quiz.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getModeColor(quiz.mode)}`}>
                      {quiz.mode || "Published"}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award className="w-4 h-4" />
                    <span>{quiz.totalPoints || 0} points</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{quiz.questions?.length || 0} questions</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Archived: {formatDate(quiz.archivedAt)}</span>
                  </div>

                  {quiz.classificationStats && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Classification:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(quiz.classificationStats).slice(0, 3).map(([key, value]) => (
                          <span key={key} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleRestore(quiz)}
                      disabled={restoring === quiz.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl transition-all font-medium"
                    >
                      {restoring === quiz.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>Restore</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(quiz.id)}
                      disabled={deleting === quiz.id}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 text-center">
            <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Permanently Delete Quiz?
            </h2>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. All quiz data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium transition-all"
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