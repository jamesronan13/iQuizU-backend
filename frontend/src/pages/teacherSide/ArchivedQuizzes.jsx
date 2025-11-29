import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Archive, RefreshCw, Trash2, Calendar, FileText, Award, Loader2 } from "lucide-react";

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
        const dateA = a.archivedAt?.toDate ? a.archivedAt.toDate() : new Date(0);
        const dateB = b.archivedAt?.toDate ? b.archivedAt.toDate() : new Date(0);
        return dateB - dateA;
      });

      setArchivedQuizzes(quizList);
    } catch (error) {
      console.error("Error fetching archived quizzes:", error);
      alert("Failed to load archived quizzes.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (quiz) => {
    setRestoring(quiz.id);
    try {
      const originalQuizId = quiz.originalQuizId || quiz.id;
      
      // Prepare quiz data for restoration
      const quizData = { ...quiz };
      delete quizData.id;
      delete quizData.archivedAt;
      delete quizData.archivedBy;
      delete quizData.originalQuizId;
      delete quizData.status;
      
      quizData.mode = "Published";
      quizData.status = "published";
      quizData.createdAt = new Date();
      quizData.updatedAt = new Date();
      
      // Restore to quizzes collection using setDoc
      const quizRef = doc(db, "quizzes", originalQuizId);
      await setDoc(quizRef, quizData);
      
      // Delete from archivedQuizzes
      await deleteDoc(doc(db, "archivedQuizzes", quiz.id));
      
      // Refresh list
      await fetchArchivedQuizzes();
      
      alert("✅ Quiz restored successfully!");
    } catch (error) {
      console.error("Error restoring quiz:", error);
      alert("❌ Failed to restore quiz. Please try again.");
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (quizId) => {
    setDeleting(quizId);
    try {
      await deleteDoc(doc(db, "archivedQuizzes", quizId));
      await fetchArchivedQuizzes();
      alert("🗑️ Quiz permanently deleted!");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("❌ Failed to delete quiz. Please try again.");
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case "Published":
        return "bg-blue-100 text-blue-700";
      case "Draft":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-Outfit text-lg">Loading archived quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 font-Outfit bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Archived Quizzes</h1>
          </div>
          <p className="text-gray-600">
            Manage your archived quizzes. You can restore or permanently delete them.
          </p>
        </div>

        {/* Quizzes Grid */}
        {archivedQuizzes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
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
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-white flex-shrink-0" />
                    <h3 className="text-lg font-bold text-white truncate flex-1">
                      {quiz.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getModeColor(quiz.mode)}`}>
                      {quiz.mode || "Published"}
                    </span>
                  </div>
                </div>

                {/* Quiz Details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award className="w-4 h-4 flex-shrink-0" />
                    <span>{quiz.totalPoints || 0} points</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>{quiz.questions?.length || 0} questions</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Archived: {formatDate(quiz.archivedAt)}</span>
                  </div>

                  {/* Classification Stats */}
                  {quiz.classificationStats && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-semibold mb-2">Classification:</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                          HOTS: {quiz.classificationStats.hots_count || 0}
                        </span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          LOTS: {quiz.classificationStats.lots_count || 0}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleRestore(quiz)}
                      disabled={restoring === quiz.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all font-semibold"
                      title="Restore this quiz"
                    >
                      {restoring === quiz.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Restoring...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span className="text-sm">Restore</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(quiz.id)}
                      disabled={deleting === quiz.id}
                      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all font-semibold"
                      title="Permanently delete this quiz"
                    >
                      {deleting === quiz.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Permanently Delete Quiz?
            </h2>
            
            <p className="text-gray-600 mb-6">
              This action cannot be undone. All quiz data will be permanently deleted from the system.
            </p>

            {/* Find the quiz being deleted */}
            {archivedQuizzes.find(q => q.id === showDeleteConfirm) && (
              <p className="text-sm text-gray-500 mb-4 p-2 bg-gray-50 rounded">
                <strong>Quiz:</strong> {archivedQuizzes.find(q => q.id === showDeleteConfirm)?.title}
              </p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold transition-all"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting === showDeleteConfirm}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
              >
                {deleting === showDeleteConfirm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}