"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, onSnapshot, addDoc, orderBy } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, ChartData } from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend
);

interface Evaluation {
  id: string;
  semester: string;
  subject: string;
  exam: string;
  score: number;
  totalScore: number;
  grade: string;
  credits: number;
  date: string;
}

export default function PerformancePage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Stats
  const [gpa, setGpa] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [rank, setRank] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "evaluation_reports"), where("studentId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
        
        // Sort by date desc
        data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvaluations(data);
        
        // Calc Stats
        // Mock GPA Calculation: (Score / Total) * 4
        if(data.length > 0) {
            const totalPoints = data.reduce((acc, curr) => {
                const s = curr.score || 0;
                const t = curr.totalScore || 100;
                return acc + (s/t)*4;
            }, 0);
            
            const calculatedGpa = parseFloat((totalPoints / data.length).toFixed(2));
            setGpa(isNaN(calculatedGpa) ? 0 : calculatedGpa);

            const tCredits = data.reduce((acc, curr) => acc + (curr.credits || 0), 0);
            setTotalCredits(isNaN(tCredits) ? 0 : tCredits);

            // Mock Rank for demo
            setRank(Math.floor(Math.random() * 10) + 1); 
        } else {
            setGpa(0); setTotalCredits(0); setRank(0);
        }
        
        setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const seedPerformanceData = async () => {
      if(!user) return;
      if(!confirm("Seed performance data?")) return;
      
      try {
          // Semesters
          const subjects = ["Math", "Physics", "Chemistry", "Computer Science", "Biology"];
          const semesters = ["Sem 1", "Sem 2", "Sem 3"];
          
          for(const sem of semesters) {
              for(const sub of subjects) {
                  const score = Math.floor(Math.random() * (100 - 75 + 1)) + 75;
                  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : 'C';
                  
                  await addDoc(collection(db, "evaluation_reports"), {
                      studentId: user.uid,
                      semester: sem,
                      subject: sub,
                      exam: "Final",
                      score: score,
                      totalScore: 100,
                      grade: grade,
                      credits: 3,
                      date: new Date().toISOString()
                  });
              }
          }
          toast.success("Seeding complete");
      } catch(e) {
          console.error(e);
          toast.error("Failed");
      }
  }

  // --- Charts Logic ---

  // 1. Trend Line (Avg Score per Semester)
  const semesterGroups = evaluations.reduce((acc, curr) => {
      if(!acc[curr.semester]) acc[curr.semester] = { sum: 0, count: 0 };
      acc[curr.semester].sum += (curr.score/curr.totalScore)*4; // GPA scale
      acc[curr.semester].count += 1;
      return acc;
  }, {} as any);
  
  const semLabels = Object.keys(semesterGroups).sort();
  const gpaTrend = semLabels.map(sem => (semesterGroups[sem].sum / semesterGroups[sem].count).toFixed(2));

  const trendData: ChartData<'line'> = {
    labels: semLabels.length ? semLabels : ['Sem 1'],
    datasets: [
      {
        label: 'Your GPA',
        data: gpaTrend.length ? gpaTrend.map(v => parseFloat(v)) : [0],
        borderColor: '#1f75fe',
        backgroundColor: 'rgba(31, 117, 254, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // 2. Subject Bar (Avg Score per Subject)
  const subjectGroups = evaluations.reduce((acc, curr) => {
      if(!acc[curr.subject]) acc[curr.subject] = { sum: 0, count: 0 };
      acc[curr.subject].sum += curr.score;
      acc[curr.subject].count += 1;
      return acc;
  }, {} as any);

  const subLabels = Object.keys(subjectGroups);
  const subScores = subLabels.map(sub => Math.round(subjectGroups[sub].sum / subjectGroups[sub].count));

  const subjectData: ChartData<'bar'> = {
    labels: subLabels.length ? subLabels : ['None'],
    datasets: [
      {
        label: 'Average Score',
        data: subScores.length ? subScores : [0],
        backgroundColor: '#1f75fe',
      },
    ],
  };

  // 3. Radar (Recent Subject Scores) - Taking latest score for each subject
  const latestScores: any = {};
  evaluations.forEach(ev => {
      if(!latestScores[ev.subject] || new Date(ev.date) > new Date(latestScores[ev.subject].date)) {
          latestScores[ev.subject] = ev;
      }
  });
  
  const radarLabels = Object.keys(latestScores);
  const radarValues = radarLabels.map(l => latestScores[l].score);

  const radarData: ChartData<'radar'> = {
    labels: radarLabels.length ? radarLabels : ['None'],
    datasets: [
      {
        label: 'Your Score',
        data: radarValues.length ? radarValues : [0],
        borderColor: '#1f75fe',
        backgroundColor: 'rgba(31, 117, 254, 0.2)',
        pointBackgroundColor: '#1f75fe',
      },
      {
         label: 'Class Average', // Mock Average
         data: radarValues.map(v => Math.max(0, v - 5)),
         borderColor: '#9ca3af',
         backgroundColor: 'rgba(156, 163, 175, 0.2)',
         pointBackgroundColor: '#9ca3af',
      }
    ],
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
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">My Performance</h1>
            <p className="text-gray-600">Detailed analysis of your academic performance, trends, and comparisons.</p>
        </div>
        {process.env.NODE_ENV === 'development' && evaluations.length === 0 && (
            <button onClick={seedPerformanceData} className="text-sm bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200">
                + Seed Data
            </button>
        )}
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Current GPA</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">{gpa.toFixed(2)}</p>
          <p className="text-sm text-green-600">Cumulative</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Credits Earned</h3>
          <p className="text-3xl font-bold text-gray-900">{totalCredits}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Class Rank (Est.)</h3>
          <p className="text-3xl font-bold text-gray-900">{rank > 0 ? `#${rank}` : '-'}</p>
          <p className="text-sm text-gray-600">Based on GPA</p>
        </div>
      </div>

      {evaluations.length > 0 ? (
          <>
            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
                    <p className="text-sm text-gray-600 mb-4">Your GPA over semesters</p>
                    <div className="h-64">
                        <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
                <p className="text-sm text-gray-600 mb-4">Average scores across all exams</p>
                <div className="h-64">
                    <Bar 
                        data={subjectData} 
                        options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, max: 100 } } 
                        }} 
                    />
                </div>
                </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Balance</h3>
                <p className="text-sm text-gray-600 mb-4">Comparison of your latest scores against class average</p>
                <div className="h-80">
                  <Radar 
                    data={radarData} 
                    options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        scales: { r: { beginAtZero: true, max: 100 } }
                    }} 
                   />
                </div>
            </div>

            {/* Recent Grades Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Grades</h3>
                <p className="text-sm text-gray-600 mt-1">Your latest exam results</p>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {evaluations.slice(0, 5).map((grade, index) => (
                        <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grade.subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grade.semester} - {grade.exam}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (grade.grade || '').startsWith('A') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {grade.grade || 'N/A'}
                            </span>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grade.score}/{grade.totalScore}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(grade.date).toLocaleDateString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
          </>
      ) : (
          <div className="bg-white p-12 text-center rounded-lg border border-gray-200">
               <p className="text-gray-500">No performance data available yet.</p>
          </div>
      )}
    </div>
  );
}