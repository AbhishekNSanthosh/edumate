"use client";

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, ChartData } from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend
);

export default function page() {
  // Performance Trend Line Chart Data
  const trendData: ChartData<'line'> = {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [
      {
        label: 'Your GPA',
        data: [3.2, 3.4, 3.5, 3.7],
        borderColor: '#1f75fe',
        backgroundColor: 'rgba(31, 117, 254, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Average GPA',
        data: [3.0, 3.1, 3.2, 3.3],
        borderColor: '#9ca3af',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const trendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 2.5,
        max: 4.0,
        ticks: {
          stepSize: 0.1,
        },
      },
    },
  };

  // Subject Performance Bar Chart Data
  const subjectData: ChartData<'bar'> = {
    labels: ['Math', 'Physics', 'Biology', 'Chemistry', 'Computer Sci'],
    datasets: [
      {
        label: 'Your Scores',
        data: [85, 90, 78, 82, 88],
        backgroundColor: '#1f75fe',
      },
    ],
  };

  const subjectOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  // Batch Comparison Radar Chart Data
  const radarData: ChartData<'radar'> = {
    labels: ['Computer Lab', 'Physics', 'Math', 'Biology', 'Chemistry'],
    datasets: [
      {
        label: 'Your Score',
        data: [90, 85, 88, 80, 82],
        borderColor: '#1f75fe',
        backgroundColor: 'rgba(31, 117, 254, 0.2)',
        pointBackgroundColor: '#1f75fe',
      },
      {
        label: 'Batch Average',
        data: [85, 88, 90, 85, 87],
        borderColor: '#9ca3af',
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
        pointBackgroundColor: '#9ca3af',
      },
    ],
  };

  const radarOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
  };

  // Recent Grades Table Data
  const recentGrades = [
    {
      subject: 'Math',
      assignment: 'Calculus Midterms',
      grade: 'A',
      date: '2024-09-15',
    },
    {
      subject: 'Chemistry',
      assignment: 'Thermodynamics Quiz',
      grade: 'B+',
      date: '2024-09-20',
    },
    {
      subject: 'Biology',
      assignment: 'Genetics Project',
      grade: 'A',
      date: '2024-09-25',
    },
    {
      subject: 'Computer Sci',
      assignment: 'Data Structures Proj',
      grade: 'A',
      date: '2024-09-30',
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen mt-[80px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Ward's Performance</h1>
        <p className="text-gray-600">Detailed analysis of your academic performance, trends, and comparisons.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azure-500">
          <option>2024</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azure-500">
          <option>S7</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azure-500">
          <option>Final</option>
        </select>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Current GPA</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">3.72</p>
          <p className="text-sm text-green-600">+0.3 from last sem</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Credits</h3>
          <p className="text-3xl font-bold text-gray-900">96/120</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Overall Rank</h3>
          <p className="text-3xl font-bold text-gray-900">5</p>
          <p className="text-sm text-gray-600">of 120 students</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
          <p className="text-sm text-gray-600 mb-4">Your GPA and average over semesters</p>
          <div className="h-64">
            <Line data={trendData} options={trendOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
          <p className="text-sm text-gray-600 mb-4">Your scores compared to average in key subjects</p>
          <div className="h-64">
            <Bar data={subjectData} options={subjectOptions} />
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Batch Comparison</h3>
        <p className="text-sm text-gray-600 mb-4">Compare your performance against the batch in core subjects</p>
        <div className="h-80">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </div>

      {/* Recent Grades Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Grades</h3>
          <p className="text-sm text-gray-600 mt-1">Your latest grades and scores</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment/Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentGrades.map((grade, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grade.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grade.assignment}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      grade.grade === 'A' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {grade.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grade.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}