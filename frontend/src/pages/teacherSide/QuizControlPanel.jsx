import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  ArrowLeft,
  Play,
  StopCircle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Zap,
  AlertCircle,
  Eye,
  Settings as SettingsIcon,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Award,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function QuizControlPanel() {
  const { quizId, classId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [quizSession, setQuizSession] = useState({
    status: "not_started",
    startedAt: null,
    endedAt: null,
    quizCode: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    let unsubscribers = [];
    
    const init = async () => {
      await fetchQuizData();
      unsubscribers = setupRealtimeListeners();
    };
    
    init();

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [quizId, classId]);

  const fetchQuizData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please login first");
        navigate("/login");
        return;
      }

      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);

      if (!quizSnap.exists()) {
        alert("Quiz not found!");
        navigate("/teacher/quizzes");
        return;
      }

      const quizData = { id: quizSnap.id, ...quizSnap.data() };

      if (quizData.teacherId !== currentUser.uid) {
        alert("❌ You don't have permission to control this quiz!");
        navigate("/teacher/quizzes");
        return;
      }

      setQuiz(quizData);

      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);

      if (classSnap.exists()) {
        setClassData({ id: classSnap.id, ...classSnap.data() });
      }

      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("quizId", "==", quizId),
        where("classId", "==", classId)
      );
      const assignmentsSnap = await getDocs(q);

      if (assignmentsSnap.size > 0) {
        const firstDoc = assignmentsSnap.docs[0].data();
        setQuizSession({
          status: firstDoc.sessionStatus || "not_started",
          startedAt: firstDoc.sessionStartedAt || null,
          endedAt: firstDoc.sessionEndedAt || null,
          quizCode: firstDoc.quizCode || null,
        });
      }

      const usersRef = collection(db, "users");
      const allUsersSnap = await getDocs(usersRef);
      const userMap = new Map();
      
      allUsersSnap.forEach((userDoc) => {
        const userData = userDoc.data();
        userMap.set(userDoc.id, userData);
      });

      const studentsList = [];
      assignmentsSnap.forEach((doc) => {
        const data = doc.data();
        const studentId = data.studentId;
        const studentData = userMap.get(studentId);
        
        studentsList.push({
          id: studentId,
          name: studentData?.name || data.studentName || "Unknown",
          studentNo: studentData?.studentNo || data.studentNo || "N/A",
          status: data.status || "pending",
          score: data.score || null,
          rawScore: data.rawScorePercentage || null,
          base50Score: data.base50ScorePercentage || null,
          completed: data.completed || false,
          attempts: data.attempts || 0,
          startedAt: data.startedAt || null,
          submittedAt: data.submittedAt || null,
        });
      });

      studentsList.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching quiz data:", error);
      alert("Error loading quiz data");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    const unsubscribers = [];

    const assignmentsRef = collection(db, "assignedQuizzes");
    const q = query(
      assignmentsRef,
      where("quizId", "==", quizId),
      where("classId", "==", classId)
    );
    
    const unsubAssignments = onSnapshot(q, async (snapshot) => {
      try {
        if (snapshot.size > 0) {
          const firstDoc = snapshot.docs[0].data();
          setQuizSession({
            status: firstDoc.sessionStatus || "not_started",
            startedAt: firstDoc.sessionStartedAt || null,
            endedAt: firstDoc.sessionEndedAt || null,
            quizCode: firstDoc.quizCode || null,
          });
        }

        const usersRef = collection(db, "users");
        const allUsersSnap = await getDocs(usersRef);
        const userMap = new Map();
        
        allUsersSnap.forEach((userDoc) => {
          const userData = userDoc.data();
          userMap.set(userDoc.id, userData);
        });

        const updatedStudents = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const studentId = data.studentId;
          const studentData = userMap.get(studentId);
          
          updatedStudents.push({
            id: studentId,
            name: studentData?.name || data.studentName || "Unknown",
            studentNo: studentData?.studentNo || data.studentNo || "N/A",
            status: data.status || "pending",
            score: data.score || null,
            rawScore: data.rawScorePercentage || null,
            base50Score: data.base50ScorePercentage || null,
            completed: data.completed || false,
            attempts: data.attempts || 0,
            startedAt: data.startedAt || null,
            submittedAt: data.submittedAt || null,
          });
        });
        
        updatedStudents.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(updatedStudents);
      } catch (error) {
        console.error("Error processing assignments:", error);
      }
    }, (error) => {
      console.error("Error listening to assignments:", error);
    });
    unsubscribers.push(unsubAssignments);

    return unsubscribers;
  };

  const handleStartQuiz = async () => {
    const confirm = window.confirm(
      "Are you sure you want to START this live quiz? Students will be able to access it."
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("quizId", "==", quizId),
        where("classId", "==", classId)
      );
      const assignmentsSnap = await getDocs(q);

      const updatePromises = assignmentsSnap.docs.map((docSnap) =>
        updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
          sessionStatus: "active",
          sessionStartedAt: new Date(),
          sessionEndedAt: null,
        })
      );

      await Promise.all(updatePromises);

      alert("✅ Quiz started! Students can now access the quiz.");
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert("❌ Error starting quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndQuiz = async () => {
    const confirm = window.confirm(
      "Are you sure you want to END this quiz? This action cannot be undone. Students will no longer be able to submit."
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("quizId", "==", quizId),
        where("classId", "==", classId)
      );
      const assignmentsSnap = await getDocs(q);

      const updatePromises = assignmentsSnap.docs.map((docSnap) =>
        updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
          sessionStatus: "ended",
          sessionEndedAt: new Date(),
        })
      );

      await Promise.all(updatePromises);

      alert("🛑 Quiz ended. Students can no longer submit.");
    } catch (error) {
      console.error("Error ending quiz:", error);
      alert("❌ Error ending quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartQuiz = async () => {
    const confirm = window.confirm(
      "⚠️ RESTART QUIZ SESSION?\n\n" +
      "This will:\n" +
      "• Reset the session to 'Not Started' status\n" +
      "• Clear all student scores and progress\n" +
      "• Allow students to retake the quiz\n\n" +
      "Are you sure you want to continue?"
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("quizId", "==", quizId),
        where("classId", "==", classId)
      );
      const assignmentsSnap = await getDocs(q);

      const updatePromises = assignmentsSnap.docs.map((docSnap) =>
        updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
          sessionStatus: "not_started",
          sessionStartedAt: null,
          sessionEndedAt: null,
          status: "not_started",
          completed: false,
          score: null,
          rawScorePercentage: null,
          base50ScorePercentage: null,
          attempts: 0,
          startedAt: null,
          submittedAt: null,
          answers: null,
        })
      );

      await Promise.all(updatePromises);

      alert("✅ Quiz session restarted successfully! Students can now retake the quiz.");
    } catch (error) {
      console.error("Error restarting quiz:", error);
      alert("❌ Error restarting quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (quizSession.quizCode) {
      navigator.clipboard.writeText(quizSession.quizCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleExportToExcel = () => {
    setExportLoading(true);
    
    try {
      const totalQuestions = quiz.questions?.length || 0;
      const passingScore = quiz.settings?.passingScore || 60;

      const formatTime = (seconds) => {
        if (!seconds) return "";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
      };

      const getStatusText = (student) => {
        if (student.completed) return "Completed";
        if (student.status === "in_progress") return "In Progress";
        if (student.status === "not_started" || student.status === "pending") return "Not Started";
        if (student.status === "expired") return "Expired";
        return student.status;
      };

      const passedCount = students.filter((s) => s.base50Score !== null && s.base50Score >= passingScore).length;
      const failedCount = students.filter((s) => s.base50Score !== null && s.base50Score < passingScore).length;

      // Summary data
      const summaryData = [
        ["Quiz Title", quiz.title],
        ["Class", classData.name],
        ["Total Questions", totalQuestions],
        ["Passing Score", `${passingScore}%`],
        ["Quiz Code", quizSession.quizCode || "N/A"],
        ["Session Status", quizSession.status === "active" ? "LIVE" : quizSession.status === "ended" ? "ENDED" : "NOT STARTED"],
        [""],
        ["STATISTICS", ""],
        ["Total Students", students.length],
        ["Not Started", students.filter((s) => s.status === "not_started" || s.status === "pending").length],
        ["In Progress", students.filter((s) => s.status === "in_progress").length],
        ["Completed", students.filter((s) => s.completed).length],
        ["Passed", passedCount],
        ["Failed", failedCount],
        [""],
        ["Session Started", quizSession.startedAt?.seconds 
          ? new Date(quizSession.startedAt.seconds * 1000).toLocaleString('en-PH', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : "N/A"],
        ["Session Ended", quizSession.endedAt?.seconds 
          ? new Date(quizSession.endedAt.seconds * 1000).toLocaleString('en-PH', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : "N/A"],
        ["Exported On", new Date().toLocaleString('en-PH', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })],
      ];

      // Student results data
      const studentData = students.map((student) => {
        const timeDifference = (student.submittedAt?.seconds && student.startedAt?.seconds) 
          ? (student.submittedAt.seconds - student.startedAt.seconds)
          : null;

        // Split name into first and last name
        const nameParts = student.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return [
          lastName,
          firstName,
          student.studentNo,
          getStatusText(student),
          student.score !== null && student.score !== undefined 
            ? `${student.score}/${totalQuestions}` 
            : "",
          student.rawScore !== null ? student.rawScore : "",
          student.base50Score !== null ? student.base50Score : "",
          student.base50Score !== null 
            ? (student.base50Score >= passingScore ? "PASSED" : "FAILED")
            : "",
          timeDifference ? formatTime(timeDifference) : "",
          student.submittedAt?.seconds 
            ? new Date(student.submittedAt.seconds * 1000).toLocaleString('en-PH', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            : "",
        ];
      });

      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      ws1['!cols'] = [
        { wch: 20 },
        { wch: 40 }
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");
      
      // Student results sheet
      const ws2 = XLSX.utils.aoa_to_sheet([
        ["Last Name", "First Name", "Student Number", "Status", "Score", "Raw Score (%)", "Base-50 Grade (%)", "Result", "Time Taken", "Submitted At"],
        ...studentData
      ]);
      ws2['!cols'] = [
        { wch: 20 },  // Last Name
        { wch: 20 },  // First Name
        { wch: 15 },  // Student Number
        { wch: 15 },  // Status
        { wch: 10 },  // Score
        { wch: 15 },  // Raw Score
        { wch: 18 },  // Base-50 Grade
        { wch: 10 },  // Result
        { wch: 12 },  // Time Taken
        { wch: 22 },  // Submitted At
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "Student Results");

      const fileName = `${quiz.title}_${classData.name}_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert("✅ Excel file downloaded successfully!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("❌ Error exporting to Excel. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-yellow-500"></Loader2>
          <span className="ml-3 text-gray-600">Loading Control Panel...</span>
        </div>
      </div>
    );
  }

  if (!quiz || !classData) return null;

  const notStartedCount = students.filter((s) => s.status === "not_started" || s.status === "pending").length;
  const inProgressCount = students.filter((s) => s.status === "in_progress").length;
  const completedCount = students.filter((s) => s.completed).length;
  const totalStudents = students.length;
  const passingScore = quiz.settings?.passingScore || 60;
  const totalQuestions = quiz.questions?.length || 0;
  
  const getStatusDisplay = (status) => {
    switch (status) {
      case "in_progress":
        return { text: "In Progress", className: "bg-yellow-100 text-yellow-800", Icon: Loader };
      case "completed":
        return { text: "Completed", className: "bg-green-100 text-green-800", Icon: CheckCircle };
      case "not_started":
      case "pending":
        return { text: "Not Started", className: "bg-gray-100 text-gray-800", Icon: Clock };
      case "expired":
        return { text: "Expired", className: "bg-red-100 text-red-800", Icon: XCircle };
      default:
        return { text: status, className: "bg-gray-100 text-gray-800", Icon: Clock };
    }
  };

  return (
    <div className="p-8 font-Outfit">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/teacher/quizzes")}
          className="flex items-center gap-2 text-subtext hover:text-subsubtext"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Manage Quizzes
        </button>

        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-yellow-500">Live Control Panel</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-white p-6 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{quiz.title}</h2>
            <p className="text-white text-sm mt-1">
              Class: {classData.name} • {totalQuestions} questions
            </p>
          </div>
          <div className="text-right">
            <div
              className={`px-4 py-2 rounded-lg font-bold text-lg ${
                quizSession.status === "active"
                  ? "bg-green-100 text-green-900"
                  : quizSession.status === "ended"
                  ? "bg-red-100 text-red-900"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {quizSession.status === "active"
                ? "🟢 LIVE"
                : quizSession.status === "ended"
                ? "🛑 ENDED"
                : "⚪ NOT STARTED"}
            </div>
          </div>
        </div>
      </div>

      {quizSession.quizCode && (
        <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-700 mb-2">Live Quiz Code</p>
              <div className="flex items-center gap-3">
                <div className="bg-white border-2 border-purple-500 rounded-lg px-6 py-3">
                  <span className="text-3xl font-bold text-purple-700 tracking-wider">
                    {quizSession.quizCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                >
                  {codeCopied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-700">Share this code with students</p>
              <p className="text-xs text-purple-600 mt-1">They'll need it to access the live quiz</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-3">
        {quizSession.status === "not_started" && (
          <button
            onClick={handleStartQuiz}
            disabled={actionLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-extrabold text-xl shadow-lg flex items-center justify-center gap-3 disabled:bg-gray-400 transition transform hover:scale-[1.01]"
          >
            {actionLoading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                STARTING LIVE QUIZ...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                START LIVE QUIZ
              </>
            )}
          </button>
        )}

        {quizSession.status === "active" && (
          <button
            onClick={handleEndQuiz}
            disabled={actionLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold text-xl flex items-center justify-center gap-3 disabled:bg-gray-400 transition transform hover:scale-[1.01]"
          >
            {actionLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Ending...
              </>
            ) : (
              <>
                <StopCircle className="w-5 h-5" />
                END QUIZ
              </>
            )}
          </button>
        )}

        {quizSession.status === "ended" && (
          <div className="space-y-3">
            <div className="w-full bg-gray-100 border-2 border-gray-300 text-gray-700 p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3">
              <AlertCircle className="w-6 h-6" />
              Quiz Session Has Ended
            </div>
            
            <button
              onClick={handleRestartQuiz}
              disabled={actionLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold text-xl flex items-center justify-center gap-3 disabled:bg-gray-400 transition transform hover:scale-[1.01]"
            >
              {actionLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  RESTART QUIZ SESSION
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">{totalStudents}</div>
              <div className="text-sm text-blue-700 font-semibold">Total Assigned</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Clock className="w-8 h-8 text-gray-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{notStartedCount}</div>
              <div className="text-sm text-gray-700 font-semibold">Not Started</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Loader className="w-8 h-8 text-yellow-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-900">{inProgressCount}</div>
              <div className="text-sm text-yellow-700 font-semibold">In Progress</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-green-900">{completedCount}</div>
              <div className="text-sm text-green-700 font-semibold">Completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6 text-purple-600" />
            Live Student Monitoring
          </h3>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Passing Score: {passingScore}%
            </p>
            <button
              onClick={handleExportToExcel}
              disabled={exportLoading || students.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export to Excel
                </>
              )}
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No students assigned to this quiz</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">Student Name</th>
                  <th className="px-6 py-4 text-left font-bold">Student #</th>
                  <th className="px-6 py-4 text-center font-bold">Live Status</th>
                  <th className="px-6 py-4 text-center font-bold">Score</th>
                  <th className="px-6 py-4 text-center font-bold">Raw Score</th>
                  <th className="px-6 py-4 text-center font-bold">Base-50 Grade</th>
                  <th className="px-6 py-4 text-center font-bold">Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const { text, className, Icon } = getStatusDisplay(student.completed ? "completed" : student.status);
                  
                  const timeDifference = (student.submittedAt?.seconds && student.startedAt?.seconds) 
                    ? (student.submittedAt.seconds - student.startedAt.seconds)
                    : null;
                  
                  const formatTime = (seconds) => {
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    return `${minutes}m ${remainingSeconds}s`;
                  };

                  return (
                    <tr
                      key={student.id}
                      className={`border-b transition ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800">{student.name}</td>
                      <td className="px-6 py-4 text-gray-600">{student.studentNo}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 ${className} rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                          <Icon className="w-4 h-4" />
                          {text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.score !== null && student.score !== undefined ? (
                          <div className="flex items-center justify-center gap-1">
                            <Award className="w-4 h-4 text-purple-600" />
                            <span className="font-bold text-lg text-gray-800">
                              {student.score}/{totalQuestions}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.rawScore !== null ? (
                          <span className="font-bold text-lg text-blue-600">
                            {student.rawScore}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.base50Score !== null ? (
                          <span className={`font-bold text-lg ${
                            student.base50Score >= passingScore
                              ? "text-green-600"
                              : "text-red-600"
                          }`}>
                            {student.base50Score}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {timeDifference !== null ? formatTime(timeDifference) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {quizSession.status !== "not_started" && (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {quizSession.startedAt && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-700 mb-1">Session Started</p>
              <p className="text-lg font-bold text-green-900">
                {new Date(quizSession.startedAt.seconds * 1000).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
          )}

          {quizSession.endedAt && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Session Ended</p>
              <p className="text-lg font-bold text-red-900">
                {new Date(quizSession.endedAt.seconds * 1000).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {quizSession.status === "not_started" && (
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 mb-2">Live Quiz Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Click the "START LIVE QUIZ" button to begin the quiz session</li>
                <li>Students can only access the quiz when status is LIVE</li>
                <li>Share the Quiz Code with students so they can join</li>
                <li>Click "END QUIZ" to finish the session and prevent further submissions</li>
                <li>Monitor student progress in real-time from this dashboard</li>
                <li>Scores shown are: Score (correct/total), Raw Score (actual %), and Base-50 Grade (transmuted)</li>
                <li>Use "RESTART QUIZ SESSION" after ending to allow students to retake</li>
                <li>Export results to Excel for detailed analysis and record-keeping</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {quizSession.status === "ended" && (
        <div className="mt-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-6 h-6 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-orange-900 mb-2">Restart Quiz Information:</h4>
              <ul className="text-sm text-orange-800 space-y-1 ml-4 list-disc">
                <li>Restarting will clear all student scores and progress</li>
                <li>The session will return to "Not Started" status</li>
                <li>Students will be able to retake the quiz from scratch</li>
                <li>The same Quiz Code will be used for the new session</li>
                <li>Previous attempts and scores will be permanently deleted</li>
                <li>Make sure to export results to Excel before restarting if you need to keep records</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}