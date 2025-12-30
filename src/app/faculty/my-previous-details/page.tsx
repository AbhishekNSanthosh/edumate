'use client';

import React, { useState } from 'react'

interface PreviousInstitution {
  id: number;
  institution: string;
  duration: string;
  role: string;
}

interface Designation {
  id: number;
  designation: string;
  institution: string;
  from: string;
  to: string;
}

interface ResearchExperience {
  id: number;
  title: string;
  type: 'Publication' | 'Project' | 'Conference' | 'Grant';
  year: string;
  description: string;
}

interface Appraisal {
  id: number;
  year: string;
  rating: string;
  comments: string;
  appraiser: string;
}

export default function page() {
  const [editingSection, setEditingSection] = useState<string | null>(null)

  // Sample data - in a real app, this would come from an API
  const previousInstitutions: PreviousInstitution[] = [
    {
      id: 1,
      institution: 'ABC University',
      duration: '2018 - 2022 (4 years)',
      role: 'Assistant Professor',
    },
    {
      id: 2,
      institution: 'XYZ College',
      duration: '2015 - 2018 (3 years)',
      role: 'Lecturer',
    },
  ]

  const totalExperience = 7 // years

  const designations: Designation[] = [
    {
      id: 1,
      designation: 'Associate Professor',
      institution: 'Example College',
      from: '2022',
      to: 'Present',
    },
    {
      id: 2,
      designation: 'Assistant Professor',
      institution: 'ABC University',
      from: '2018',
      to: '2022',
    },
    {
      id: 3,
      designation: 'Lecturer',
      institution: 'XYZ College',
      from: '2015',
      to: '2018',
    },
  ]

  const researchExperiences: ResearchExperience[] = [
    {
      id: 1,
      title: 'Machine Learning in Education',
      type: 'Publication',
      year: '2024',
      description: 'Published in IEEE Journal, Impact Factor 3.2',
    },
    {
      id: 2,
      title: 'AI-Based Attendance System',
      type: 'Project',
      year: '2023',
      description: 'Funded by University Grant, Duration: 6 months',
    },
    {
      id: 3,
      title: 'Data Analytics Workshop',
      type: 'Conference',
      year: '2022',
      description: 'Presented at International Conference on AI',
    },
  ]

  const appraisals: Appraisal[] = [
    {
      id: 1,
      year: '2024',
      rating: 'Excellent (4.8/5)',
      comments: 'Outstanding performance in teaching and research',
      appraiser: 'Dr. Alice Johnson, HOD',
    },
    {
      id: 2,
      year: '2023',
      rating: 'Very Good (4.2/5)',
      comments: 'Consistent improvement in student feedback',
      appraiser: 'Prof. Bob Smith, Dean',
    },
  ]

  const handleEdit = (section: string) => {
    setEditingSection(editingSection === section ? null : section)
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Add Institution
      </button>
      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Add Designation
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Export Profile
      </button>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Previous Details</h1>
          <p className="text-gray-600 mt-2">Maintain and review your professional history.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Total Experience */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Total Years of Experience</h2>
          <p className="text-4xl font-bold text-blue-600">{totalExperience} years</p>
        </div>

        {/* Previous Institutions */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Previous Institutions Worked</h2>
            <button
              onClick={() => handleEdit('institutions')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              {editingSection === 'institutions' ? 'Cancel' : 'Add Institution'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previousInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.institution}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inst.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inst.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Designation History */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Designation History</h2>
            <button
              onClick={() => handleEdit('designations')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              {editingSection === 'designations' ? 'Cancel' : 'Add Designation'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {designations.map((des) => (
                  <tr key={des.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{des.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{des.institution}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{des.from}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{des.to}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Research Experience */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Research Experience</h2>
            <button
              onClick={() => handleEdit('research')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              {editingSection === 'research' ? 'Cancel' : 'Add Research'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {researchExperiences.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{res.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.year}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{res.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Previous Appraisals */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Previous Appraisals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appraiser</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appraisals.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.rating}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{app.comments}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.appraiser}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
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
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Previous Institutions</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{previousInstitutions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Designations</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{designations.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Research Items</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{researchExperiences.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}