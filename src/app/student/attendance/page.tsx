import React from 'react';

export default function page() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen mt-[80px]">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance Overview</h1>

      {/* Overall Attendance Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Overall Attendance</h2>
            <p className="text-blue-600 font-medium">75.6%</p>
          </div>
          <div className="relative">
            {/* Donut Chart SVG */}
            <svg width="120" height="120" viewBox="0 0 120 120">
              {/* Background circle (absent) */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#DBEAFE"
                strokeWidth="10"
                strokeDasharray="314"
                strokeDashoffset="0"
              />
              {/* Foreground circle (present) */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="10"
                strokeDasharray="237.248"
                strokeDashoffset="0"
                transform="rotate(-90 60 60)"
              />
              {/* Center text */}
              <text x="60" y="60" textAnchor="middle" dy=".3em" className="text-sm font-medium text-gray-600">
                Average
              </text>
            </svg>
          </div>
        </div>
        {/* Legend */}
        <div className="flex justify-center md:justify-start mt-4 space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-sm text-gray-600">Present</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
            <span className="text-sm text-gray-600">Absent</span>
          </div>
        </div>
        <p className="text-sm text-blue-600 mt-2 text-center md:text-left">Your overall attendance is 75.6%. Keep up the good work!</p>
      </div>

      {/* Subject-wise Attendance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject-wise Attendance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-700">Subject</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700">Total Classes</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700">Attended</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700">Percentage</th>
                <th className="text-center py-3 px-2 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-2 font-medium text-gray-900">Mathematics</td>
                <td className="text-center py-3 px-2">40</td>
                <td className="text-center py-3 px-2">35</td>
                <td className="text-center py-3 px-2">87.5%</td>
                <td className="text-center py-3 px-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Good</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-2 font-medium text-gray-900">Physics</td>
                <td className="text-center py-3 px-2">38</td>
                <td className="text-center py-3 px-2">30</td>
                <td className="text-center py-3 px-2">78.9%</td>
                <td className="text-center py-3 px-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Good</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-2 font-medium text-gray-900">Chemistry</td>
                <td className="text-center py-3 px-2">42</td>
                <td className="text-center py-3 px-2">28</td>
                <td className="text-center py-3 px-2">66.7%</td>
                <td className="text-center py-3 px-2">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Warning</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-2 font-medium text-gray-900">Computer Science</td>
                <td className="text-center py-3 px-2">36</td>
                <td className="text-center py-3 px-2">32</td>
                <td className="text-center py-3 px-2">88.9%</td>
                <td className="text-center py-3 px-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Good</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-2 font-medium text-gray-900">English Literature</td>
                <td className="text-center py-3 px-2">30</td>
                <td className="text-center py-3 px-2">20</td>
                <td className="text-center py-3 px-2">66.7%</td>
                <td className="text-center py-3 px-2">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Warning</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-2 font-medium text-gray-900">Biology</td>
                <td className="text-center py-3 px-2">35</td>
                <td className="text-center py-3 px-2">22</td>
                <td className="text-center py-3 px-2">62.9%</td>
                <td className="text-center py-3 px-2">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Critical</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Attendance Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Low Attendance Alerts</h2>
        
        {/* Warning for Chemistry */}
        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 mb-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">Warning in Chemistry 66.7%, which is below the minimum required 75%. Please take necessary action.</p>
            </div>
          </div>
        </div>

        {/* Warning for English Literature */}
        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 mb-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">Warning in English Literature 66.7%, which is below the minimum required 75%. Please take necessary action.</p>
            </div>
          </div>
        </div>

        {/* Critical Alert for Biology */}
        <div className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Critical Alert in Biology 62.9%, which is below the minimum required 75%. Please take necessary action.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}