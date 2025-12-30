'use client';

import React, { useState } from 'react'

interface Document {
  id: number;
  type: string;
  name: string;
  uploadDate: string;
  fileName: string;
  status: 'pending' | 'verified' | 'rejected';
  verifier: string;
}

export default function page() {
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('all')

  // Sample data - in a real app, this would come from an API
  const documents: Document[] = [
    {
      id: 1,
      type: 'Educational Certificate',
      name: 'B.Tech Degree - Computer Science',
      uploadDate: '2025-08-15',
      fileName: 'btech_degree.pdf',
      status: 'verified',
      verifier: 'Dr. Alice Johnson',
    },
    {
      id: 2,
      type: 'Experience Certificate',
      name: 'Previous Employment - ABC University',
      uploadDate: '2025-08-16',
      fileName: 'experience_abc.pdf',
      status: 'verified',
      verifier: 'HR Dept',
    },
    {
      id: 3,
      type: 'Joining Order',
      name: 'Appointment Letter - Example College',
      uploadDate: '2025-08-17',
      fileName: 'joining_order.pdf',
      status: 'verified',
      verifier: 'Dean Office',
    },
    {
      id: 4,
      type: 'ID Proof',
      name: 'Aadhaar Card',
      uploadDate: '2025-08-18',
      fileName: 'aadhaar_card.pdf',
      status: 'pending',
      verifier: '',
    },
    {
      id: 5,
      type: 'Academic Document',
      name: 'Research Publication - IEEE',
      uploadDate: '2025-12-10',
      fileName: 'ieee_paper.pdf',
      status: 'pending',
      verifier: '',
    },
  ]

  const filteredDocuments = selectedType === 'all' ? documents : documents.filter(doc => doc.type === selectedType)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const documentTypes = ['all', 'Educational Certificate', 'Experience Certificate', 'Joining Order', 'ID Proof', 'Academic Document']

  const QuickActions = () => (
    <div className="flex flex-wrap gap-4 mb-6">
      <label className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
        uploading ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}>
        {uploading ? 'Uploading...' : 'Upload New Document'}
        <input
          type="file"
          accept=".pdf,.jpg,.png"
          onChange={(e) => {
            if (e.target.files) {
              setUploading(true)
              // Simulate upload
              setTimeout(() => setUploading(false), 2000)
            }
          }}
          className="hidden"
        />
      </label>
      <select
        value={selectedType}
        onChange={(e) => setSelectedType(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      >
        {documentTypes.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download All
      </button>
      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Request Verification
      </button>
    </div>
  )

  const totalDocuments = documents.length
  const verified = documents.filter(d => d.status === 'verified').length
  const pending = documents.filter(d => d.status === 'pending').length
  const rejected = documents.filter(d => d.status === 'rejected').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-600 mt-2">Manage and track your faculty-related documents and verification status.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Document List</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verifier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.type}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.uploadDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a href="#" className="text-blue-600 hover:text-blue-900 text-sm underline">{doc.fileName}</a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.verifier || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Download</button>
                      <button className="text-green-600 hover:text-green-900">Re-upload</button>
                      {doc.status === 'pending' && <button className="text-yellow-600 hover:text-yellow-900">Resubmit</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Documents</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalDocuments}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Verified</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{verified}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pending}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rejected</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{rejected}</p>
          </div>
        </div>
      </div>
    </div>
  )
}