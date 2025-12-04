import React from "react";

export default function Dashboard() {
  return (
    <div className="w-full p-4 md:p-6 mb-[50px] mt-[80px] bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Overview
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back! Here's what's happening in your batch.
            </p>
          </div>
          <div className="text-right">
            <span className="bg-azure-50 text-azure-700 px-3 py-1 rounded-full text-sm font-medium">
              Batch: CSE, S7
            </span>
          </div>
        </div>

        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Time Table */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-azure-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Time Table
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 border-b border-gray-200">
                      Day / Hours
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H1
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H2
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H3
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H4
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H5
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H6
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H7
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">
                      H8
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    [
                      "Monday",
                      "AI",
                      "ML",
                      "SE",
                      "OE",
                      "Lunch",
                      "PR",
                      "AI Lab",
                      "ML Lab",
                    ],
                    [
                      "Tuesday",
                      "SE",
                      "PR",
                      "ML",
                      "Lunch",
                      "OE",
                      "SE Lab",
                      "OE Lab",
                      "SE",
                    ],
                    [
                      "Wednesday",
                      "OE",
                      "SE",
                      "AI",
                      "ML",
                      "Lunch",
                      "SE",
                      "PR Lab",
                      "AI Lab",
                    ],
                    [
                      "Thursday",
                      "OE",
                      "SE",
                      "ML",
                      "AI",
                      "Lunch",
                      "PR",
                      "ML Lab",
                      "SE Lab",
                    ],
                    [
                      "Friday",
                      "PR",
                      "OE",
                      "SE",
                      "AI",
                      "Lunch",
                      "ML",
                      "OE Lab",
                      "PR Lab",
                    ],
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50">
                        {row[0]}
                      </td>
                      {row.slice(1).map((cell, j) => (
                        <td
                          key={j}
                          className="px-3 py-3 text-center text-gray-700"
                        >
                          <span className="inline-block px-2 py-1 bg-azure-50 text-azure-700 text-xs rounded-md">
                            {cell}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:col-span-1">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                Announcements
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span className="font-medium text-gray-900 text-sm">
                    Assignment 1
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Artificial Intelligence • Oct 12, 2025
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
                  <span className="font-medium text-gray-900 text-sm">
                    Mid-term Exam Schedule Released!
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  General Notification • Oct 10, 2025
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                  <span className="font-medium text-gray-900 text-sm">
                    Hostel Fee Due Date Extended
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Fees Department • Oct 8, 2025
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button className="w-full text-azure-600 text-sm font-medium hover:text-azure-700 transition-colors">
                View all announcements
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Performance
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-2 h-48">
                {[
                  { label: "AI", value: 80, color: "bg-blue-500" },
                  { label: "ML", value: 95, color: "bg-green-500" },
                  { label: "SE", value: 75, color: "bg-yellow-500" },
                  { label: "OE", value: 65, color: "bg-orange-500" },
                  { label: "PR", value: 70, color: "bg-purple-500" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="relative h-full w-full flex flex-col items-center justify-end"
                  >
                    <div
                      className={`${item.color} absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-300`}
                      style={{ height: `${item.value}%` }}
                    ></div>
                    <span className="text-xs text-gray-600 mt-2 font-medium relative z-10">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 relative z-10">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Reminders
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Attendance Alert
                  </p>
                  <p className="text-xs text-red-700">
                    80% attendance limit hit for AI subject.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Fees Pending
                  </p>
                  <p className="text-xs text-red-700">
                    Hostel fees for the current month.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Assignment Due
                  </p>
                  <p className="text-xs text-yellow-700">
                    Only 5 days left to submit open electives.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-azure-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Attendance Summary
              </h2>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">85%</div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-azure-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: "85%" }}
                ></div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { subject: "AI", percent: "75%", color: "text-red-600" },
                  { subject: "SE", percent: "88%", color: "" },
                  { subject: "OE", percent: "92%", color: "" },
                  { subject: "PE", percent: "60%", color: "text-red-600" },
                  { subject: "ML", percent: "85%", color: "" },
                  { subject: "PR", percent: "78%", color: "" },
                ].map(({ subject, percent, color }, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-600">{subject}</span>
                    <span className={`${color} font-medium`}>{percent}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
