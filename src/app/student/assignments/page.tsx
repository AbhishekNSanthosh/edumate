import React from 'react';

export default function page() {
  const assignments = [
    {
      title: 'History Essay - World War II',
      course: 'History 101',
      due: 'October 26, 2024',
      status: 'Pending',
      description: 'Write a comprehensive essay on the causes and consequences of World War II.',
      actions: ['View Details', 'Upload File'],
      statusColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      uploadColor: 'bg-blue-600 text-white',
    },
    {
      title: 'Calculus Homework - Derivatives',
      course: 'Mathematics 201',
      due: 'October 20, 2024',
      status: 'Submitted',
      description: 'Complete exercises 1-10 from Chapter 3 on Derivatives. Show all your work and provide clear explanations.',
      actions: ['View Details', 'View Submission'],
      statusColor: 'bg-green-100 text-green-800 border-green-200',
      submissionColor: 'bg-green-600 text-white',
    },
    {
      title: 'Chemistry Lab Report - Titration Lab',
      course: 'Chemistry 105',
      due: 'October 18, 2024',
      status: 'Graded A-',
      description: 'Submit the formal lab report including procedure, observations, calculations, and discussion.',
      actions: ['View Details', 'View Grade'],
      statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
      gradeColor: 'bg-blue-600 text-white',
    },
    {
      title: 'Computer Science Project - Data Structures',
      course: 'CS 305',
      due: 'November 05, 2024',
      status: 'Pending',
      description: 'Implement a robust data structure (e.g., AVL Tree or Hash Table) and demonstrate its use.',
      actions: ['View Details', 'Upload File'],
      statusColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      uploadColor: 'bg-blue-600 text-white',
    },
    {
      title: 'Economics Presentation - Market Trends',
      course: 'Economics 402',
      due: 'November 10, 2024',
      status: 'Pending',
      description: 'Prepare and deliver a 15-minute presentation on current global market trends.',
      actions: ['View Details', 'Upload File'],
      statusColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      uploadColor: 'bg-blue-600 text-white',
    },
    {
      title: 'Literature Review - Renaissance Poetry',
      course: 'English 310',
      due: 'November 01, 2024',
      status: 'Submitted',
      description: 'Conduct a critical literature review on at least three prominent Renaissance poets.',
      actions: ['View Details', 'View Submission'],
      statusColor: 'bg-green-100 text-green-800 border-green-200',
      submissionColor: 'bg-green-600 text-white',
    },
  ];

  const getActionButton = (action:any, color:any) => {
    const isUpload = action === 'Upload File';
    const isSubmission = action === 'View Submission';
    const isGrade = action === 'View Grade';
    return (
      <button
        className={`px-4 py-2 rounded-lg text-sm font-medium ${
          (isUpload || isGrade || isSubmission ? color : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
        }`}
      >
        {action}
      </button>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen pt-[100px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Assignments</h1>
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search assignments..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((assignment, index) => (
          <div key={index} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${assignment.statusColor}`}>
                {assignment.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Due: {assignment.due}</p>
            <p className="text-sm text-gray-600 mb-4">{assignment.course}</p>
            <p className="text-sm text-gray-700 mb-6">{assignment.description}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                {assignment.actions[0]}
              </button>
              <div className="flex-1">
                {getActionButton(assignment.actions[1], assignment.uploadColor || assignment.submissionColor || assignment.gradeColor)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}