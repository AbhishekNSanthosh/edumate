"use client";

import React, { useEffect, useState } from 'react';
import { FiSearch, FiDownload } from 'react-icons/fi';
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, onSnapshot, addDoc, orderBy } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface Result {
  id: string;
  semester: string;
  exam: string;
  date: any; // Firestore timestamp
  score: number;
  totalScore: number;
  grade: string;
  credits: number;
  status: 'Passed' | 'Failed' | 'Distinction';
  subject?: string;
}

export default function UniversityResultsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [cgpa, setCgpa] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [lastSemGpa, setLastSemGpa] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "evaluation_reports"), where("studentId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Result));
        
        // Sort by date descending
        data.sort((a,b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return dateB.getTime() - dateA.getTime();
        });

        setResults(data);
        calculateStats(data);
        setLoading(false);
    }, (error) => {
        console.error("Results fetch error:", error);
        toast.error("Failed to load results");
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const calculateStats = (data: Result[]) => {
      if (data.length === 0) {
          setCgpa(0); setTotalCredits(0); setLastSemGpa(0);
          return;
      }

      // CGPA (Simple average for demo)
      const totalPoints = data.reduce((acc, curr) => {
          const s = curr.score || 0;
          const t = curr.totalScore || 100;
          return acc + (s / t) * 4;
      }, 0);
      const calculatedCgpa = parseFloat((totalPoints / data.length).toFixed(2));
      setCgpa(isNaN(calculatedCgpa) ? 0 : calculatedCgpa);

      // Total Credits
      const credits = data.reduce((acc, curr) => acc + (curr.score >= 40 ? (curr.credits || 0) : 0), 0); // Assuming 40 pass mark
      setTotalCredits(isNaN(credits) ? 0 : credits);

      // Last Sem GPA
      if (data.length > 0) {
          const lastSem = data[0].semester;
          const lastSemSubjects = data.filter(d => d.semester === lastSem);
          if (lastSemSubjects.length > 0) {
            const lastPoints = lastSemSubjects.reduce((acc, curr) => {
                const s = curr.score || 0;
                const t = curr.totalScore || 100;
                return acc + (s / t) * 4;
            }, 0);
            const lGpa = parseFloat((lastPoints / lastSemSubjects.length).toFixed(2));
            setLastSemGpa(isNaN(lGpa) ? 0 : lGpa);
          } else {
             setLastSemGpa(0);
          }
      }
  };

  const seedResults = async () => {
      if (!user) return;
      if (!confirm("Generate sample university results?")) return;

      try {
          const semesters = ['Fall 2023', 'Spring 2023', 'Fall 2022'];
          const subjects = ['Data Structures', 'Operating Systems', 'Calculus III', 'Linear Algebra'];

          for (const sem of semesters) {
              for (const sub of subjects) {
                  const score = Math.floor(Math.random() * (98 - 45 + 1)) + 45;
                  const passed = score >= 50;
                  const distinction = score >= 85;
                  let grade = 'F';
                  if (score >= 90) grade = 'A+';
                  else if (score >= 80) grade = 'A';
                  else if (score >= 70) grade = 'B';
                  else if (score >= 60) grade = 'C';
                  else if (score >= 50) grade = 'D';

                  await addDoc(collection(db, "evaluation_reports"), {
                      studentId: user.uid,
                      semester: sem,
                      exam: sub,
                      date: new Date(),
                      score: score,
                      totalScore: 100,
                      grade: grade,
                      credits: 3, // exams/subjects usually 3 or 4 credits
                      status: distinction ? 'Distinction' : (passed ? 'Passed' : 'Failed'),
                      subject: sub // using 'exam' field mainly but adding 'subject' for compatibility
                  });
              }
          }
          toast.success("Results generated!");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed data");
      }
  };

  // Filter results based on search
  const filteredResults = results.filter(
    (result) =>
      (result.exam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (result.semester || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = () => {
    window.print();
    toast.success("Printing transcript...");
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Distinction': return 'bg-orange-100 text-orange-800';
          case 'Passed': return 'bg-green-100 text-green-800';
          case 'Failed': return 'bg-red-100 text-red-800';
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
    <div className="p-6 bg-gray-50 min-h-screen mt-[80px] mb-[60px] print:mt-0 print:bg-white">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6 print:hidden">University Results</h1>
      <div className="hidden print:block mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Official Transcript</h1>
          <p className="text-gray-600">EduMate University</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 print:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center print:border-none print:shadow-none">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center print:hidden">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.292a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{cgpa}</h3>
          <p className="text-sm font-medium text-gray-500 mb-2">Cumulative GPA</p>
          <p className="text-xs text-gray-600 print:hidden">Overall academic performance.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center print:border-none print:shadow-none">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center print:hidden">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{totalCredits}</h3>
          <p className="text-sm font-medium text-gray-500 mb-2">Total Credits Earned</p>
          <p className="text-xs text-gray-600 print:hidden">Credits successfully completed.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center print:border-none print:shadow-none">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center print:hidden">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{lastSemGpa}</h3>
          <p className="text-sm font-medium text-gray-500 mb-2">Last Semester GPA</p>
          <p className="text-xs text-gray-600 print:hidden">Most recent semester performance.</p>
        </div>
      </div>

      {/* Search and Download */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 print:hidden">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by exam or semester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {process.env.NODE_ENV === 'development' && results.length === 0 && (
                 <button onClick={seedResults} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition">
                     + Seed Data
                 </button>
            )}
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
                <FiDownload className="w-4 h-4" />
                Download Transcript
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 print:bg-white print:border-b-2 print:border-black">
          <h3 className="text-lg font-semibold text-gray-900">Exam Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 print:bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black">Semester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black">Exam Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black">Marks Obtained</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black">Max Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-300">
              {filteredResults.map((result) => {
                  const date = result.date?.toDate ? result.date.toDate() : new Date(result.date);
                  // Determine status dynamically if not present, though we strive to have it in Record
                  let status = result.status;
                  if (!status) {
                      if (result.score >= 85) status = 'Distinction';
                      else if (result.score >= 50) status = 'Passed';
                      else status = 'Failed';
                  }

                  return (
                    <tr key={result.id} className="hover:bg-gray-50 print:hover:bg-white border-b print:border-gray-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.semester}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.exam || result['subject'] || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{date.toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{result.score}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{result.totalScore}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.grade || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)} print:bg-white print:text-black print:border print:border-gray-300`}>
                            {status}
                            </span>
                        </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
        {filteredResults.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No results found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}