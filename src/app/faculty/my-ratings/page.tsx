'use client';

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Feedback {
  id: string;
  facultyId: string;
  course: string;
  semester: string;
  overallScore: number;
  teachingQuality: number;
  contentClarity: number;
  engagement: number;
  comments: string;
  date: string;
  createdAt: any;
}

interface SemesterSummary {
  semester: string;
  totalFeedback: number;
  averageOverall: number;
  averageTeaching: number;
  averageClarity: number;
  averageEngagement: number;
}

export default function page() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [viewMode, setViewMode] = useState<'recent' | 'course' | 'semester'>('recent')
  const [selectedCourse, setSelectedCourse] = useState('All Courses')

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, 'student_feedback'),
      where('facultyId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Feedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      
      // Sort by date (newest first)
      fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setFeedbacks(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Derived Data
  const courses = useMemo(() => {
    const unique = Array.from(new Set(feedbacks.map(f => f.course)));
    return ['All Courses', ...unique];
  }, [feedbacks]);

  const semesterSummaries = useMemo(() => {
    const map = new Map<string, Feedback[]>();
    feedbacks.forEach(f => {
      if (!map.has(f.semester)) map.set(f.semester, []);
      map.get(f.semester)?.push(f);
    });

    const summaries: SemesterSummary[] = [];
    map.forEach((list, semester) => {
      summaries.push({
        semester,
        totalFeedback: list.length,
        averageOverall: list.reduce((sum, f) => sum + f.overallScore, 0) / list.length,
        averageTeaching: list.reduce((sum, f) => sum + f.teachingQuality, 0) / list.length,
        averageClarity: list.reduce((sum, f) => sum + f.contentClarity, 0) / list.length,
        averageEngagement: list.reduce((sum, f) => sum + f.engagement, 0) / list.length,
      });
    });
    // Sort semesters (logic depends on format, defaulting to simple string sort for now or could implement specific order)
    return summaries.sort((a, b) => a.semester.localeCompare(b.semester)); 
  }, [feedbacks]);

  const filteredFeedbacks = selectedCourse === 'All Courses' 
    ? feedbacks 
    : feedbacks.filter(f => f.course === selectedCourse)

  const averageOverall = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + f.overallScore, 0) / feedbacks.length
    : 0;
  
  const anonymousCount = feedbacks.filter(f => f.comments.includes('Anonymous')).length || 0; // Simple heuristic for now

  // Add Mock Data Handler
  const handleAddMockData = async () => {
    if (!user) return;
    try {
        const mockCourses = ['Data Structures (CS-301)', 'Algorithms (CS-302)', 'Database Systems (CS-401)'];
        const mockSemesters = ['Fall 2024', 'Spring 2025', 'Fall 2025'];
        const randomCourse = mockCourses[Math.floor(Math.random() * mockCourses.length)];
        const randomSemester = mockSemesters[Math.floor(Math.random() * mockSemesters.length)];
        const scores = {
            overall: 3 + Math.random() * 2,
            teaching: 3 + Math.random() * 2,
            clarity: 3 + Math.random() * 2,
            engagement: 3 + Math.random() * 2,
        };
        
        await addDoc(collection(db, 'student_feedback'), {
            facultyId: user.uid,
            course: randomCourse,
            semester: randomSemester,
            overallScore: parseFloat(scores.overall.toFixed(1)),
            teachingQuality: parseFloat(scores.teaching.toFixed(1)),
            contentClarity: parseFloat(scores.clarity.toFixed(1)),
            engagement: parseFloat(scores.engagement.toFixed(1)),
            comments: Math.random() > 0.5 ? 'Great course! Anonymous.' : 'Needs improvement in pacing.',
            date: new Date().toISOString().split('T')[0],
            createdAt: Timestamp.now()
        });
        toast.success("Mock Feedback Added");
    } catch (e) {
        console.error(e);
        toast.error("Failed to add mock data");
    }
  }

  const getRatingColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-yellow-600';
    if (score >= 3.5) return 'text-orange-600';
    return 'text-red-600';
  }

  // Chart Configuration
  const chartData = {
    labels: semesterSummaries.map(s => s.semester),
    datasets: [
      {
        label: 'Average Overall Rating',
        data: semesterSummaries.map(s => s.averageOverall.toFixed(2)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.2,
      },
      {
        label: 'Teaching Quality',
        data: semesterSummaries.map(s => s.averageTeaching.toFixed(2)),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.2,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
        y: {
            min: 0,
            max: 5,
        }
    }
  };

  if(!user) return <div className="p-10 text-center">Please login to view ratings.</div>

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Ratings</h1>
            <p className="text-gray-600 mt-2">Feedback received from students and performance overview.</p>
          </div>
          <button onClick={handleAddMockData} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded">
             + Add Mock Feedback
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex space-x-2">
                <button onClick={() => setViewMode('recent')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'recent' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Recent Feedback</button>
                <button onClick={() => setViewMode('course')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'course' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Course-wise</button>
                <button onClick={() => setViewMode('semester')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'semester' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Semester-wise</button>
            </div>
            {viewMode === 'course' && (
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                {courses.map(course => (
                    <option key={course} value={course}>{course}</option>
                ))}
                </select>
            )}
        </div>

        {/* Overall Summary */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overall Performance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className={`text-4xl font-bold ${getRatingColor(averageOverall)}`}>{averageOverall.toFixed(1)}</p>
              <p className="text-sm text-gray-600 mt-1">Average Overall Rating (/5)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{feedbacks.length}</p>
              <p className="text-sm text-gray-600 mt-1">Total Feedback Received</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{anonymousCount}</p>
              <p className="text-sm text-gray-600 mt-1">Anonymous Feedback</p>
            </div>
          </div>
        </div>

        {/* View Modes */}
        {viewMode === 'recent' ? (
          <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Student Feedback</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teaching</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFeedbacks.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No feedback found.</td></tr>
                  ) : filteredFeedbacks.slice(0, 10).map((feedback) => (
                    <tr key={feedback.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{feedback.course}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getRatingColor(feedback.overallScore)}`}>{feedback.overallScore}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.teachingQuality}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{feedback.comments}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'course' ? (
          <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
             <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Course-wise Ratings</h2>
            </div>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Feedback</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Overall</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Teaching</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Clarity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Engagement</th>
                   </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                   {courses.filter(c => c !== 'All Courses').map((course, index) => {
                     const cf = feedbacks.filter(f => f.course === course);
                     if (cf.length === 0) return null;
                     const avg = (key: keyof Feedback) => cf.reduce((sum, f) => sum + (f[key] as number), 0) / cf.length;
                     return (
                       <tr key={index} className="hover:bg-gray-50">
                         <td className="px-6 py-4 font-medium text-gray-900">{course}</td>
                         <td className="px-6 py-4 text-gray-900">{cf.length}</td>
                         <td className={`px-6 py-4 font-medium ${getRatingColor(avg('overallScore'))}`}>{avg('overallScore').toFixed(1)}</td>
                         <td className="px-6 py-4 text-gray-900">{avg('teachingQuality').toFixed(1)}</td>
                         <td className="px-6 py-4 text-gray-900">{avg('contentClarity').toFixed(1)}</td>
                         <td className="px-6 py-4 text-gray-900">{avg('engagement').toFixed(1)}</td>
                       </tr>
                     )
                   })}
                </tbody>
               </table>
             </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
             <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Semester-wise Performance</h2>
            </div>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Feedback</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Overall</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Teaching</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Clarity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Engagement</th>
                   </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                   {semesterSummaries.map((s, index) => (
                       <tr key={index} className="hover:bg-gray-50">
                         <td className="px-6 py-4 font-medium text-gray-900">{s.semester}</td>
                         <td className="px-6 py-4 text-gray-900">{s.totalFeedback}</td>
                         <td className={`px-6 py-4 font-medium ${getRatingColor(s.averageOverall)}`}>{s.averageOverall.toFixed(1)}</td>
                         <td className="px-6 py-4 text-gray-900">{s.averageTeaching.toFixed(1)}</td>
                         <td className="px-6 py-4 text-gray-900">{s.averageClarity.toFixed(1)}</td>
                         <td className="px-6 py-4 text-gray-900">{s.averageEngagement.toFixed(1)}</td>
                       </tr>
                   ))}
                </tbody>
               </table>
             </div>
          </div>
        )}

        {/* Rating Trends Chart */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Rating Trends Over Semesters</h2>
          <div className="h-[300px] w-full">
            {semesterSummaries.length > 0 ? (
                <Line options={chartOptions} data={chartData} />
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No trend data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}