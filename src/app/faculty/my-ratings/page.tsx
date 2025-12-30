'use client';

import React, { useState } from 'react'

interface Feedback {
  id: number;
  course: string;
  semester: string;
  overallScore: number; // out of 5
  teachingQuality: number;
  contentClarity: number;
  engagement: number;
  comments: string;
  date: string;
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
  const [viewMode, setViewMode] = useState<'recent' | 'course' | 'semester'>('recent')
  const [selectedCourse, setSelectedCourse] = useState('All Courses')

  // Sample data - in a real app, this would come from an API
  const feedbacks: Feedback[] = [
    {
      id: 1,
      course: 'Data Structures (CS-301)',
      semester: 'Fall 2025',
      overallScore: 4.5,
      teachingQuality: 4.7,
      contentClarity: 4.3,
      engagement: 4.6,
      comments: 'Excellent teaching methodology. More practical examples would be great.',
      date: 'Dec 20, 2025',
    },
    {
      id: 2,
      course: 'Algorithms (CS-302)',
      semester: 'Fall 2025',
      overallScore: 4.2,
      teachingQuality: 4.0,
      contentClarity: 4.5,
      engagement: 4.1,
      comments: 'Clear explanations, but pace could be adjusted.',
      date: 'Dec 18, 2025',
    },
    {
      id: 3,
      course: 'Data Structures (CS-301)',
      semester: 'Spring 2025',
      overallScore: 4.8,
      teachingQuality: 4.9,
      contentClarity: 4.7,
      engagement: 4.8,
      comments: 'Highly engaging sessions!',
      date: 'May 15, 2025',
    },
  ]

  const courses = ['All Courses', 'Data Structures (CS-301)', 'Algorithms (CS-302)']
  const semesters = ['Fall 2025', 'Spring 2025', 'Fall 2024']

  const semesterSummaries: SemesterSummary[] = [
    {
      semester: 'Fall 2025',
      totalFeedback: 25,
      averageOverall: 4.4,
      averageTeaching: 4.5,
      averageClarity: 4.3,
      averageEngagement: 4.4,
    },
    {
      semester: 'Spring 2025',
      totalFeedback: 18,
      averageOverall: 4.6,
      averageTeaching: 4.7,
      averageClarity: 4.5,
      averageEngagement: 4.6,
    },
    {
      semester: 'Fall 2024',
      totalFeedback: 22,
      averageOverall: 4.3,
      averageTeaching: 4.4,
      averageClarity: 4.2,
      averageEngagement: 4.3,
    },
  ]

  const filteredFeedbacks = selectedCourse === 'All Courses' 
    ? feedbacks 
    : feedbacks.filter(f => f.course === selectedCourse)

  const getRatingColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-yellow-600';
    if (score >= 3.5) return 'text-orange-600';
    return 'text-red-600';
  }

  const QuickActions = () => (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('recent')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'recent' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Recent Feedback
        </button>
        <button
          onClick={() => setViewMode('course')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'course' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Course-wise
        </button>
        <button
          onClick={() => setViewMode('semester')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'semester' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Semester-wise
        </button>
      </div>
      {viewMode === 'course' && (
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          {courses.map(course => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
      )}
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Download Report
      </button>
    </div>
  )

  const averageOverall = feedbacks.reduce((sum, f) => sum + f.overallScore, 0) / feedbacks.length || 0
  const totalFeedback = feedbacks.length
  const anonymousCount = feedbacks.filter(f => f.comments.includes('Anonymous')).length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Ratings</h1>
          <p className="text-gray-600 mt-2">Feedback received from students and performance overview.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Overall Summary */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overall Performance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold" style={{ color: getRatingColor(averageOverall) }}>{averageOverall.toFixed(1)}</p>
              <p className="text-sm text-gray-600 mt-1">Average Overall Rating (/5)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{totalFeedback}</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score (/5)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teaching Quality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Clarity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFeedbacks.slice(0, 5).map((feedback) => (
                    <tr key={feedback.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{feedback.course}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getRatingColor(feedback.overallScore)}`}>{feedback.overallScore}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.teachingQuality}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.contentClarity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.engagement}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{feedback.comments}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feedback.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View Full</button>
                      </td>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Overall (/5)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Teaching</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Clarity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.slice(1).map((course, index) => {
                    const courseFeedback = feedbacks.filter(f => f.course === course)
                    const avgOverall = courseFeedback.reduce((sum, f) => sum + f.overallScore, 0) / courseFeedback.length || 0
                    const avgTeaching = courseFeedback.reduce((sum, f) => sum + f.teachingQuality, 0) / courseFeedback.length || 0
                    const avgClarity = courseFeedback.reduce((sum, f) => sum + f.contentClarity, 0) / courseFeedback.length || 0
                    const avgEngagement = courseFeedback.reduce((sum, f) => sum + f.engagement, 0) / courseFeedback.length || 0
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{courseFeedback.length}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getRatingColor(avgOverall)}`}>{avgOverall.toFixed(1)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{avgTeaching.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{avgClarity.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{avgEngagement.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">View Details</button>
                        </td>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Overall (/5)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Teaching</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Clarity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {semesterSummaries.map((summary, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{summary.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{summary.totalFeedback}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getRatingColor(summary.averageOverall)}`}>{summary.averageOverall.toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{summary.averageTeaching.toFixed(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{summary.averageClarity.toFixed(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{summary.averageEngagement.toFixed(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Anonymous Feedback Summary */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anonymous Feedback Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Common Themes</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Engaging lectures (mentioned in 15 feedbacks)</li>
                <li>• Clear explanations of complex topics (12 feedbacks)</li>
                <li>• Suggestions for more assignments (8 feedbacks)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Overall Sentiment</h3>
              <p className="text-2xl font-bold text-green-600">Positive (85%)</p>
              <p className="text-sm text-gray-600 mt-1">Based on sentiment analysis of comments</p>
            </div>
          </div>
        </div>

        {/* Rating Trends Chart */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Rating Trends Over Semesters</h2>
          <canvas id="ratingChart" width="400" height="200"></canvas>
          <script>
            {
              `
              const ctx = document.getElementById('ratingChart').getContext('2d');
              const chart = new Chart(ctx, {
                type: 'line',
                data: {
                  labels: ['Fall 2024', 'Spring 2025', 'Fall 2025'],
                  datasets: [{
                    label: 'Average Overall Rating',
                    data: [4.3, 4.6, 4.4],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1
                  }]
                },
                options: {
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 5
                    }
                  }
                }
              });
              `
            }
          </script>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Feedback</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalFeedback}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Average Rating</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{averageOverall.toFixed(1)}/5</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Semesters Covered</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{semesterSummaries.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}