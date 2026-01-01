'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface TransportData {
  id?: string;
  facultyId: string;
  assignedRoute: {
    routeNumber: string;
    name: string;
    pickupPoint: string;
    dropPoint: string;
    status: string;
  };
  transportSchedule: {
    id: number;
    time: string;
    direction: string;
    vehicle: string;
    driver: string;
  }[];
  feeDetails: {
    monthlyFee: string;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue';
    paymentDate: string;
    passNumber: string;
    validity: string;
  };
}

export default function page() {
  const { user } = useAuth()
  const [data, setData] = useState<TransportData | null>(null)
  const [loading, setLoading] = useState(true)

  const initializeTransportData = async (uid: string) => {
    try {
        const q = query(collection(db, 'faculty_transport'), where('facultyId', '==', uid));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            const defaultData: TransportData = {
                facultyId: uid,
                assignedRoute: {
                    routeNumber: 'RT-01',
                    name: 'City Center Route',
                    pickupPoint: 'Faculty Gate A',
                    dropPoint: 'Main Campus Gate',
                    status: 'active',
                },
                transportSchedule: [
                    { id: 1, time: '07:00 AM', direction: 'To Campus', vehicle: 'Bus-101', driver: 'Mr. Rajesh Singh' },
                    { id: 2, time: '05:00 PM', direction: 'From Campus', vehicle: 'Bus-101', driver: 'Mr. Rajesh Singh' },
                ],
                feeDetails: {
                    monthlyFee: '$150',
                    dueDate: 'Jan 10, 2026',
                    status: 'pending',
                    paymentDate: '-',
                    passNumber: `TP-FAC-${new Date().getFullYear()}-001`,
                    validity: `Jan 1, ${new Date().getFullYear()} - Dec 31, ${new Date().getFullYear()}`,
                }
            };
            await addDoc(collection(db, 'faculty_transport'), defaultData);
            toast.success("Initialized Transport Profile");
        }
    } catch (e) {
        console.error("Error init transport:", e);
    }
  }

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    initializeTransportData(user.uid);

    const q = query(collection(db, 'faculty_transport'), where('facultyId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const docData = snapshot.docs[0];
            setData({ id: docData.id, ...docData.data() } as TransportData);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdatePickup = async () => {
    if (!data?.id) return;
    const newPoint = prompt("Enter new pickup point:", data.assignedRoute.pickupPoint);
    if (newPoint && newPoint !== data.assignedRoute.pickupPoint) {
        try {
            await updateDoc(doc(db, 'faculty_transport', data.id), {
                'assignedRoute.pickupPoint': newPoint
            });
            toast.success("Pickup point updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update");
        }
    }
  }

  const handleRenewPass = async () => {
      if (!data?.id) return;
      if (!confirm("Renew pass for next year?")) return;
      
      try {
          const nextYear = new Date().getFullYear() + 1;
          await updateDoc(doc(db, 'faculty_transport', data.id), {
              'feeDetails.validity': `Jan 1, ${nextYear} - Dec 31, ${nextYear}`,
              'feeDetails.status': 'pending', // Reset payment status for renewal
              'assignedRoute.status': 'active'
          });
          toast.success(`Pass renewed for ${nextYear}`);
      } catch (e) {
          console.error(e);
          toast.error("Renewal failed");
      }
  }

  const handlePayFee = async () => {
      if (!data?.id) return;
      try {
          await updateDoc(doc(db, 'faculty_transport', data.id), {
              'feeDetails.status': 'paid',
              'feeDetails.paymentDate': new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          });
          toast.success("Fee paid successfully");
      } catch (e) {
          console.error(e);
          toast.error("Payment failed");
      }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button 
        onClick={handleUpdatePickup}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Update Pickup Point
      </button>
      <button 
        onClick={handleRenewPass}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Renew Pass
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Schedule
      </button>
    </div>
  )

  if (loading) return <div className="mt-[100px] p-6 text-center">Loading transport details...</div>;
  if (!data) return <div className="mt-[100px] p-6 text-center">No transport record found.</div>;

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
              <p className="text-lg text-gray-900">{data.assignedRoute.routeNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
              <p className="text-lg text-gray-900">{data.assignedRoute.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(data.assignedRoute.status)}`}>
                {data.assignedRoute.status.charAt(0).toUpperCase() + data.assignedRoute.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Point</label>
              <p className="text-lg text-gray-900">{data.assignedRoute.pickupPoint}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drop Point</label>
              <p className="text-lg text-gray-900">{data.assignedRoute.dropPoint}</p>
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
                {data.transportSchedule.map((schedule) => (
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
              <p className="text-lg text-gray-900">{data.feeDetails.monthlyFee}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <p className="text-lg text-gray-900">{data.feeDetails.dueDate}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(data.feeDetails.status)}`}>
                {data.feeDetails.status.charAt(0).toUpperCase() + data.feeDetails.status.slice(1)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <p className="text-lg text-gray-900">{data.feeDetails.paymentDate}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transport Pass Number</label>
              <p className="text-lg text-gray-900">{data.feeDetails.passNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validity</label>
              <p className="text-lg text-gray-900">{data.feeDetails.validity}</p>
            </div>
          </div>
          {data.feeDetails.status !== 'paid' && (
            <button 
                onClick={handlePayFee}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Pay Fee
            </button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assigned Routes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">1</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Passes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{data.assignedRoute.status === 'active' ? 1 : 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
