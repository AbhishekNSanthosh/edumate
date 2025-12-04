"use client"
import React, { useState } from 'react';
import { FiSearch, FiDownload } from 'react-icons/fi';

export default function page() {
  const [searchTerm, setSearchTerm] = useState('');

  // Results data
  const results = [
    {
      semester: 'Fall 2022',
      exam: 'Data Structures & Algorithms',
      date: '2022-12-15',
      obtained: 92,
      max: 100,
      grade: 'A',
      status: 'Distinction',
      statusColor: 'bg-orange-100 text-orange-800',
    },
    {
      semester: 'Fall 2022',
      exam: 'Operating Systems',
      date: '2022-12-10',
      obtained: 85,
      max: 100,
      grade: 'A-',
      status: 'Passed',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      semester: 'Fall 2022',
      exam: 'Database Management',
      date: '2022-12-05',
      obtained: 75,
      max: 100,
      grade: 'B',
      status: 'Passed',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      semester: 'Spring 2023',
      exam: 'Object-Oriented Programming',
      date: '2023-05-20',
      obtained: 95,
      max: 100,
      grade: 'A+',
      status: 'Distinction',
      statusColor: 'bg-orange-100 text-orange-800',
    },
    {
      semester: 'Spring 2023',
      exam: 'Calculus III',
      date: '2023-05-15',
      obtained: 60,
      max: 100,
      grade: 'C-',
      status: 'Failed',
      statusColor: 'bg-red-100 text-red-800',
    },
    {
      semester: 'Spring 2023',
      exam: 'Introduction to AI',
      date: '2023-05-10',
      obtained: 82,
      max: 100,
      grade: 'B+',
      status: 'Passed',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      semester: 'Fall 2022',
      exam: 'Linear Algebra',
      date: '2022-12-20',
      obtained: 70,
      max: 100,
      grade: 'C+',
      status: 'Passed',
      statusColor: 'bg-green-100 text-green-800',
    },
  ];

  // Filter results based on search
  const filteredResults = results.filter(
    (result) =>
      result.exam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.semester.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Download handler (simulated)
  const handleDownload = () => {
    // In real app, generate PDF or download file
    alert('Transcript downloaded!');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen mt-[80px]">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">University Results</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.292a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">3.85</h3>
          <p className="text-sm font-medium text-gray-500 mb-2">Cumulative GPA</p>
          <p className="text-xs text-gray-600">Overall academic performance across all semesters.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">120/128</h3>
          <p className="text-sm font-medium text-gray-500 mb-2">Total Credits Earned</p>
          <p className="text-xs text-gray-600">Credits successfully completed towards your degree.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">3.92</h3>
          <p className="text-sm font-medium text-gray-500 mb-2">Last Semester GPA</p>
          <p className="text-xs text-gray-600">Academic performance in the most recent semester.</p>
        </div>
      </div>

      {/* Search and Download */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by exam or semester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FiDownload className="w-4 h-4" />
            Download Transcript
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Exam Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Marks Obtained</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((result, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.semester}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.exam}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{result.obtained}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{result.max}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.grade}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${result.statusColor}`}>
                      {result.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredResults.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No results found.
          </div>
        )}
      </div>
    </div>
  );
}