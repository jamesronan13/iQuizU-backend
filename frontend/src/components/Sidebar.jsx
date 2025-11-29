import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import LOGO from "../assets/iQuizU.svg";
import {
  Menu,
  X,
  BookOpen,
  FileText,
  BarChart3,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Archive,
} from "lucide-react";

export default function Sidebar({ user, userDoc }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // FIXED: Simple logic - if collapsed, stay collapsed unless explicitly expanded
  const shouldExpand = !isCollapsed;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      shouldExpand ? "288px" : "80px"
    );
  }, [shouldExpand]);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    const handleClassesUpdate = () => {
      console.log("🔄 Classes updated event received, refreshing sidebar...");
      fetchClasses();
      setClassesOpen(true);
    };

    const handleClassArchived = () => {
      console.log("📦 Class archived event received, removing from sidebar...");
      fetchClasses();
      setClassesOpen(true);
    };

    window.addEventListener('classesUpdated', handleClassesUpdate);
    window.addEventListener('classArchived', handleClassArchived);
    
    return () => {
      window.removeEventListener('classesUpdated', handleClassesUpdate);
      window.removeEventListener('classArchived', handleClassArchived);
    };
  }, [user]);

  useEffect(() => {
    if (location.pathname.includes('/teacher/class')) {
      fetchClasses();
    }
  }, [location.pathname]);

  const fetchClasses = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const classList = [];
      querySnapshot.forEach((docSnapshot) => {
        const classData = docSnapshot.data();
        
        if (classData.status !== "archived") {
          classList.push({ id: docSnapshot.id, ...classData });
        }
      });

      classList.sort((a, b) => {
        const dateA = a.uploadedAt?.toDate() || new Date(0);
        const dateB = b.uploadedAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setClasses(classList);
      console.log(`✅ Fetched ${classList.length} active classes`);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  const menuItems = [
    { to: "/teacher", icon: Home, label: "Dashboard" },
  ];

  const otherMenuItems = [
    { to: "quizzes", icon: FileText, label: "Quizzes" },
    { to: "reports", icon: BarChart3, label: "Reports" },
  ];

  const isActive = (path) => {
    if (path === "/teacher") {
      return location.pathname === "/teacher";
    }
    return location.pathname.includes(path);
  };

  const isClassActive = (classId) => {
    return location.pathname.includes(`/teacher/class/${classId}`);
  };

  const userName = userDoc?.firstName || user?.displayName || "Teacher";
  const userEmail = userDoc?.email || user?.email || userDoc?.teacherEmail || "Educator";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-50 bg-components text-black p-3 rounded-full shadow-md hover:bg-gray-50 transition-all lg:hidden border border-gray-100 hover:scale-105"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div
        className={`fixed top-0 left-0 h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-2xl transition-all duration-300 ease-in-out z-40
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0
        ${shouldExpand ? "lg:w-72" : "lg:w-20"}
        w-72`}
      >
        <div className="relative bg-gradient-to-r from-green-800/50 to-blue-800/50 backdrop-blur-sm font-Outfit cursor-default">
          <div
            className={`flex items-center ${
              shouldExpand ? "px-10 py-6 gap-3" : "justify-center py-6 ml-4"
            } transition-all duration-300`}
          >
            <div className="flex items-center gap-4 transform hover:scale-105 transition-transform duration-300">
              <img
                src={LOGO}
                alt="Logo"
                className={`transition-all duration-300 ${
                  shouldExpand ? "w-12 h-12" : "w-10 h-10"
                }`}
              />
              
              <div
                className={`flex flex-col text-white overflow-hidden transition-all duration-300 ${
                  shouldExpand ? "opacity-100 max-w-xs" : "opacity-0 max-w-0"
                }`}
              >
                <h1 className="text-2xl font-bold leading-tight">iQuizU</h1>
                <p className="text-sm -mt-1">Teacher</p>
              </div>
            </div>
          </div>  

          <button
            onClick={() => {
              console.log("🔘 Toggle clicked! Current:", isCollapsed, "→ New:", !isCollapsed);
              setIsCollapsed(!isCollapsed);
            }}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full items-center justify-center shadow-md hover:bg-green-50 transition-all hover:scale-110 border-2 border-blue-600"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight size={14} className="text-blue-600" />
            ) : (
              <ChevronLeft size={14} className="text-blue-600" />
            )}
          </button>
        </div>

        <nav
          style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
        }}
          className={`flex flex-col py-6 space-y-1 overflow-y-auto h-[calc(100vh-200px)] transition-all duration-300 custom-scrollbar ${
            shouldExpand ? "px-6" : "px-2"
          }`}
        >
          <div className="flex flex-col space-y-3">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  setIsOpen(false);
                  if (isActive(item.to)) {
                    window.dispatchEvent(new Event('refreshPage'));
                  }
                }}
                title={!shouldExpand ? item.label : ""}
                className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group
                ${
                  shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-white/10"
                    : "justify-center py-3 hover:bg-white/10"
                }
                ${isActive(item.to) ? "bg-white/20 shadow-lg" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300 ${isActive(item.to) ? "scale-110" : ""}`}>
                  <item.icon size={22} className="text-white" />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${
                    shouldExpand
                      ? "opacity-100 max-w-xs"
                      : "opacity-0 max-w-0 overflow-hidden"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}

            <div>
              <button
                onClick={() => {
                  if (shouldExpand) {
                    setClassesOpen(!classesOpen);
                  }
                }}
                title={!shouldExpand ? "Classes" : ""}
                className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group w-full
                ${
                  shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-white/10"
                    : "justify-center py-3 hover:bg-white/10"
                }
                ${location.pathname.includes('/teacher/class') && !location.pathname.includes('/archive') ? "bg-white/20 shadow-lg" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300 ${location.pathname.includes('/teacher/class') && !location.pathname.includes('/archive') ? "scale-110" : ""}`}>
                  <BookOpen size={22} className="text-white" />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap flex-1 text-left ${
                    shouldExpand
                      ? "opacity-100 max-w-xs"
                      : "opacity-0 max-w-0 overflow-hidden"
                  }`}
                >
                  Classes
                </span>
                {shouldExpand && (
                  <div className="relative">
                    {classesOpen ? (
                      <ChevronUp size={18} className="text-white" />
                    ) : (
                      <ChevronDown size={18} className="text-white" />
                    )}
                  </div>
                )}
              </button>

              {shouldExpand && classesOpen && (
                <div className="mt-2 ml-4 space-y-2 border-l-2 border-white/20 pl-4 animate-fadeIn">
                  <Link
                    to="/teacher/classes/add"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center -ml-1 gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 group"
                  >
                    <Plus size={18} className="text-white group-hover:scale-110 transition-transform" />
                    <span className="font-Outfit text-sm font-medium">Add Class</span>
                  </Link>

                  {classes.length === 0 && (
                    <div className="px-3 py-2 text-white/60 text-sm italic">
                      No classes yet
                    </div>
                  )}

                  {classes.map((cls) => (
                    <Link
                      key={cls.id}
                      to={`/teacher/class/${cls.id}`}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 group ${
                        isClassActive(cls.id) ? "bg-white/15" : ""
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 group-hover:scale-125 transition-transform"></div>
                      <span className="font-Outfit text-sm font-medium truncate flex-1">
                        {cls.name}
                      </span>
                      <span className="text-xs text-white/60 font-Outfit">
                        {cls.studentCount}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {otherMenuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  setIsOpen(false);
                  if (isActive(item.to)) {
                    window.dispatchEvent(new Event('refreshPage'));
                  }
                }}
                title={!shouldExpand ? item.label : ""}
                className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group
                ${
                  shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-white/10"
                    : "justify-center py-3 hover:bg-white/10"
                }
                ${isActive(item.to) ? "bg-white/20 shadow-lg" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300 ${isActive(item.to) ? "scale-110" : ""}`}>
                  <item.icon size={22} className="text-white" />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${
                    shouldExpand
                      ? "opacity-100 max-w-xs"
                      : "opacity-0 max-w-0 overflow-hidden"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}

            <div>
              <button
                onClick={() => {
                  if (shouldExpand) {
                    setArchiveOpen(!archiveOpen);
                  }
                }}
                title={!shouldExpand ? "Archives" : ""}
                className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group w-full
                ${
                  shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-white/10"
                    : "justify-center py-3 hover:bg-white/10"
                }
                ${location.pathname.includes('/teacher/archives') ? "bg-white/20 shadow-lg" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300 ${location.pathname.includes('/teacher/archives') ? "scale-110" : ""}`}>
                  <Archive size={22} className="text-white" />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap flex-1 text-left ${
                    shouldExpand
                      ? "opacity-100 max-w-xs"
                      : "opacity-0 max-w-0 overflow-hidden"
                  }`}
                >
                  Archives
                </span>
                {shouldExpand && (
                  <div className="relative">
                    {archiveOpen ? (
                      <ChevronUp size={18} className="text-white" />
                    ) : (
                      <ChevronDown size={18} className="text-white" />
                    )}
                  </div>
                )}
              </button>

              {shouldExpand && archiveOpen && (
                <div className="mt-2 ml-4 space-y-2 border-l-2 border-white/20 pl-4 animate-fadeIn">
                  <Link
                    to="/teacher/archives/classes"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 group ${
                      location.pathname === '/teacher/archives/classes' ? 'bg-white/15' : ''
                    }`}
                  >
                    <BookOpen size={18} className="text-amber-300 group-hover:scale-110 transition-transform" />
                    <span className="font-Outfit text-sm font-medium">Archived Classes</span>
                  </Link>

                  <Link
                    to="/teacher/archives/quizzes"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 group ${
                      location.pathname === '/teacher/archives/quizzes' ? 'bg-white/15' : ''
                    }`}
                  >
                    <FileText size={18} className="text-amber-300 group-hover:scale-110 transition-transform" />
                    <span className="font-Outfit text-sm font-medium">Archived Quizzes</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 pb-2">
            <div className="border-t border-white/20 rounded-full"></div>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              setShowConfirm(true);
            }}
            title={!shouldExpand ? "Logout" : ""}
            className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group w-full
              ${
                shouldExpand
                  ? "gap-4 px-3 py-3.5 hover:bg-red-500/30"
                  : "justify-center py-3 hover:bg-red-500/30"
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/50 to-red-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
            <div className="relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300">
              <LogOut size={22} className="text-white" />
            </div>
            <span
              className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${
                shouldExpand
                  ? "opacity-100 max-w-xs"
                  : "opacity-0 max-w-0 overflow-hidden"
              }`}
            >
              Logout
            </span>
          </button>
        </nav>

        <div
          onClick={() => {
            setIsOpen(false);
            navigate('/teacher/profile');
          }}
          className={`flex w-full absolute bottom-0 font-Outfit items-center bg-gradient-to-r from-green-900/50 to-blue-900/50 backdrop-blur-sm border-t border-white/10 transition-all duration-300 cursor-pointer ${
            shouldExpand ? "px-10 py-6 gap-3" : "items-center justify-center py-6 pl-4"
          }`}
        >
          <div className="flex items-center gap-4 transform hover:scale-105 transition-transform duration-300">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20 flex-shrink-0">
              {userInitial}
            </div>
            <div
              className={`flex flex-col text-white overflow-hidden transition-all duration-300 ${
                shouldExpand ? "opacity-100 max-w-xs" : "opacity-0 max-w-0"
              }`}
            >
              <p className="text-white font-semibold text-sm">{userName}</p>
              <p className="text-blue-200 font-light text-xs">{userEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-Outfit">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Are you sure you want to logout?
            </h2>
            <div className="flex justify-center gap-4 mt-5">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-all"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleLogout();
                }}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        nav.custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        nav.custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }

        nav.custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        nav.custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        nav.custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
        }

        nav.custom-scrollbar {
          overflow-y: scroll;
          scrollbar-gutter: stable;
        }
      `}</style>
    </>
  );
}