"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: any;
  status: 'Pending' | 'Submitted' | 'Graded';
  description: string;
  grade?: string;
  studentId: string;
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "assignments"), where("studentId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Assignment));
        // Client-side sort by due date
        data.sort((a, b) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0));
        setAssignments(data);
        setLoading(false);
    }, (error) => {
        console.error("Assignments fetch error:", error);
        toast.error("Failed to load assignments");
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpload = async (id: string) => {
      const toastId = toast.loading("Uploading file...");
      // Simulate upload delay
      setTimeout(async () => {
          try {
              const assignmentRef = doc(db, "assignments", id);
              await updateDoc(assignmentRef, {
                  status: 'Submitted',
                  submittedAt: new Date()
              });
              toast.success("Assignment submitted successfully!", { id: toastId });
          } catch (e) {
              console.error(e);
              toast.error("Submission failed", { id: toastId });
          }
      }, 1500);
  };

  const seedAssignments = async () => {
      if (!user) return;
      if (!confirm("Generate sample assignments?")) return;

      try {
          const samples = [
            {
                title: 'History Essay - World War II',
                course: 'History 101',
                daysFromNow: 5,
                status: 'Pending',
                description: 'Write a comprehensive essay on the causes and consequences of World War II.'
            },
            {
                title: 'Calculus Homework - Derivatives',
                course: 'Mathematics 201',
                daysFromNow: -2,
                status: 'Submitted',
                description: 'Complete exercises 1-10 from Chapter 3 on Derivatives.'
            },
            {
                title: 'Chemistry Lab Report',
                course: 'Chemistry 105',
                daysFromNow: -5,
                status: 'Graded',
                grade: 'A-',
                description: 'Submit the formal lab report including procedure and observations.'
            },
            {
                title: 'CS Project - Data Structures',
                course: 'CS 305',
                daysFromNow: 14,
                status: 'Pending',
                description: 'Implement a robust data structure (AVL Tree) and demonstrate its use.'
            }
          ];

          for (const s of samples) {
              const date = new Date();
              date.setDate(date.getDate() + s.daysFromNow);
              
              await addDoc(collection(db, "assignments"), {
                  studentId: user.uid,
                  title: s.title,
                  course: s.course,
                  dueDate: date,
                  status: s.status,
                  description: s.description,
                  grade: s.grade || null,
                  createdAt: serverTimestamp()
              });
          }
          toast.success("Sample assignments generated!");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed data");
      }
  };

  const filteredAssignments = assignments.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            a.course.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === "All" || a.status === filterStatus;
      return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'Submitted': return 'bg-green-100 text-green-800 border-green-200';
          case 'Graded': return 'bg-blue-100 text-blue-800 border-blue-200';
          default: return 'bg-gray-100 text-gray-800';
      }
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center min-h-screen mt-[80px]">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen mt-[80px] mb-[60px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your course work and submissions</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             {/* Filter */}
             <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none bg-white"
             >
                 <option value="All">All Status</option>
                 <option value="Pending">Pending</option>
                 <option value="Submitted">Submitted</option>
                 <option value="Graded">Graded</option>
             </select>

             {/* Search */}
             <div className="relative flex-1 md:flex-initial">
                <input
                    type="text"
                    placeholder="Search assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {process.env.NODE_ENV === 'development' && assignments.length === 0 && (
                 <button onClick={seedAssignments} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition">
                     + Seed Data
                 </button>
            )}
        </div>
      </div>

      {/* Assignments Grid */}
      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
                const date = assignment.dueDate?.seconds ? new Date(assignment.dueDate.seconds * 1000) : new Date();
                return (
                    <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={assignment.title}>{assignment.title}</h3>
                                <p className="text-sm text-gray-500">{assignment.course}</p>
                            </div>
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(assignment.status)}`}>
                                {assignment.status === 'Graded' && assignment.grade ? `Graded: ${assignment.grade}` : assignment.status}
                            </span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-3">
                            {assignment.description}
                        </p>

                        <div className="mt-auto">
                            <div className="flex items-center text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                Due: {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>

                            <div className="flex gap-3">
                                <button className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition border border-gray-200">
                                    View Details
                                </button>
                                {assignment.status === 'Pending' && (
                                    <button 
                                        onClick={() => handleUpload(assignment.id)}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
                                    >
                                        Upload File
                                    </button>
                                )}
                                {assignment.status === 'Submitted' && (
                                    <button className="flex-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200 cursor-default">
                                        Submitted
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 text-center">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                   <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
               </div>
               <h3 className="text-lg font-medium text-gray-900">No Assignments Found</h3>
               <p className="text-gray-500 mt-1 max-w-sm">No assignments match your search or filter. Check back later or try a different filter.</p>
          </div>
      )}
    </div>
  );
}