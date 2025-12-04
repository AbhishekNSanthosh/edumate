"use client"
import React, { useState } from 'react';

export default function page() {
  const [activeTab, setActiveTab] = useState('hostel'); // 'hostel' or 'transport'

  const hostelInfo = {
    name: 'University Residences Block C Wing',
    room: 'C-302',
    warden: 'Ms. Evelyn Sharma',
    contact: '+91 98765 43210',
  };

  const feeStatus = {
    status: 'Due',
    amount: '₹7,500',
    dueDate: '31st Oct 2024',
    lastPayment: '25th Aug 2024',
  };

  const handlePayNow = () => {
    // Simulate payment flow
    alert('Redirecting to payment gateway...');
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen mt-[80px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hostel & Transport</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('hostel')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'hostel'
                  ? 'border-azure-500 text-azure-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hostel Details
            </button>
            <button
              onClick={() => setActiveTab('transport')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'transport'
                  ? 'border-azure-500 text-azure-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transport Services
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'hostel' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hostel Information */}
              <div className="lg:col-span-1 bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-azure-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Hostel Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Hostel Name:</span>
                    <p className="font-medium text-gray-900">{hostelInfo.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Room Number:</span>
                    <p className="font-medium text-gray-900">{hostelInfo.room}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Warden:</span>
                    <p className="font-medium text-gray-900">{hostelInfo.warden}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact:</span>
                    <p className="font-medium text-gray-900">{hostelInfo.contact}</p>
                  </div>
                </div>
              </div>

              {/* Facilities & Rules */}
              <div className="lg:col-span-1 bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h8m0 0V8m0 0v1m0-1c-2.95 0-5.05 1.4-6 3.3M7 10c2.95 0 5.05 1.4 6 3.3" />
                  </svg>
                  Facilities & Rules
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <button className="w-full text-left text-gray-700 hover:text-gray-900 flex items-center justify-between py-2">
                      <span>Hostel Facilities</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <div>
                    <button className="w-full text-left text-gray-700 hover:text-gray-900 flex items-center justify-between py-2">
                      <span>Hostel Rules</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hostel Fee Status */}
              <div className="lg:col-span-1 bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Hostel Fee Status
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium text-red-600">{feeStatus.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount Due:</span>
                    <p className="font-bold text-gray-900">{feeStatus.amount}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <p className="font-medium text-gray-900">{feeStatus.dueDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Payment:</span>
                    <p className="font-medium text-gray-900">{feeStatus.lastPayment}</p>
                  </div>
                  <button
                    onClick={handlePayNow}
                    className="w-full mt-4 bg-azure-600 text-white py-2 rounded-lg hover:bg-azure-700 transition-colors font-medium"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <h3 className="text-lg font-semibold mb-2">Transport Services</h3>
              <p>Transport details and booking options will be available here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}