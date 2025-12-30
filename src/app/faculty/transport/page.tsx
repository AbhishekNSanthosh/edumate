'use client';

import React from 'react'

export default function page() {
  // Sample data - in a real app, this would come from an API
  const assignedRoute = {
    routeNumber: 'RT-01',
    name: 'City Center Route',
    pickupPoint: 'Faculty Gate A',
    dropPoint: 'Main Campus Gate',
    status: 'active',
  }

  const transportSchedule = [
    { id: 1, time: '07:00 AM', direction: 'To Campus', vehicle: 'Bus-101', driver: 'Mr. Rajesh Singh' },
    { id: 2, time: '05:00 PM', direction: 'From Campus', vehicle: 'Bus-101', driver: 'Mr. Rajesh Singh' },
  ]

  const feeDetails = {
    monthlyFee: '$150',
    dueDate: 'Jan 10, 2026',
    status: 'paid',
    paymentDate: 'Dec 15, 2025',
    passNumber: 'TP-FAC-2025-001',
    validity: 'Jan 1, 2026 - Dec 31, 2026',
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Update Pickup Point
      </button>
      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Renew Pass
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Schedule
      </button>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Faculty Transport Management</h1>
          <p className="text-gray-600 mt-2">Manage your transportation details and schedule.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Assigned Route & Points */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assigned Bus Route</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Number</label>
              <p className="text-lg text-gray-900">{assignedRoute.routeNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
              <p className="text-lg text-gray-900">{assignedRoute.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignedRoute.status)}`}>
                {assignedRoute.status.charAt(0).toUpperCase() + assignedRoute.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Point</label>
              <p className="text-lg text-gray-900">{assignedRoute.pickupPoint}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drop Point</label>
              <p className="text-lg text-gray-900">{assignedRoute.dropPoint}</p>
            </div>
          </div>
        </div>

        {/* Transport Schedule */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Transport Schedule</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transportSchedule.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schedule.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.direction}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.vehicle}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.driver}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View Route</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transport Fee Details */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transport Fee Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee</label>
              <p className="text-lg text-gray-900">{feeDetails.monthlyFee}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <p className="text-lg text-gray-900">{feeDetails.dueDate}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(feeDetails.status)}`}>
                {feeDetails.status.charAt(0).toUpperCase() + feeDetails.status.slice(1)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <p className="text-lg text-gray-900">{feeDetails.paymentDate}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transport Pass Number</label>
              <p className="text-lg text-gray-900">{feeDetails.passNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validity</label>
              <p className="text-lg text-gray-900">{feeDetails.validity}</p>
            </div>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Pay Fee
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assigned Routes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">1</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Passes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">1</p>
          </div>
        </div>
      </div>
    </div>
  )
}