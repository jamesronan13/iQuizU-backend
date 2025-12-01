import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LOGO from "../assets/iQuizU.svg";
import {
    Menu,
    X,
    BarChart3,
    UsersRound,
    LogOut,
    Home,
    ChevronLeft,
    ChevronRight,
    NotebookTabs,
    } from "lucide-react";
    import { auth } from "../firebase/firebaseConfig";
    import { signOut } from "firebase/auth";

export default function AdminSidebar({ user, userDoc }) {
  const [isOpen, setIsOpen] = useState(false);
  // 🔹 FIXED: Load collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('studentSidebarCollapsed');
    return saved === 'true';
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 🔹 FIXED: Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('studentSidebarCollapsed', isCollapsed.toString());
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isCollapsed ? "80px" : "288px"
    );
  }, [isCollapsed]);

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
      { to: "/admin/dashboard", icon: Home, label: "Dashboard" },
      { to: "/admin/teachers", icon: UsersRound, label: "Manage Teachers" },
      { to: "/admin/students", icon: NotebookTabs, label: "Manage Students" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  ];


  // Function to check if link is active
    const isActive = (path) => {
        if (path === "/admin/dashboard") {
            return location.pathname === "/admin/dashboard";
        }
        return location.pathname.includes(path);
    };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-50 bg-components text-black p-3 rounded-full shadow-md hover:bg-gray-50 transition-all lg:hidden border border-gray-100 hover:scale-105"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-2xl transition-all duration-300 ease-in-out z-40
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
        w-72`}
      >
        {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-400/50 to-blue-800/50 backdrop-blur-sm font-Outfit cursor-default">
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center py-6 ml-4" : "px-10 py-6 gap-3"
              } transition-all duration-300`}
            >
              {/* Logo and Text Container */}
              <div className="flex items-center gap-4 transform hover:scale-105 transition-transform duration-300">
                {/* Logo */}
                <img
                  src={LOGO}
                  alt="Logo"
                  className={`transition-all duration-300 ${
                    isCollapsed ? "w-10 h-10" : "w-12 h-12"
                  }`}
                />
                
                <div
                  className={`flex flex-col text-white overflow-hidden transition-all duration-300 ${
                    isCollapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs"
                  }`}
                >
                  <h1 className="text-2xl font-bold leading-tight">iQuizU</h1>
                  <p className="text-sm -mt-1">Admin</p>
                </div>
              </div>
            </div>  

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full items-center justify-center shadow-md hover:bg-blue-50 transition-all hover:scale-110 border-2 border-blue-600"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight size={14} className="text-blue-600" />
            ) : (
              <ChevronLeft size={14} className="text-blue-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={`flex flex-col px-4 py-6 space-y-3 overflow-y-auto h-[calc(100vh-200px)] transition-all duration-300 ${
            isCollapsed ? "px-2" : "px-6"
          }`}
        >
          {/* --- Menu Items --- */}
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
                    title={isCollapsed ? item.label : ""}
                    className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group
                    ${
                        isCollapsed
                        ? "justify-center py-3 hover:bg-white/10"
                        : "gap-4 px-3 py-3 hover:bg-white/10"
                    }
                    ${isActive(item.to) ? "bg-white/20 shadow-lg" : ""}`}
                >
                    {/* Hover gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>

                    {/* Icon */}
                    <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300 ${isActive(item.to) ? "scale-110" : ""}`}>
                        <item.icon size={22} className="text-white" />
                    </div>

                    {/* Label */}
                    <span
                    className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${
                        isCollapsed
                        ? "opacity-0 max-w-0 overflow-hidden"
                        : "opacity-100 max-w-xs"
                    }`}
                    >
                    {item.label}
                    </span>
                </Link>
                ))}
            </div>

          {/* --- Divider --- */}
          <div className="pt-4 pb-2">
            <div className="border-t border-white/20 rounded-full"></div>
          </div>

          {/* --- Logout Button --- */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowConfirm(true);
            }}
            title={isCollapsed ? "Logout" : ""}
            className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group w-full
              ${
                isCollapsed
                  ? "justify-center py-3 hover:bg-red-500/30"
                  : "gap-4 px-3 py-3.5 hover:bg-red-500/30"
              }`}
          >
            {/* Hover gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>

            {/* Icon */}
            <div className="relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300">
              <LogOut size={22} className="text-white" />
            </div>

            {/* Label */}
            <span
              className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${
                isCollapsed
                  ? "opacity-0 max-w-0 overflow-hidden"
                  : "opacity-100 max-w-xs"
              }`}
            >
              Logout
            </span>
          </button>
        </nav> 
        </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Logout Confirmation Modal */}
      {showConfirm && (
              <div className="font-Outfit fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-slideUp">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-4 rounded-full items-center justify-center flex">
                      <LogOut className="text-red-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-title">Confirm Logout</h3>
                      <p className="text-subtext">
                        Are you sure you want to log out?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 active:scale-95 hover:scale-105 duration-200 transition font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 active:scale-95 hover:scale-105 duration-200 transition font-semibold"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
      )}
    </>
  );
}