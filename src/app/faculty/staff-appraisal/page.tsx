'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface AppraisalForm {
  id: string;
  year: string;
  selfAssessment: string;
  hodRemarks: string;
  principalRemarks: string;
  overallScore: number;
  status: 'draft' | 'submitted' | 'completed' | 'reviewed';
  promotionStatus?: string;
  feedbackComments?: string;
  createdAt?: any;
}

export default function page() {
  const { user } = useAuth()
  const [appraisalForms, setAppraisalForms] = useState<AppraisalForm[]>([])
  const [editingForm, setEditingForm] = useState<string | null>(null)
  const [selfAssessment, setSelfAssessment] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch Appraisals
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
        collection(db, 'faculty_appraisals'), 
        where('facultyId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const forms = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AppraisalForm));
        
        // Client-side sort to avoid composite index requirement
        forms.sort((a,b) => parseInt(b.year) - parseInt(a.year));
        
        setAppraisalForms(forms);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching appraisals:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSeedAppraisalData = async () => {
      if (!user) return;
      if (!confirm("Seed default appraisal data?")) return;

      try {
          const sampleData = [
            {
               facultyId: user.uid, year: '2025', selfAssessment: '', hodRemarks: '', principalRemarks: '', overallScore: 0, 
               status: 'draft', promotionStatus: '', feedbackComments: '', createdAt: serverTimestamp()
            },
            {
               facultyId: user.uid, year: '2024', selfAssessment: 'Focused on student mentoring.', hodRemarks: 'Good performance.', principalRemarks: 'Satisfactory.', overallScore: 85, 
               status: 'completed', promotionStatus: 'No change', feedbackComments: 'Maintain current momentum.', createdAt: serverTimestamp()
            },
            {
               facultyId: user.uid, year: '2023', selfAssessment: 'Published 3 papers.', hodRemarks: 'Excellent research output.', principalRemarks: 'Recommended for raise.', overallScore: 92, 
               status: 'completed', promotionStatus: 'Increment Given', feedbackComments: 'Great work!', createdAt: serverTimestamp()
            }
          ];

          for (const d of sampleData) {
              await addDoc(collection(db, 'faculty_appraisals'), d);
          }
          toast.success("Appraisal data seeded");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed data");
      }
  }

  const handleEdit = (form: AppraisalForm) => {
      setEditingForm(form.id);
      setSelfAssessment(form.selfAssessment || '');
  }

  const handleSaveDraft = async (formId: string) => {
      try {
          await updateDoc(doc(db, 'faculty_appraisals', formId), {
              selfAssessment: selfAssessment
          });
          toast.success("Draft saved");
          setEditingForm(null);
      } catch (e) {
          console.error(e);
          toast.error("Failed to save draft");
      }
  }

  const handleSubmit = async (formId: string) => {
      if (!confirm("Are you sure you want to submit? You cannot edit after submission.")) return;
      try {
          await updateDoc(doc(db, 'faculty_appraisals', formId), {
              selfAssessment: selfAssessment,
              status: 'submitted'
          });
          toast.success("Appraisal submitted successfully");
          setEditingForm(null);
      } catch (e) {
          console.error(e);
          toast.error("Failed to submit");
      }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'reviewed': return 'bg-purple-100 text-purple-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const handleDownload = () => {
      toast.success("Downloading forms...");
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button 
        onClick={handleDownload}
        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Forms
      </button>
      {process.env.NODE_ENV === 'development' && appraisalForms.length === 0 && (
          <button 
            onClick={handleSeedAppraisalData}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            + Seed Appraisal Data
          </button>
      )}
    </div>
  )

  const currentYearForm = appraisalForms.find(f => f.year === new Date().getFullYear().toString()) || appraisalForms[0];
  const historyForms = appraisalForms.filter(f => f.id !== currentYearForm?.id);

  const averageScore = appraisalForms.filter(f => f.status === 'completed').reduce((sum, f) => sum + (f.overallScore || 0), 0) / 
                       (appraisalForms.filter(f => f.status === 'completed').length || 1);
  
  const promotionsCount = appraisalForms.filter(f => f.promotionStatus && f.promotionStatus !== 'No change').length;

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Staff Appraisal</h1>
          <p className="text-gray-600 mt-2">Faculty performance evaluation and feedback.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Loading / Empty State */}
        {loading && <div className="p-8 text-center text-gray-500">Loading appraisals...</div>}
        
        {!loading && !currentYearForm && appraisalForms.length === 0 && (
             <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 mb-8">
                 No appraisal records found. <br/> Use the "Seed Appraisal Data" button to generate records.
             </div>
        )}

        {/* Current Appraisal Form */}
        {!loading && currentYearForm && (
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Current Appraisal Form ({currentYearForm.year})</h2>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentYearForm.status)}`}>
              {currentYearForm.status.charAt(0).toUpperCase() + currentYearForm.status.slice(1)}
            </span>
          </div>
          {editingForm === currentYearForm.id ? (
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Self-Assessment</label>
                  <textarea
                    value={selfAssessment}
                    onChange={(e) => setSelfAssessment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows={6}
                    placeholder="Enter your detailed self-assessment..."
                  />
                </div>
                <div className="flex space-x-4 justify-end">
                  <button
                    onClick={() => setEditingForm(null)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleSaveDraft(currentYearForm.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    Save Draft
                  </button>
                  <button 
                    onClick={() => handleSubmit(currentYearForm.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Self-Assessment</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-md min-h-[100px] whitespace-pre-wrap">
                      {currentYearForm.selfAssessment || <span className="text-gray-400 italic">No self-assessment entered yet.</span>}
                  </p>
                </div>
                {currentYearForm.status !== 'draft' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HOD Remarks</label>
                        <p className="text-gray-900 bg-gray-50 p-2 rounded">{currentYearForm.hodRemarks || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Remarks</label>
                        <p className="text-gray-900 bg-gray-50 p-2 rounded">{currentYearForm.principalRemarks || '-'}</p>
                    </div>
                    </div>
                )}
                <div className="flex items-center justify-between mt-4">
                    {currentYearForm.overallScore > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Score</label>
                            <p className="text-2xl font-bold text-blue-600">{currentYearForm.overallScore}/100</p>
                        </div>
                    )}
                   {currentYearForm.status === 'draft' && (
                    <button
                        onClick={() => handleEdit(currentYearForm)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ml-auto"
                    >
                        Edit Self-Assessment
                    </button>
                   )}
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* History Table */}
        {!loading && historyForms.length > 0 && (
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Appraisal History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promotion/Feedback</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.overallScore > 0 ? form.overallScore : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(form.status)}`}>
                        {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{form.promotionStatus}</div>
                        <div className="text-gray-500 text-xs truncate max-w-xs">{form.feedbackComments}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Summary Stats */}
        {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Average Score</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{averageScore.toFixed(1)}/100</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Promotions</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{promotionsCount}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Appraisals on Record</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{appraisalForms.length}</p>
            </div>
            </div>
        )}
      </div>
    </div>
  )
}