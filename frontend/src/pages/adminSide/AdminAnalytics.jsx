import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Award,
  Activity,
  Target,
  Download,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  
  // State for analytics data
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [activeQuizzes, setActiveQuizzes] = useState(0);
  const [activeClasses, setActiveClasses] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [quizPerformanceData, setQuizPerformanceData] = useState([]);
  const [studentActivityData, setStudentActivityData] = useState([]);
  const [programDistribution, setProgramDistribution] = useState([]);
  const [subjectDistribution, setSubjectDistribution] = useState([]);
  const [teacherPerformance, setTeacherPerformance] = useState([]);
  const [engagementTrend, setEngagementTrend] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserCounts(),
        fetchQuizCount(),
        fetchClassCount(),
        fetchAverageScore(),
        fetchCompletionRate(),
        fetchQuizPerformanceTrend(),
        fetchStudentActivity(),
        fetchProgramDistribution(),
        fetchSubjectDistribution(),
        fetchTeacherPerformance(),
        fetchEngagementTrend()
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
    setLoading(false);
  };

  // 1. Total Students and Teachers Count
  const fetchUserCounts = async () => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    let students = 0;
    let teachers = 0;
    
    usersSnapshot.forEach(doc => {
      const role = doc.data().role;
      if (role === "student") students++;
      if (role === "teacher") teachers++;
    });
    
    setTotalStudents(students);
    setTotalTeachers(teachers);
  };

  // 2. Active Quizzes Count
  const fetchQuizCount = async () => {
    const quizzesSnapshot = await getDocs(collection(db, "quizzes"));
    let activeCount = 0;
    
    quizzesSnapshot.forEach(doc => {
      const status = doc.data().status;
      if (status === "published" || status === "active") {
        activeCount++;
      }
    });
    
    setActiveQuizzes(activeCount);
  };

  // 3. Active Classes Count
  const fetchClassCount = async () => {
    const classesSnapshot = await getDocs(collection(db, "classes"));
    let activeCount = 0;
    
    classesSnapshot.forEach(doc => {
      const status = doc.data().status;
      if (status === "active") {
        activeCount++;
      }
    });
    
    setActiveClasses(activeCount);
  };

  // 4. Average Score from Quiz Submissions
  const fetchAverageScore = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    let totalScore = 0;
    let count = 0;

    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.score !== undefined && data.score !== null) {
        totalScore += data.score;
        count++;
      }
    });

    const average = count > 0 ? (totalScore / count).toFixed(1) : 0;
    setAvgScore(average);
  };

  // 5. Completion Rate from Assigned Quizzes
  const fetchCompletionRate = async () => {
    const assignedSnapshot = await getDocs(collection(db, "assignedQuizzes"));
    let completed = 0;
    let total = assignedSnapshot.size;

    assignedSnapshot.forEach(doc => {
      const status = doc.data().status;
      if (status === "completed") {
        completed++;
      }
    });

    const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
    setCompletionRate(rate);
  };

  // 6. Quiz Performance Trend (Last 6 Months)
  const fetchQuizPerformanceTrend = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    const monthlyData = {};

    // Get last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('en', { month: 'short' });
      months.push(monthKey);
      monthlyData[monthKey] = { totalScore: 0, count: 0, quizzesTaken: 0 };
    }

    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.submittedAt) {
        const submissionDate = data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
        const monthKey = submissionDate.toLocaleString('en', { month: 'short' });
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].quizzesTaken++;
          const scoreValue = data.rawScorePercentage !== undefined ? data.rawScorePercentage : data.base50ScorePercentage;
          if (scoreValue !== undefined) {
            monthlyData[monthKey].totalScore += scoreValue;
            monthlyData[monthKey].count++;
          }
        }
      }
    });

    const trendData = months.map(month => ({
      month,
      avgScore: monthlyData[month].count > 0 
        ? Math.round(monthlyData[month].totalScore / monthlyData[month].count) 
        : 0,
      quizzesTaken: monthlyData[month].quizzesTaken,
      completion: monthlyData[month].quizzesTaken > 0 ? 85 : 0
    }));

    setQuizPerformanceData(trendData);
  };

  // 7. Student Activity (Last 7 Days)
  const fetchStudentActivity = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activityByDay = {};

    // Initialize
    daysOfWeek.forEach(day => {
      activityByDay[day] = new Set();
    });

    // Count unique students active per day in last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.submittedAt) {
        const date = data.submittedAt.toDate();
        if (date >= oneWeekAgo) {
          const dayName = date.toLocaleString('en', { weekday: 'short' });
          if (activityByDay[dayName]) {
            activityByDay[dayName].add(data.studentId || data.userId);
          }
        }
      }
    });

    const activityData = daysOfWeek.map(day => ({
      day,
      active: activityByDay[day].size,
      inactive: Math.max(0, totalStudents - activityByDay[day].size)
    }));

    setStudentActivityData(activityData);
  };

  // 8. Program Distribution (BSIT-BA, etc.)
  const fetchProgramDistribution = async () => {
    const studentsSnapshot = await getDocs(
      query(collection(db, "users"), where("role", "==", "student"))
    );
    
    const programCount = {};
    studentsSnapshot.forEach(doc => {
      const program = doc.data().program || "Others";
      programCount[program] = (programCount[program] || 0) + 1;
    });

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    const distribution = Object.entries(programCount).map(([program, value], idx) => ({
      subject: program,
      value,
      color: colors[idx % colors.length]
    }));

    setProgramDistribution(distribution);
  };

  // 9. Subject Distribution from Classes
  const fetchSubjectDistribution = async () => {
    const classesSnapshot = await getDocs(collection(db, "classes"));
    
    const subjectCount = {};
    classesSnapshot.forEach(doc => {
      const subject = doc.data().subject || "Others";
      subjectCount[subject] = (subjectCount[subject] || 0) + 1;
    });

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const distribution = Object.entries(subjectCount).map(([subject, value], idx) => ({
      subject,
      value,
      color: colors[idx % colors.length]
    }));

    setSubjectDistribution(distribution);
  };

  // 10. Teacher Performance
  const fetchTeacherPerformance = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    const teacherMap = {};

    // Collect unique teachers from submissions
    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      const teacherEmail = data.teacherEmail;
      const teacherName = data.teacherName;
      
      if (teacherEmail && !teacherMap[teacherEmail]) {
        teacherMap[teacherEmail] = {
          email: teacherEmail,
          name: teacherName,
          scores: [],
          quizzes: new Set(),
          students: new Set()
        };
      }

      if (teacherEmail) {
        // Use rawScorePercentage or base50ScorePercentage
        const scoreValue = data.rawScorePercentage !== undefined 
          ? data.rawScorePercentage 
          : data.base50ScorePercentage;
        
        if (scoreValue !== undefined && scoreValue !== null) {
          teacherMap[teacherEmail].scores.push(scoreValue);
        }
        if (data.quizId) {
          teacherMap[teacherEmail].quizzes.add(data.quizId);
        }
        if (data.studentId) {
          teacherMap[teacherEmail].students.add(data.studentId);
        }
      }
    });

    const performance = Object.values(teacherMap).map(teacher => {
      const avgScore = teacher.scores.length > 0 
        ? Math.round(teacher.scores.reduce((a, b) => a + b, 0) / teacher.scores.length)
        : 0;

      return {
        email: teacher.email,
        quizzes: teacher.quizzes.size,
        avgScore: avgScore,
        students: teacher.students.size
      };
    });

    setTeacherPerformance(performance);
  };

  // 11. Engagement Trend (Last 6 Weeks)
  const fetchEngagementTrend = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    const weeklyData = [];

    for (let i = 5; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      let weekSubmissions = 0;
      const activeStudentsThisWeek = new Set();

      submissionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.submittedAt) {
          const date = data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
          if (date >= weekStart && date < weekEnd) {
            weekSubmissions++;
            activeStudentsThisWeek.add(data.studentId || data.userId);
          }
        }
      });

      const engagement = totalStudents > 0 
        ? Math.round((activeStudentsThisWeek.size / totalStudents) * 100)
        : 0;
      const participation = totalStudents > 0
        ? Math.round((weekSubmissions / totalStudents) * 100)
        : 0;

      weeklyData.push({
        week: `Week ${6 - i}`,
        engagement,
        participation: Math.min(participation, 100)
      });
    }

    setEngagementTrend(weeklyData);
  };

  const StatCard = ({ icon: Icon, title, value, change, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800 mb-2">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              <TrendingUp className={`${change >= 0 ? 'text-green-500' : 'text-red-500'}`} size={16} />
              <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-gray-400 text-xs ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-Outfit">
        <div className="text-center flex-row flex gap-3 items-center">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={36} />
          <p className="text-subtext">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-2 md:p-8 font-Outfit animate-fadeIn">
      {/* Header */}
      <div className=" z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-title">Analytics Dashboard</h1>
                <p className="text-sm text-subtext">Comprehensive system insights and metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Download size={18} />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Total Students"
            value={totalStudents.toLocaleString()}
            change={12.5}
            color="bg-blue-500"
          />
          <StatCard
            icon={Users}
            title="Total Teachers"
            value={totalTeachers}
            change={5.2}
            color="bg-purple-500"
          />
          <StatCard
            icon={BookOpen}
            title="Active Quizzes"
            value={activeQuizzes}
            change={8.3}
            color="bg-green-500"
          />
          <StatCard
            icon={Target}
            title="Active Classes"
            value={activeClasses}
            change={6.7}
            color="bg-orange-500"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            icon={Award}
            title="Average Score"
            value={`${avgScore}%`}
            change={5.7}
            color="bg-indigo-500"
          />
          <StatCard
            icon={Activity}
            title="Completion Rate"
            value={`${completionRate}%`}
            change={3.2}
            color="bg-pink-500"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
       {/* Quiz Performance Trend */}
          <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-lg border border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Quiz Performance Trend</h3>
                  <p className="text-sm text-gray-500">Average scores over time</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={24} />
                </div>
              </div>
              {quizPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={quizPerformanceData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                      </linearGradient>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3"/>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6B7280" 
                      fontSize={12}
                      axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#6B7280" 
                      fontSize={12}
                      axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #3B82F6',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgScore" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      fill="url(#colorScore)"
                      filter="url(#shadow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Student Activity */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Student Activity</h3>
                <p className="text-sm text-gray-500">Active vs inactive students by day</p>
              </div>
              <Users className="text-green-500" size={24} />
            </div>
            {studentActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={studentActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="active" fill="#10B981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="inactive" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Program Distribution */}
          {programDistribution.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Program Distribution</h3>
                  <p className="text-sm text-gray-500">Students by program</p>
                </div>
                <Target className="text-purple-500" size={24} />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={programDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {programDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {programDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-600">{item.subject}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Teacher Performance Table */}
        {teacherPerformance.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Teacher Performance</h3>
                <p className="text-sm text-gray-500">Overview of teacher contributions</p>
              </div>
              <Award className="text-blue-500" size={24} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Teacher Email</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Quizzes Created</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Avg. Student Score</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Total Students</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherPerformance.map((teacher, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-800">{teacher.email}</span>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-700">{teacher.quizzes}</td>
                      <td className="text-center py-4 px-4">
                        <span className="font-semibold text-gray-800">{teacher.avgScore}%</span>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-700">{teacher.students}</td>
                      <td className="text-center py-4 px-4">
                        <div className="flex items-center justify-center">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                              style={{ width: `${teacher.avgScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}