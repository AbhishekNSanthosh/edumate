'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import { IoAdd, IoPencil, IoTrash, IoBriefcaseOutline, IoRibbonOutline, IoSchoolOutline, IoStarOutline } from 'react-icons/io5'
import AddExperienceModal from '../../../widgets/Faculty/AddExperienceModal'
import AddResearchModal from '../../../widgets/Faculty/AddResearchModal'


interface ExperienceItem {
  id: string;
  entryType: 'institution' | 'designation';
  institution: string;
  role?: string;
  designation?: string;
  from: string;
  to: string;
}

interface ResearchItem {
  id: string;
  title: string;
  type: string;
  year: string;
  description: string;
}

interface AppraisalItem {
  id: string;
  year: string;
  rating: string;
  comments: string;
  appraiser: string;
}

export default function page() {
  const { user } = useAuth()
  
  // Data States
  const [pastInstitutions, setPastInstitutions] = useState<ExperienceItem[]>([])
  const [designations, setDesignations] = useState<ExperienceItem[]>([])
  const [research, setResearch] = useState<ResearchItem[]>([])
  const [appraisals, setAppraisals] = useState<AppraisalItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modal States
  const [expModalOpen, setExpModalOpen] = useState(false)
  const [expModalType, setExpModalType] = useState<'institution'|'designation'>('institution')
  const [researchModalOpen, setResearchModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch Experience (Institutions & Designations)
    const expQuery = query(collection(db, 'faculty_experience'), where('facultyId', '==', user.uid));
    const unsubExp = onSnapshot(expQuery, (snap) => {
        const allExp = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExperienceItem));
        // Filter Client Side
        setPastInstitutions(allExp.filter(e => e.entryType === 'institution').sort((a, b) => b.to.localeCompare(a.to)));
        setDesignations(allExp.filter(e => e.entryType === 'designation').sort((a, b) => b.to.localeCompare(a.to)));
    });

    const resQuery = query(collection(db, 'faculty_research'), where('facultyId', '==', user.uid));
    const unsubRes = onSnapshot(resQuery, (snap) => {
        setResearch(snap.docs.map(d => ({ id: d.id, ...d.data() } as ResearchItem)).sort((a, b) => parseInt(b.year) - parseInt(a.year)));
    });

    const appQuery = query(collection(db, 'faculty_appraisals'), where('facultyId', '==', user.uid));
    const unsubApp = onSnapshot(appQuery, (snap) => {
        setAppraisals(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppraisalItem)).sort((a, b) => parseInt(b.year) - parseInt(a.year)));
        setLoading(false);
    });

    return () => {
        unsubExp();
        unsubRes();
        unsubApp();
    }
  }, [user]);

  const handleDelete = async (collectionName: string, id: string) => {
      if (!confirm("Are you sure you want to delete this record?")) return;
      try {
          await deleteDoc(doc(db, collectionName, id));
          toast.success("Record deleted");
      } catch (error) {
          console.error(error);
          toast.error("Failed to delete");
      }
  }

  const openExpModal = (type: 'institution' | 'designation', item?: any) => {
      setExpModalType(type);
      setEditingItem(item || null);
      setExpModalOpen(true);
  }

  const openResearchModal = (item?: any) => {
      setEditingItem(item || null);
      setResearchModalOpen(true);
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8 flex justify-between items-end">
          <div>
              <h1 className="text-3xl font-bold text-gray-900">My Previous Details</h1>
              <p className="text-gray-600 mt-2">Manage your professional career history and achievements.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><IoBriefcaseOutline size={24}/></div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{pastInstitutions.length}</h3>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Past Jobs</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg"><IoRibbonOutline size={24}/></div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{designations.length}</h3>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Designations</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><IoSchoolOutline size={24}/></div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{research.length}</h3>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Publications</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg"><IoStarOutline size={24}/></div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{appraisals.length}</h3>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Appraisals</p>
                </div>
            </div>
        </div>

        {/* 1. Previous Institutions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><IoBriefcaseOutline/> Previous Institutions</h2>
                 <button onClick={() => openExpModal('institution')} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                     <IoAdd/> Add New
                 </button>
             </div>
             <div className="overflow-x-auto">
                 <table className="min-w-full text-left">
                     <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                         <tr>
                             <th className="px-6 py-3">Institution</th>
                             <th className="px-6 py-3">Role</th>
                             <th className="px-6 py-3">Duration</th>
                             <th className="px-6 py-3 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {pastInstitutions.map((item: any) => (
                             <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="px-6 py-4 font-medium text-gray-900">{item.institution}</td>
                                 <td className="px-6 py-4 text-gray-600">{item.role}</td>
                                 <td className="px-6 py-4 text-gray-500">{item.from} - {item.to}</td>
                                 <td className="px-6 py-4 text-right space-x-2">
                                     <button onClick={() => openExpModal('institution', item)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><IoPencil/></button>
                                     <button onClick={() => handleDelete('faculty_experience', item.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><IoTrash/></button>
                                 </td>
                             </tr>
                         ))}
                         {pastInstitutions.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* 2. Designations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><IoRibbonOutline/> Designation History</h2>
                 <button onClick={() => openExpModal('designation')} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                     <IoAdd/> Add New
                 </button>
             </div>
             <div className="overflow-x-auto">
                 <table className="min-w-full text-left">
                     <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                         <tr>
                             <th className="px-6 py-3">Designation</th>
                             <th className="px-6 py-3">Institution</th>
                             <th className="px-6 py-3">Period</th>
                             <th className="px-6 py-3 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {designations.map((item: any) => (
                             <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="px-6 py-4 font-medium text-gray-900">{item.designation}</td>
                                 <td className="px-6 py-4 text-gray-600">{item.institution}</td>
                                 <td className="px-6 py-4 text-gray-500">{item.from} - {item.to}</td>
                                 <td className="px-6 py-4 text-right space-x-2">
                                     <button onClick={() => openExpModal('designation', item)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><IoPencil/></button>
                                     <button onClick={() => handleDelete('faculty_experience', item.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><IoTrash/></button>
                                 </td>
                             </tr>
                         ))}
                         {designations.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* 3. Research */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><IoSchoolOutline/> Research & Publications</h2>
                 <button onClick={() => openResearchModal()} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                     <IoAdd/> Add New
                 </button>
             </div>
             <div className="overflow-x-auto">
                 <table className="min-w-full text-left">
                     <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                         <tr>
                             <th className="px-6 py-3">Title</th>
                             <th className="px-6 py-3">Type</th>
                             <th className="px-6 py-3">Year</th>
                             <th className="px-6 py-3">Details</th>
                             <th className="px-6 py-3 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {research.map((item: any) => (
                             <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="px-6 py-4 font-medium text-gray-900">{item.title}</td>
                                 <td className="px-6 py-4">
                                     <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">{item.type}</span>
                                 </td>
                                 <td className="px-6 py-4 text-gray-500">{item.year}</td>
                                 <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{item.description}</td>
                                 <td className="px-6 py-4 text-right space-x-2">
                                     <button onClick={() => openResearchModal(item)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><IoPencil/></button>
                                     <button onClick={() => handleDelete('faculty_research', item.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><IoTrash/></button>
                                 </td>
                             </tr>
                         ))}
                         {research.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No research items added.</td></tr>}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* 4. Appraisals (Read Only) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><IoStarOutline/> Performance Appraisals</h2>
             </div>
             <div className="overflow-x-auto">
                 <table className="min-w-full text-left">
                     <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                         <tr>
                             <th className="px-6 py-3">Year</th>
                             <th className="px-6 py-3">Rating</th>
                             <th className="px-6 py-3">Comments</th>
                             <th className="px-6 py-3">Appraiser</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {appraisals.map((item: any) => (
                             <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="px-6 py-4 font-bold text-gray-900">{item.year}</td>
                                 <td className="px-6 py-4">
                                     <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold">{item.rating}</span>
                                 </td>
                                 <td className="px-6 py-4 text-gray-600 max-w-md">{item.comments}</td>
                                 <td className="px-6 py-4 text-gray-500 italic">{item.appraiser}</td>
                             </tr>
                         ))}
                         {appraisals.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No appraisals recorded yet.</td></tr>}
                     </tbody>
                 </table>
             </div>
        </div>

      </div>

      {user && (
          <>
            <AddExperienceModal 
                isOpen={expModalOpen}
                onClose={() => setExpModalOpen(false)}
                facultyId={user.uid}
                type={expModalType}
                editData={editingItem}
                onSuccess={() => {}} // Snapshot updates automatically
            />
            <AddResearchModal
                isOpen={researchModalOpen}
                onClose={() => setResearchModalOpen(false)}
                facultyId={user.uid}
                editData={editingItem}
                onSuccess={() => {}} 
            />
          </>
      )}

    </div>
  )
}