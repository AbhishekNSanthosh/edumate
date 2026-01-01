'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface Meeting {
  date: string;
  time: string;
  status: 'upcoming' | 'completed';
  minutes?: string;
}

interface Committee {
  id: string;
  name: string;
  role: string;
  responsibilities: string[];
  meetings: Meeting[];
  members: string[]; // List of UIDs
}

export default function page() {
  const { user } = useAuth()
  const [committees, setCommittees] = useState<Committee[]>([])
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch Committees
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Fetch committees where the list of 'members' contains the current user's UID
    const q = query(
        collection(db, 'faculty_committees'), 
        where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedCommittees = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Committee));
        setCommittees(fetchedCommittees);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching committees:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);


  const handleSeedCommittees = async () => {
      if (!user) return;
      if (!confirm("Seed default committees?")) return;

      try {
          const sampleCommittees = [
            {
              name: 'Academic Council',
              role: 'Member', // Ideally dynamic per user, but simplified for demo
              responsibilities: ['Review curriculum changes', 'Approve new courses', 'Oversee academic policies'],
              meetings: [
                { date: 'Jan 5, 2026', time: '10:00 AM', status: 'upcoming' },
                { date: 'Dec 15, 2025', time: '11:00 AM', status: 'completed', minutes: 'minutes_dec15.pdf' },
              ],
              members: [user.uid]
            },
            {
              name: 'Examination Committee',
              role: 'Coordinator',
              responsibilities: ['Set exam schedules', 'Monitor evaluation process', 'Handle grade disputes'],
              meetings: [
                { date: 'Jan 10, 2026', time: '2:00 PM', status: 'upcoming' },
                { date: 'Dec 20, 2025', time: '3:00 PM', status: 'completed', minutes: 'minutes_dec20.pdf' },
              ],
              members: [user.uid]
            },
            {
              name: 'Research Committee',
              role: 'Member',
              responsibilities: ['Evaluate research proposals', 'Allocate grants', 'Organize seminars'],
              meetings: [
                { date: 'Jan 15, 2026', time: '4:00 PM', status: 'upcoming' },
              ],
              members: [user.uid]
            },
          ];

          const promises = sampleCommittees.map(c => addDoc(collection(db, 'faculty_committees'), c));
          await Promise.all(promises);
          toast.success("Seeded committees successfully");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed committees");
      }
  }

  const handleJoinMock = () => {
      toast.success("Request to join new committee sent to administration.");
  }

  const handleScheduleMock = () => {
      toast.success("Meeting scheduling request sent.");
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button 
        onClick={handleJoinMock}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Join New Committee
      </button>
      <button 
        onClick={handleScheduleMock}
        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Schedule Meeting
      </button>
      {process.env.NODE_ENV === 'development' && committees.length === 0 && (
          <button 
            onClick={handleSeedCommittees}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            + Seed My Committees
          </button>
      )}
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Committee Memberships</h1>
          <p className="text-gray-600 mt-2">Faculty participation in institutional bodies.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Committees List */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Committee Memberships</h2>
          </div>
          <div className="overflow-x-auto">
             {loading ? (
                 <div className="p-8 text-center text-gray-500">Loading committees...</div>
             ) : committees.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">
                     No committee memberships found. <br/> Use "Seed My Committees" to generate test data.
                 </div>
             ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Committee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsibilities</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Meeting</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {committees.map((committee) => {
                  const nextMeeting = committee.meetings && committee.meetings.find((m: Meeting) => m.status === 'upcoming');
                  return (
                    <tr key={committee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{committee.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{committee.role}</td>
                      <td className="px-6 py-4">
                        <ul className="text-sm text-gray-900 space-y-1">
                          {committee.responsibilities.slice(0, 2).map((resp, index) => (
                            <li key={index}>• {resp}</li>
                          ))}
                          {committee.responsibilities.length > 2 && <li>• +{committee.responsibilities.length - 2} more</li>}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {nextMeeting ? (
                          <div>
                            <p className="text-sm text-gray-900">{nextMeeting.date}</p>
                            <p className="text-sm text-gray-500">{nextMeeting.time}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No upcoming</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button onClick={() => setSelectedCommittee(committee)} className="text-blue-600 hover:text-blue-900">
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Selected Committee Details */}
        {selectedCommittee && (
          <div className="bg-white rounded-lg shadow-md mb-8 p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{selectedCommittee.name}</h2>
              <button onClick={() => setSelectedCommittee(null)} className="text-gray-500 hover:text-gray-700">
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your Role</h3>
                <p className="text-gray-700">{selectedCommittee.role}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Responsibilities</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {selectedCommittee.responsibilities.map((resp, index) => (
                    <li key={index}>• {resp}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Meeting Schedule</h3>
              <div className="space-y-3">
                {selectedCommittee.meetings && selectedCommittee.meetings.map((meeting: Meeting, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{meeting.date} at {meeting.time}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(meeting.status)}`}>
                        {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-x-2">
                      {meeting.minutes && (
                        <button className="text-blue-600 hover:text-blue-900 text-sm">Download Minutes</button>
                      )}
                      <button className="text-green-600 hover:text-green-900 text-sm">RSVP</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Committees</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{committees.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Upcoming Meetings</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                    {committees.reduce((sum, c) => sum + (c.meetings?.filter((m: Meeting) => m.status === 'upcoming').length || 0), 0)}
                </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Responsibilities</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                    {committees.reduce((sum, c) => sum + c.responsibilities.length, 0)}
                </p>
            </div>
            </div>
        )}
      </div>
    </div>
  )
}