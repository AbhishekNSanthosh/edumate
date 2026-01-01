"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface HostelDetails {
  block: string;
  roomNumber: string;
  type: string;
  wardenName: string;
  wardenContact: string;
  feeStatus: 'Paid' | 'Due';
  amountDue: number;
  dueDate: string;
}

interface TransportDetails {
  route: string;
  busNumber: string;
  pickupPoint: string;
  pickupTime: string;
  driverName: string;
  driverContact: string;
  feeStatus: 'Paid' | 'Due';
  amountDue: number;
  dueDate: string;
}

interface StudentServices {
  hostel?: HostelDetails;
  transport?: TransportDetails;
}

export default function HostelTransportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'hostel' | 'transport'>('hostel');
  const [services, setServices] = useState<StudentServices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchServices = async () => {
        try {
            const docRef = doc(db, "student_services", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setServices(docSnap.data() as StudentServices);
            } else {
                setServices(null);
            }
        } catch (error) {
            console.error("Error fetching services:", error);
            toast.error("Failed to load details");
        } finally {
            setLoading(false);
        }
    };

    fetchServices();
  }, [user]);

  const handlePay = async (type: 'hostel' | 'transport') => {
      if(!services) return;
      
      const toastId = toast.loading(`Processing ${type} fee payment...`);
      // Simulate Payment
      setTimeout(async () => {
          try {
              const docRef = doc(db, "student_services", user!.uid);
              const updateData = type === 'hostel' 
                ? { "hostel.feeStatus": 'Paid', "hostel.amountDue": 0 }
                : { "transport.feeStatus": 'Paid', "transport.amountDue": 0 };
              
              await updateDoc(docRef, updateData);
              
              setServices(prev => {
                  if(!prev) return null;
                  return {
                      ...prev,
                      [type]: {
                          ...prev[type]!,
                          feeStatus: 'Paid',
                          amountDue: 0
                      }
                  }
              });

              toast.success("Payment Successful!", { id: toastId });
          } catch(e) {
              console.error(e);
              toast.error("Payment failed", { id: toastId });
          }
      }, 1500);
  };

  const seedData = async () => {
      if(!user) return;
      if(!confirm("Seed hostel & transport data?")) return;

      try {
          const sampleData: StudentServices = {
              hostel: {
                  block: 'Block A (Boys)',
                  roomNumber: 'A-204',
                  type: 'Double Sharing',
                  wardenName: 'Mr. Rajesh Kumar',
                  wardenContact: '+91 9876543210',
                  feeStatus: 'Due',
                  amountDue: 15000,
                  dueDate: '2024-11-15'
              },
              transport: {
                  route: 'Route 5 - City Center',
                  busNumber: 'KL-07-BW-4567',
                  pickupPoint: 'Main Square Stop',
                  pickupTime: '07:45 AM',
                  driverName: 'Mr. Suresh',
                  driverContact: '+91 9988776655',
                  feeStatus: 'Due',
                  amountDue: 5000,
                  dueDate: '2024-11-10'
              }
          };
          
          await setDoc(doc(db, "student_services", user.uid), sampleData);
          setServices(sampleData);
          toast.success("Data seeded!");
      } catch(e) {
          console.error(e);
          toast.error("Failed to seed");
      }
  }

  if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen mt-[80px]">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen mt-[80px] mb-[60px]">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Hostel & Transport</h1>
        {process.env.NODE_ENV === 'development' && !services && (
            <button onClick={seedData} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200">
                + Seed Data
            </button>
        )}
      </div>

      {services ? (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div className="border-b border-gray-200">
                <nav className="flex px-6 gap-6">
                    <button
                        onClick={() => setActiveTab('hostel')}
                        className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'hostel'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                    Hostel Details
                    </button>
                    <button
                        onClick={() => setActiveTab('transport')}
                        className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'transport'
                            ? 'border-blue-600 text-blue-600'
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
                    services.hostel ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Hostel Information */}
                            <div className="lg:col-span-2 bg-gray-50 rounded-xl p-6 border border-gray-100">
                                <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    </span>
                                    Hostel Information
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Block & Room</p>
                                            <p className="font-semibold text-gray-900 text-lg">{services.hostel.block}, Room {services.hostel.roomNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Accommodation Type</p>
                                            <p className="font-medium text-gray-900">{services.hostel.type}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Warden Name</p>
                                            <p className="font-medium text-gray-900">{services.hostel.wardenName}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Warden Contact</p>
                                            <p className="font-medium text-gray-900">{services.hostel.wardenContact}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Fee Status */}
                            <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        Fee Status
                                    </h3>
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-gray-500 text-sm">Amount Due</p>
                                            <span className={`px-2 py-1 text-xs font-bold rounded ${services.hostel.feeStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {services.hostel.feeStatus}
                                            </span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">₹{services.hostel.feeStatus === 'Paid' ? '0' : services.hostel.amountDue.toLocaleString()}</p>
                                    </div>
                                    <p className="text-sm text-gray-500">Due Date: {new Date(services.hostel.dueDate).toLocaleDateString()}</p>
                                </div>
                                {services.hostel.feeStatus === 'Due' && (
                                    <button 
                                        onClick={() => handlePay('hostel')}
                                        className="w-full mt-6 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
                                    >
                                        Pay Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <p>No hostel allocated.</p>
                        </div>
                    )
                ) : (
                    services.transport ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Transport Information */}
                            <div className="lg:col-span-2 bg-gray-50 rounded-xl p-6 border border-gray-100">
                                <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                     <span className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    </span>
                                    Transport Information
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Bus Route</p>
                                            <p className="font-semibold text-gray-900 text-lg">{services.transport.route}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Bus Number</p>
                                            <p className="font-medium text-gray-900">{services.transport.busNumber}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                         <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Pickup Point & Time</p>
                                            <p className="font-medium text-gray-900">{services.transport.pickupPoint}</p>
                                            <p className="text-sm text-gray-600">{services.transport.pickupTime}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Driver Info</p>
                                            <p className="font-medium text-gray-900">{services.transport.driverName} ({services.transport.driverContact})</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             {/* Fee Status */}
                             <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        Fee Status
                                    </h3>
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-gray-500 text-sm">Amount Due</p>
                                            <span className={`px-2 py-1 text-xs font-bold rounded ${services.transport.feeStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {services.transport.feeStatus}
                                            </span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">₹{services.transport.feeStatus === 'Paid' ? '0' : services.transport.amountDue.toLocaleString()}</p>
                                    </div>
                                    <p className="text-sm text-gray-500">Due Date: {new Date(services.transport.dueDate).toLocaleDateString()}</p>
                                </div>
                                {services.transport.feeStatus === 'Due' && (
                                    <button 
                                        onClick={() => handlePay('transport')}
                                        className="w-full mt-6 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
                                    >
                                        Pay Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                         <div className="text-center py-12 text-gray-500">
                            <p>No transport subscribed.</p>
                        </div>
                    )
                )}
                </div>
            </div>
          </>
      ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No Services Found</h3>
              <p className="text-gray-500 mt-2">You haven't subscribed to hostel or transport services yet.</p>
          </div>
      )}
    </div>
  );
}