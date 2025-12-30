'use client';

import React, { useState } from 'react'

interface AppraisalForm {
  id: number;
  year: string;
  selfAssessment: string;
  hodRemarks: string;
  principalRemarks: string;
  overallScore: number; // out of 100
  status: 'draft' | 'submitted' | 'completed';
}

interface FeedbackHistory {
  id: number;
  year: string;
  score: number;
  promotion: string;
  comments: string;
}

export default function page() {
  const [editingForm, setEditingForm] = useState<number | null>(null)
  const [selfAssessment, setSelfAssessment] = useState('')

  // Sample data - in a real app, this would come from an API
  const appraisalForms: AppraisalForm[] = [
    {
      id: 1,
      year: '2025',
      selfAssessment: 'Strong performance in teaching and research. Published 2 papers this year.',
      hodRemarks: 'Excellent contribution to curriculum development.',
      principalRemarks: 'Recommended for promotion.',
      overallScore: 92,
      status: 'completed',
    },
    {
      id: 2,
      year: '2024',
      selfAssessment: 'Focused on student mentoring and department activities.',
      hodRemarks: 'Good performance, needs more research output.',
      principalRemarks: 'Satisfactory.',
      overallScore: 85,
      status: 'completed',
    },
  ]

  const feedbackHistory: FeedbackHistory[] = [
    {
      id: 1,
      year: '2025',
      score: 92,
      promotion: 'Associate Professor',
      comments: 'Promoted based on outstanding performance and research contributions.',
    },
    {
      id: 2,
      year: '2024',
      score: 85,
      promotion: 'No change',
      comments: 'Maintained current position; encouraged to increase publications.',
    },
    {
      id: 3,
      year: '2023',
      score: 88,
      promotion: 'Assistant Professor',
      comments: 'Promoted after successful probation period.',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button
        onClick={() => setEditingForm(appraisalForms[appraisalForms.length - 1]?.id || null)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Edit Current Form
      </button>
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Submit for Review
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Forms
      </button>
    </div>
  )

  const averageScore = appraisalForms.reduce((sum, form) => sum + form.overallScore, 0) / appraisalForms.length || 0
  const promotions = feedbackHistory.filter(f => f.promotion !== 'No change').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Staff Appraisal</h1>
          <p className="text-gray-600 mt-2">Faculty performance evaluation and feedback.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Current Appraisal Form */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Current Appraisal Form (2025)</h2>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appraisalForms[appraisalForms.length - 1]?.status || 'draft')}`}>
              {appraisalForms[appraisalForms.length - 1]?.status?.charAt(0).toUpperCase() + appraisalForms[appraisalForms.length - 1]?.status?.slice(1) || 'Draft'}
            </span>
          </div>
          {editingForm === appraisalForms[appraisalForms.length - 1]?.id ? (
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Self-Assessment</label>
                  <textarea
                    value={selfAssessment}
                    onChange={(e) => setSelfAssessment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Enter your self-assessment..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HOD Remarks</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="HOD remarks (read-only)"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Principal Remarks</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Principal remarks (read-only)"
                      disabled
                    />
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setEditingForm(null)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    Save Draft
                  </button>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Self-Assessment</label>
                  <p className="text-gray-900">{appraisalForms[appraisalForms.length - 1]?.selfAssessment}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HOD Remarks</label>
                    <p className="text-gray-900">{appraisalForms[appraisalForms.length - 1]?.hodRemarks}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Principal Remarks</label>
                    <p className="text-gray-900">{appraisalForms[appraisalForms.length - 1]?.principalRemarks}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overall Score</label>
                    <p className="text-2xl font-bold text-blue-600">{appraisalForms[appraisalForms.length - 1]?.overallScore}/100</p>
                  </div>
                  <button
                    onClick={() => setEditingForm(appraisalForms[appraisalForms.length - 1]?.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appraisal Scores History */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Appraisal Scores History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score (/100)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appraisalForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.overallScore}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(form.status)}`}>
                        {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Promotion/Feedback History */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Promotion & Feedback History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promotion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feedbackHistory.map((history) => (
                  <tr key={history.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{history.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.score}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{history.promotion}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{history.comments}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View Full</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Average Score</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{averageScore.toFixed(1)}/100</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Promotions</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{promotions}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Appraisals Completed</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{appraisalForms.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}