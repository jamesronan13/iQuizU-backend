import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Circle, School, Trash, Eye, Pen, Zap, Users, Trash2, PlusCircle, X, BookOpen } from "lucide-react";
import { auth, db } from "../../firebase/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import PasswordConfirmModal from './PasswordConfirmModal';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setAccountCreationFlag } from "../../App";

export default function ViewClassPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [accountCreationProgress, setAccountCreationProgress] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [synchronousQuizzes, setSynchronousQuizzes] = useState([]);
  const [loadingSynchronous, setLoadingSynchronous] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState(null);

  const [activeTab, setActiveTab] = useState("students");

  const [showAssignQuizModal, setShowAssignQuizModal] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingAvailableQuizzes, setLoadingAvailableQuizzes] = useState(false);
  const [selectedQuizForAssignment, setSelectedQuizForAssignment] = useState(null);

  useEffect(() => {
    fetchClassData();
    fetchStudents();
    fetchAssignedQuizzes();
    fetchSynchronousQuizzes();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const classDoc = await getDoc(doc(db, "classes", classId));
      
      if (classDoc.exists()) {
        setClassData({ id: classDoc.id, ...classDoc.data() });
      } else {
        alert("Class not found!");
        navigate("/teacher/classes/add");
      }
    } catch (error) {
      console.error("Error fetching class:", error);
      alert("Failed to fetch class data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("classIds", "array-contains", classId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const studentsList = [];
      querySnapshot.forEach((docSnapshot) => {
        studentsList.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });

      studentsList.sort((a, b) => {
        const aName = a.name || "";
        const bName = b.name || "";
        return aName.localeCompare(bName);
      });
      
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Failed to fetch students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchAssignedQuizzes = async () => {
    setLoadingAssigned(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "assignedQuizzes"),
        where("assignedBy", "==", user.uid),
        where("classId", "==", classId),
        where("quizMode", "==", "asynchronous")
      );
      const snapshot = await getDocs(q);

      const assignmentMap = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.quizId}-${data.classId}`;

        if (!assignmentMap.has(key)) {
          assignmentMap.set(key, {
            quizId: data.quizId,
            classId: data.classId,
            quizTitle: data.quizTitle,
            className: data.className,
            subject: data.subject || "",
            quizMode: data.quizMode || "asynchronous",
            dueDate: data.dueDate,
            assignedAt: data.assignedAt,
            studentIds: [],
            docIds: [],
          });
        }

        const assignment = assignmentMap.get(key);
        if (!assignment.studentIds.includes(data.studentId)) {
          assignment.studentIds.push(data.studentId);
        }
        assignment.docIds.push(doc.id);
      });

      const assigned = Array.from(assignmentMap.values()).map((a) => ({
        id: a.quizId,
        quizId: a.quizId,
        classId: a.classId,
        title: a.quizTitle,
        className: a.className,
        subject: a.subject,
        studentCount: a.studentIds.length,
        dueDate: a.dueDate,
        assignedAt: a.assignedAt,
        quizMode: a.quizMode,
        docIds: a.docIds,
      }));

      assigned.sort(
        (a, b) => (b.assignedAt?.seconds || 0) - (a.assignedAt?.seconds || 0)
      );
      setAssignedQuizzes(assigned);
    } catch (e) {
      console.error(e);
      alert("Error loading assigned quizzes.");
    } finally {
      setLoadingAssigned(false);
    }
  };

  const fetchSynchronousQuizzes = async () => {
    setLoadingSynchronous(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "assignedQuizzes"),
        where("assignedBy", "==", user.uid),
        where("classId", "==", classId),
        where("quizMode", "==", "synchronous")
      );
      const snapshot = await getDocs(q);

      const assignmentMap = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.quizId}-${data.classId}`;

        if (!assignmentMap.has(key)) {
          assignmentMap.set(key, {
            quizId: data.quizId,
            classId: data.classId,
            quizTitle: data.quizTitle,
            className: data.className,
            subject: data.subject || "",
            quizMode: data.quizMode || "synchronous",
            dueDate: data.dueDate,
            assignedAt: data.assignedAt,
            quizCode: data.quizCode || null,
            studentIds: [],
            sessionStatus: data.sessionStatus || "not_started",
            docIds: [],
          });
        }

        const assignment = assignmentMap.get(key);
        if (!assignment.studentIds.includes(data.studentId)) {
          assignment.studentIds.push(data.studentId);
        }
        assignment.docIds.push(doc.id);
      });

      const synchronous = Array.from(assignmentMap.values()).map((a) => ({
        id: a.quizId,
        quizId: a.quizId,
        classId: a.classId,
        title: a.quizTitle,
        className: a.className,
        subject: a.subject,
        studentCount: a.studentIds.length,
        dueDate: a.dueDate,
        assignedAt: a.assignedAt,
        quizMode: a.quizMode,
        quizCode: a.quizCode,
        sessionStatus: a.sessionStatus,
        docIds: a.docIds,
      }));

      synchronous.sort(
        (a, b) => (b.assignedAt?.seconds || 0) - (a.assignedAt?.seconds || 0)
      );
      setSynchronousQuizzes(synchronous);
    } catch (e) {
      console.error(e);
      alert("Error loading synchronous quizzes.");
    } finally {
      setLoadingSynchronous(false);
    }
  };

  const fetchAvailableQuizzes = async () => {
    setLoadingAvailableQuizzes(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "quizzes"),
        where("teacherId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      const quizzes = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title,
          questionCount: d.questions?.length || 0,
          totalPoints: d.totalPoints || 0,
        };
      });

      setAvailableQuizzes(quizzes);
    } catch (e) {
      console.error(e);
      alert("Error loading quizzes.");
    } finally {
      setLoadingAvailableQuizzes(false);
    }
  };

  const handleOpenAssignQuizModal = () => {
    setShowAssignQuizModal(true);
    setSelectedQuizForAssignment(null);
    fetchAvailableQuizzes();
  };

  const handleCloseAssignQuizModal = () => {
    setShowAssignQuizModal(false);
    setSelectedQuizForAssignment(null);
  };

  const handleSelectQuizForAssignment = () => {
    if (!selectedQuizForAssignment) {
      alert("Please select a quiz to assign");
      return;
    }
    
    navigate(`/teacher/assign-quiz-to-class/${selectedQuizForAssignment}/${classId}`);
  };

  const handleDeleteAssignment = async (assignment, isSync = false) => {
    const confirmMsg = `Are you sure you want to delete this assignment?\n\nQuiz: ${assignment.title}\nClass: ${assignment.className}\n\nThis will remove the quiz from all ${assignment.studentCount} students and delete all related data. This action cannot be undone.`;
    
    if (!window.confirm(confirmMsg)) return;

    setDeletingAssignment(`${assignment.quizId}-${assignment.classId}`);

    try {
      const deletePromises = assignment.docIds.map((docId) =>
        deleteDoc(doc(db, "assignedQuizzes", docId))
      );

      await Promise.all(deletePromises);

      if (isSync) {
        await fetchSynchronousQuizzes();
        alert("Live quiz assignment deleted successfully!");
      } else {
        await fetchAssignedQuizzes();
        alert("Quiz assignment deleted successfully!");
      }
    } catch (e) {
      console.error("Error deleting assignment:", e);
      alert("Error deleting assignment. Please try again.");
    } finally {
      setDeletingAssignment(null);
    }
  };

  const handleCreateAccountForAll = async () => {
    const studentsWithoutAccounts = students.filter(s => !s.hasAccount);

    if (studentsWithoutAccounts.length === 0) {
      alert("All students already have accounts!");
      return;
    }

    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async (adminPassword) => {
    setShowPasswordModal(false);

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      alert("❌ Please log in first!");
      return;
    }

    console.log("🔒 Setting account creation flags...");
    setAccountCreationFlag(true);

    try {
      setAccountCreationProgress("Validating credentials...");
      const passwordValidation = await validateTeacherPassword(currentUser.email, adminPassword);
      
      if (!passwordValidation.valid) {
        alert("❌ Invalid password! Account creation cancelled.\n\nPlease try again with the correct password.");
        setAccountCreationProgress("");
        setAccountCreationFlag(false);
        return;
      }

      const teacherEmail = currentUser.email;
      const teacherUID = currentUser.uid;

      setCreatingAccounts(true);
      setAccountCreationProgress("Initializing account creation...");

      const studentsWithoutAccounts = students.filter(s => !s.hasAccount);
      let successCount = 0;
      let existingCount = 0;
      let errorCount = 0;
      const errors = [];
      const skippedStudents = [];

      for (let i = 0; i < studentsWithoutAccounts.length; i++) {
        try {
          const student = studentsWithoutAccounts[i];
          setAccountCreationProgress(`Creating accounts: ${i + 1}/${studentsWithoutAccounts.length} - ${student.name}`);
          console.log(`📝 Processing: ${student.name} (${i + 1}/${studentsWithoutAccounts.length})`);
          
          const result = await createAccountInFirebase(student, teacherEmail, adminPassword, teacherUID);
          
          if (result.status === "NEW_ACCOUNT") {
            await updateDoc(doc(db, "users", student.id), {
              hasAccount: true,
              authUID: result.authUID
            });
            successCount++;
            console.log(`✅ New account: ${student.name}`);
            
          } else if (result.status === "EXISTING_ACCOUNT" || result.status === "EXISTING_AUTH") {
            if (!student.hasAccount) {
              await updateDoc(doc(db, "users", student.id), {
                hasAccount: true,
                authUID: result.authUID || student.authUID
              });
            }
            existingCount++;
            skippedStudents.push(student.name);
            console.log(`⚠️ Already exists: ${student.name}`);
          }
        } catch (error) {
          console.error("❌ Error creating account:", error);
          errorCount++;
          errors.push(`${studentsWithoutAccounts[i].name}: ${error.message}`);
        }
      }

      setAccountCreationProgress("Finalizing...");

      console.log("🔍 Final teacher verification...");
      const finalUser = auth.currentUser;
      
      if (!finalUser || finalUser.uid !== teacherUID) {
        console.warn(`⚠️ Final re-authentication needed...`);
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const finalAuth = await signInWithEmailAndPassword(auth, teacherEmail, adminPassword);
            if (finalAuth.user.uid === teacherUID) {
              console.log(`✅ Final verification successful`);
              break;
            }
          } catch (error) {
            console.error(`Final auth attempt ${attempt + 1} failed:`, error);
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      let message = `✅ Account Creation Complete!\n\n`;
      message += `✅ New accounts: ${successCount}\n`;
      message += `⚠️ Already had accounts: ${existingCount}\n`;
      
      if (successCount > 0) {
        message += `\n📧 Email: From Classlist`;
        message += `\n🔑 Default Password: 123456`;
      }
      
      if (existingCount > 0) {
        message += `\n\n⚠️ Already existing:\n${skippedStudents.slice(0, 5).join('\n')}`;
        if (skippedStudents.length > 5) {
          message += `\n... and ${skippedStudents.length - 5} more`;
        }
      }
      
      if (errorCount > 0) {
        message += `\n\n❌ Failed: ${errorCount} student(s)`;
        if (errors.length > 0) {
          message += `\n${errors.slice(0, 3).join('\n')}`;
          if (errors.length > 3) {
            message += `\n... and ${errors.length - 3} more`;
          }
        }
      }
      
      alert(message);

      await fetchStudents();
      
    } catch (error) {
      console.error("❌ Error creating accounts:", error);
      alert("❌ Failed to create accounts: " + error.message);
    } finally {
      setCreatingAccounts(false);
      setAccountCreationProgress("");
      
      console.log("🔓 Clearing account creation flags...");
      setAccountCreationFlag(false);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const validateTeacherPassword = async (teacherEmail, teacherPassword) => {
    try {
      const result = await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
      console.log("✅ Password validated, staying logged in");
      return { valid: true };
    } catch (error) {
      console.error("❌ Password validation failed:", error);
      return { valid: false, error: error.message };
    }
  };

  const checkExistingAccountByEmail = async (email) => {
    try {
      const q = query(
        collection(db, "users"),
        where("emailAddress", "==", email.toLowerCase().trim()),
        where("hasAccount", "==", true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        return {
          exists: true,
          uid: existingDoc.data().authUID,
          studentId: existingDoc.id,
          name: existingDoc.data().name
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error("Error checking existing account:", error);
      throw error;
    }
  };

  const createAccountInFirebase = async (studentData, teacherEmail, teacherPassword, teacherUID) => {
    try {
      const email = studentData.emailAddress?.toLowerCase().trim();
      
      if (!email || email === "") {
        throw new Error(`No email address found for ${studentData.name}`);
      }
      
      const existingCheck = await checkExistingAccountByEmail(email);
      
      if (existingCheck.exists) {
        console.log(`⚠️ Account already exists for ${email}`);
        return {
          status: "EXISTING_ACCOUNT",
          authUID: existingCheck.uid,
          message: `${existingCheck.name} already has an account`
        };
      }
      
      const password = "123456";

      await auth.signOut();
      await new Promise(resolve => setTimeout(resolve, 500));

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const authUID = userCredential.user.uid;

      console.log(`✅ Account created for ${studentData.name} with UID: ${authUID}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let reAuthSuccess = false;
      let reAuthAttempts = 0;
      const maxAttempts = 3;
      
      while (!reAuthSuccess && reAuthAttempts < maxAttempts) {
        try {
          const teacherCredential = await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
          
          if (teacherCredential.user.uid === teacherUID) {
            reAuthSuccess = true;
            console.log(`✅ Teacher re-authenticated successfully`);
          } else {
            console.warn(`⚠️ Auth UID mismatch - retrying`);
            reAuthAttempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (reAuthError) {
          console.error(`Re-authentication attempt ${reAuthAttempts + 1} failed:`, reAuthError);
          reAuthAttempts++;
          if (reAuthAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!reAuthSuccess) {
        throw new Error("Failed to keep teacher logged in after account creation");
      }

      return {
        status: "NEW_ACCOUNT",
        authUID: authUID
      };
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ Email already exists in Firebase Auth: ${studentData.emailAddress}`);
        
        const existingCheck = await checkExistingAccountByEmail(studentData.emailAddress);
        return {
          status: "EXISTING_AUTH",
          authUID: existingCheck.uid || null,
          message: `Email already in Firebase: ${studentData.emailAddress}`
        };
      }
      console.error("Error creating account:", error);
      throw error;
    }
  };

  const handleRemoveClass = async () => {
    if (!window.confirm("Are you sure you want to archive this class? Students will be removed from this class but their records will remain.")) {
      return;
    }

    try {
      // Step 1: Remove classId from students
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("classIds", "array-contains", classId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const updatePromises = [];
      querySnapshot.forEach((docSnapshot) => {
        const student = docSnapshot.data();
        const updatedClassIds = student.classIds.filter(id => id !== classId);
        
        if (updatedClassIds.length > 0) {
          updatePromises.push(
            updateDoc(doc(db, "users", docSnapshot.id), {
              classIds: updatedClassIds
            })
          );
        } else {
          updatePromises.push(deleteDoc(doc(db, "users", docSnapshot.id)));
        }
      });
      
      await Promise.all(updatePromises);
      console.log(`Removed class ${classId} from students`);

      // Step 2: Get the class data before moving to archive
      const classDoc = await getDoc(doc(db, "classes", classId));
      if (classDoc.exists()) {
        const classDataToArchive = classDoc.data();
        
        // Step 3: Save to archivedClasses collection with metadata
        const archivedData = {
          ...classDataToArchive,
          originalClassId: classId,
          archivedAt: new Date(),
          archivedBy: auth.currentUser.uid,
          status: "archived"
        };

        await setDoc(doc(db, "archivedClasses", classId), archivedData);
        console.log(`Class moved to archivedClasses: ${classId}`);
      }

      // Step 4: Delete from active classes collection
      await deleteDoc(doc(db, "classes", classId));
      console.log(`Deleted class ${classId} from active classes`);

      alert("✅ Class archived successfully!");
      
      console.log("📢 Dispatching events for realtime sidebar update...");
      // Dispatch events for realtime sidebar update
      window.dispatchEvent(new Event('classArchived'));
      window.dispatchEvent(new Event('classesUpdated'));

      navigate("/teacher/classes/add");
    } catch (error) {
      console.error("Error archiving class:", error);
      alert("❌ Failed to archive class: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen font-Outfit">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-subtext">Loading class...</span>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex items-center justify-center min-h-screen font-Outfit">
        <p className="text-subtext">Class not found</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-6 md:p-8 font-Outfit">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/teacher/classes/add")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex flex-row gap-3 items-center">
          <School className="w-8 h-8 text-blue-500" />
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-title">
              {classData.name}
            </h2>
            <p className="text-md font-light text-subtext">
              {classData.studentCount} students • {classData.teacherName}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Subject</p>
            <p className="text-lg font-semibold text-gray-800">
              {classData.subject || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Uploaded</p>
            <p className="text-lg font-semibold text-gray-800">
              {classData.uploadedAt?.toDate().toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">File</p>
            <p className="text-lg font-semibold text-gray-800 truncate">
              {classData.fileName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between flex-wrap gap-3 mb-6">
        <button
          onClick={handleCreateAccountForAll}
          disabled={creatingAccounts || students.filter(s => !s.hasAccount).length === 0}
          className="px-6 py-3 bg-button text-white font-semibold rounded-xl hover:bg-buttonHover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {creatingAccounts ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Accounts...
            </>
          ) : (
            <>
              Create Accounts for All ({students.filter(s => !s.hasAccount).length})
            </>
          )}
        </button>

        <button
          onClick={handleRemoveClass}
          className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition flex items-center gap-2"
        >
          <Trash className="w-5 h-5" />
          Archive Class
        </button>
      </div>

      {accountCreationProgress && creatingAccounts && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-800 font-medium flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {accountCreationProgress}
          </p>
        </div>
      )}

      <div className="mb-6 bg-white border-2 border-gray-200 rounded-xl p-2 flex gap-2">
        <button
          onClick={() => setActiveTab("students")}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "students"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users className="w-5 h-5" />
          Students List
          {students.length > 0 && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              activeTab === "students"
                ? "bg-blue-700 text-white"
                : "bg-gray-200 text-gray-700"
            }`}>
              {students.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("quizzes")}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "quizzes"
              ? "bg-purple-600 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-100"
          }`}
        >
          <School className="w-5 h-5" />
          Assigned Quizzes
          {(assignedQuizzes.length + synchronousQuizzes.length) > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === "quizzes"
                ? "bg-purple-700 text-white"
                : "bg-gray-200 text-gray-700"
            }`}>
              {assignedQuizzes.length + synchronousQuizzes.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "students" ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <h3 className="text-xl font-bold text-title flex items-center gap-2">
              <span>Students List</span>
              <span className="text-base font-normal text-subtext">
                ({students.length} total)
              </span>
            </h3>
          </div>

          {loadingStudents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-subtext">Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-subtext">
              <p>No students found in this class</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Student No.
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Account
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50 transition ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                        {student.studentNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {student.emailAddress || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {student.program || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.hasAccount ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <Circle className="w-3 h-3 fill-current" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                            <Circle className="w-3 h-3" />
                            No Account
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-6 rounded-2xl shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <BookOpen className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">Assign a Quiz</h3>
                  <p className="text-sm text-green-100 mt-1">
                    Select from your published quizzes to assign to this class
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAssignQuizModal}
                className="flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold active:scale-95 hover:scale-105 duration-200 hover:bg-blue-50 transition shadow-lg"
              >
                <PlusCircle className="w-5 h-5" />
                Assign Quiz
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-yellow-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-yellow-50 to-amber-50">
              <h3 className="text-xl text-title font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-600" /> Synchronous Quizzes
                {synchronousQuizzes.length > 0 && (
                  <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold ml-2">
                    {synchronousQuizzes.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingSynchronous ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
                <span className="ml-3 text-gray-600">Loading…</span>
              </div>
            ) : synchronousQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-yellow-50">
                <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
                <p className="text-gray-500 text-lg">
                  No synchronous quizzes assigned to this class yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-yellow-50 border-b-2 border-yellow-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quiz Title</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned Date</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {synchronousQuizzes.map((a, index) => (
                      <tr key={`${a.quizId}-${a.classId}`} className={`hover:bg-yellow-50 transition ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                            <span className="font-bold text-gray-800">{a.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{a.subject || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            <Users className="w-4 h-4" />
                            {a.studentCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${a.sessionStatus === "active" ? "bg-green-100 text-green-800" : a.sessionStatus === "ended" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                            {a.sessionStatus === "active" ? "🟢 Active" : a.sessionStatus === "ended" ? "🔴 Ended" : "⚪ Not Started"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {a.assignedAt ? new Date(a.assignedAt.seconds * 1000).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => navigate(`/teacher/quiz-control/${a.quizId}/${a.classId}`)} className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-semibold flex items-center gap-1">
                              <Zap className="w-4 h-4" /> Control
                            </button>
                            <button onClick={() => navigate(`/teacher/assign-quiz-to-class/${a.quizId}/${a.classId}`)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-semibold flex items-center gap-1">
                              <Pen className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteAssignment(a, true)} disabled={deletingAssignment === `${a.quizId}-${a.classId}`} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold flex items-center gap-1 disabled:bg-gray-400">
                              {deletingAssignment === `${a.quizId}-${a.classId}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-violet-50">
              <h3 className="text-xl text-title font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" /> Asynchronous Quizzes
                {assignedQuizzes.length > 0 && (
                  <span className="bg-purple-400 text-purple-900 px-3 py-1 rounded-full text-sm font-bold ml-2">
                    {assignedQuizzes.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingAssigned ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-3 text-gray-600">Loading…</span>
              </div>
            ) : assignedQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-purple-50">
                <Users className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                <p className="text-gray-500 text-lg">No asynchronous quizzes assigned to this class yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-50 border-b-2 border-purple-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quiz Title</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned Date</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assignedQuizzes.map((a, index) => (
                      <tr key={`${a.quizId}-${a.classId}`} className={`hover:bg-purple-50 transition ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <span className="font-bold text-gray-800">{a.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{a.subject || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            <Users className="w-4 h-4" />
                            {a.studentCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {a.assignedAt ? new Date(a.assignedAt.seconds * 1000).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => navigate(`/teacher/quiz-results/${a.quizId}/${a.classId}`)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-1">
                              <Eye className="w-4 h-4" /> Results
                            </button>
                            <button onClick={() => navigate(`/teacher/assign-quiz-to-class/${a.quizId}/${a.classId}`)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-semibold flex items-center gap-1">
                              <Pen className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteAssignment(a, false)} disabled={deletingAssignment === `${a.quizId}-${a.classId}`} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold flex items-center gap-1 disabled:bg-gray-400">
                              {deletingAssignment === `${a.quizId}-${a.classId}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        studentCount={students.filter(s => !s.hasAccount).length}
        onConfirm={handlePasswordConfirm}
        onCancel={() => setShowPasswordModal(false)}
      />

      {showAssignQuizModal && classData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8" />
                <div>
                  <h3 className="text-2xl font-bold">Assign Quiz to {classData?.name}</h3>
                  <p className="text-sm text-green-100 mt-1">
                    Select a quiz from your published quizzes
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseAssignQuizModal}
                className="text-white hover:bg-blue-600 rounded-lg p-2 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingAvailableQuizzes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-subtext">Loading quizzes...</span>
                </div>
              ) : availableQuizzes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">No published quizzes found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Create a quiz first in the Manage Quizzes page
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Select a quiz to assign to this class:
                  </p>
                  {availableQuizzes.map((quiz) => (
                    <label
                      key={quiz.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                        selectedQuizForAssignment === quiz.id
                          ? "border-blue-500 bg-green-50"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="quizSelection"
                        value={quiz.id}
                        checked={selectedQuizForAssignment === quiz.id}
                        onChange={() => setSelectedQuizForAssignment(quiz.id)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-lg">
                          {quiz.title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>📝 {quiz.questionCount} questions</span>
                          <span>•</span>
                          <span>🎯 {quiz.totalPoints} points</span>
                        </div>
                      </div>
                      {selectedQuizForAssignment === quiz.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={handleCloseAssignQuizModal}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectQuizForAssignment}
                disabled={!selectedQuizForAssignment}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <PlusCircle className="w-5 h-5" />
                Continue to Assignment Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}