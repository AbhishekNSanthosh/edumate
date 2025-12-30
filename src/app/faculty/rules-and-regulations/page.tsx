'use client';

import React, { useState } from 'react'

export default function page() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Sample data - in a real app, this would come from an API
  const policies = [
    {
      id: 'academic',
      title: 'Academic Rules',
      content: '1. Students must maintain a minimum CGPA of 2.0 to continue studies.\n2. Maximum credit hours per semester: 18.\n3. Course registration deadline: End of first week.\n4. Grade appeals must be submitted within 7 days of results publication.',
      document: 'academic_rules.pdf',
    },
    {
      id: 'conduct',
      title: 'Code of Conduct',
      content: '1. Maintain professionalism in all interactions.\n2. No discrimination based on gender, race, or religion.\n3. Use of mobile phones restricted during classes.\n4. Report any harassment immediately to the administration.',
      document: 'code_of_conduct.pdf',
    },
    {
      id: 'examination',
      title: 'Examination Regulations',
      content: '1. Minimum 75% attendance required to appear for exams.\n2. No electronic devices allowed in exam halls.\n3. Cheating results in immediate disqualification.\n4. Re-evaluation fee: $50 per subject.',
      document: 'examination_regulations.pdf',
    },
    {
      id: 'attendance',
      title: 'Attendance Policies',
      content: '1. 75% attendance mandatory for eligibility.\n2. Late arrivals count as 0.5 absent.\n3. Medical certificates required for sick leaves.\n4. Unauthorized absences lead to academic probation.',
      document: 'attendance_policies.pdf',
    },
    {
      id: 'disciplinary',
      title: 'Disciplinary Guidelines',
      content: '1. Plagiarism results in zero marks and warning.\n2. Repeated violations lead to suspension.\n3. Grievance committee handles complaints.\n4. Appeal process: Submit within 5 working days.',
      document: 'disciplinary_guidelines.pdf',
    },
  ]

  const handleToggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  const handleDownload = (fileName: string) => {
    // Simulate download
    console.log(`Downloading: ${fileName}`)
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Download All Policies
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Print Handbook
      </button>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rules and Regulations</h1>
          <p className="text-gray-600 mt-2">Access institutional policies and guidelines.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Policies Accordion */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {policies.map((policy) => (
              <div key={policy.id}>
                <div
                  onClick={() => handleToggleSection(policy.id)}
                  className="p-6 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                >
                  <h2 className="text-xl font-semibold text-gray-900">{policy.title}</h2>
                  <span className="text-gray-500">
                    {expandedSection === policy.id ? '−' : '+'}
                  </span>
                </div>
                {expandedSection === policy.id && (
                  <div className="p-6 bg-gray-50">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{policy.content}</pre>
                    <button
                      onClick={() => handleDownload(policy.document)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Download PDF
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Policies</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{policies.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Academic Rules</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">1</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Disciplinary Guidelines</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">1</p>
          </div>
        </div>
      </div>
    </div>
  )
}