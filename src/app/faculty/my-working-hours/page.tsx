'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import LogHoursModal from '../../../widgets/Faculty/LogHoursModal'
import { IoAddCircleOutline, IoCalendarOutline } from 'react-icons/io5'

interface WorkLog {
  date: string;
  teachingHours: number;
  nonTeachingHours: number;
  totalHours: number;
  overtime: number;
  details: any[]; // Combined records for tooltip/modal
}

export default function page() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const fetchWorkData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Teaching Hours (from Attendance Sessions)
            // Assuming each attendance session is ~1.5 hours (or store duration in session doc)
            // For now, let's assume standard class duration = 1.5 hours
            const CLASS_DURATION = 1.5; 

            const startOfMonth = new Date(`${selectedMonth}-01`);
            const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

            const attendanceQuery = query(
                collection(db, 'attendance_sessions'), 
                where('facultyId', '==', user.uid)
            );
            
            const attendanceSnap = await getDocs(attendanceQuery);
            const attendanceDocs = attendanceSnap.docs
                .map(doc => ({ id: doc.id, type: 'teaching', ...doc.data() }))
                .filter((doc: any) => doc.date >= startOfMonth.toISOString().split('T')[0] && doc.date <= endOfMonth.toISOString().split('T')[0]);

            // 2. Fetch Non-Teaching Hours (from Manual Logs)
            const logsQuery = query(
                collection(db, 'faculty_work_logs'),
                where('facultyId', '==', user.uid)
            );

            const logsSnap = await getDocs(logsQuery);
            const manualDocs = logsSnap.docs
                .map(doc => ({ id: doc.id, type: 'manual', ...doc.data() }))
                .filter((doc: any) => doc.date >= startOfMonth.toISOString().split('T')[0] && doc.date <= endOfMonth.toISOString().split('T')[0]);

            // 3. Merge and Aggregate by Date
            const allRecords = [...attendanceDocs, ...manualDocs];
            const dateMap = new Map<string, WorkLog>();

            allRecords.forEach((record: any) => {
                const date = record.date;
                if (!dateMap.has(date)) {
                    dateMap.set(date, { 
                        date, 
                        teachingHours: 0, 
                        nonTeachingHours: 0, 
                        totalHours: 0, 
                        overtime: 0,
                        details: []
                    });
                }
                
                const entry = dateMap.get(date)!;
                entry.details.push(record);
                
                if (record.type === 'teaching') {
                    // Use recorded slotTime duration if available, else 1.5
                    entry.teachingHours += CLASS_DURATION; 
                } else {
                    entry.nonTeachingHours += record.duration || 0;
                }
            });

            // Calculate totals and overtime (e.g., > 8 hours is overtime)
            const aggregatedLogs = Array.from(dateMap.values()).map(log => {
                log.totalHours = log.teachingHours + log.nonTeachingHours;
                log.overtime = Math.max(0, log.totalHours - 8); 
                return log;
            });

            // Fill in missing days for the month? Or just show days with activity?
            // Let's sort by date descending
            aggregatedLogs.sort((a, b) => b.date.localeCompare(a.date));
            
            setLogs(aggregatedLogs);

        } catch (error) {
            console.error("Error fetching working hours", error);
        } finally {
            setLoading(false);
        }
    }

    fetchWorkData();
  }, [user, selectedMonth, refreshKey]); // Refresh when month changes or manually refreshed

  // Summaries
  const totalTeaching = logs.reduce((sum, log) => sum + log.teachingHours, 0);
  const totalNonTeaching = logs.reduce((sum, log) => sum + log.nonTeachingHours, 0);
  const totalHours = logs.reduce((sum, log) => sum + log.totalHours, 0);
  const totalOvertime = logs.reduce((sum, log) => sum + log.overtime, 0);

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Month Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                 <h1 className="text-3xl font-bold text-gray-900">My Working Hours</h1>
                 <p className="text-gray-600 mt-1">Automated tracking + Manual logs for {new Date(selectedMonth).toLocaleString('default', {month:'long', year:'numeric'})}</p>
            </div>
            
            <div className="flex gap-3">
                 <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 border rounded-lg bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                 />
                 <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                 >
                    <IoAddCircleOutline size={20}/> Log Hours
                 </button>
            </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
               <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Teaching</span>
               <div className="mt-2 flex items-baseline gap-1">
                   <span className="text-3xl font-bold text-gray-900">{totalTeaching}</span>
                   <span className="text-sm text-gray-500">hrs</span>
               </div>
               <p className="text-xs text-gray-400 mt-2">Automated from Class Attendance</p>
           </div>
           
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
               <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Non-Teaching</span>
               <div className="mt-2 flex items-baseline gap-1">
                   <span className="text-3xl font-bold text-gray-900">{totalNonTeaching}</span>
                   <span className="text-sm text-gray-500">hrs</span>
               </div>
               <p className="text-xs text-gray-400 mt-2">Evaluation, Research, Meetings</p>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
               <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Total Workload</span>
               <div className="mt-2 flex items-baseline gap-1">
                   <span className="text-3xl font-bold text-gray-900">{totalHours}</span>
                   <span className="text-sm text-gray-500">hrs</span>
               </div>
               <p className="text-xs text-gray-400 mt-2">Combined Monthly Hours</p>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
               <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Overtime</span>
               <div className="mt-2 flex items-baseline gap-1">
                   <span className="text-3xl font-bold text-gray-900">{totalOvertime}</span>
                   <span className="text-sm text-gray-500">hrs</span>
               </div>
               <p className="text-xs text-gray-400 mt-2">Hours exceeding 8hr/day</p>
           </div>
        </div>

        {/* Detailed Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
                     <IoCalendarOutline /> Daily Breakdown
                 </h3>
             </div>
             
             {loading ? (
                 <div className="p-12 flex justify-center">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                 </div>
             ) : logs.length > 0 ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Teaching</th>
                                <th className="px-6 py-4 font-semibold">Non-Teaching</th>
                                <th className="px-6 py-4 font-semibold">Total</th>
                                <th className="px-6 py-4 font-semibold">Overtime</th>
                                <th className="px-6 py-4 font-semibold">Activities</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-700">
                            {logs.map((log, idx) => (
                                <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {new Date(log.date).toLocaleDateString('en-US', { weekday:'short', day:'2-digit', month:'short' })}
                                    </td>
                                    <td className="px-6 py-4 text-blue-600 font-medium">{log.teachingHours > 0 ? `${log.teachingHours}h` : '-'}</td>
                                    <td className="px-6 py-4 text-green-600 font-medium">{log.nonTeachingHours > 0 ? `${log.nonTeachingHours}h` : '-'}</td>
                                    <td className="px-6 py-4 font-bold">{log.totalHours}h</td>
                                    <td className="px-6 py-4 text-orange-600 font-bold">{log.overtime > 0 ? `+${log.overtime}h`: '-'}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                        {log.details.map(d => d.activityType || d.subject).join(', ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             ) : (
                <div className="p-12 text-center text-gray-500">
                    No records found for this month. 
                    <br/><span className="text-xs">Mark attendance or log manual hours to see data.</span>
                </div>
             )}
        </div>

      </div>
      
      {user && (
          <LogHoursModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            facultyId={user.uid}
            onSuccess={() => setRefreshKey(k => k + 1)}
          />
      )}
    </div>
  )
}