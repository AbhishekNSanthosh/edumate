'use client';

import React, { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import { IoSearchOutline, IoFilterOutline, IoDownloadOutline, IoPrintOutline, IoAddCircleOutline } from 'react-icons/io5'

interface Rule {
  id: string;
  title: string;
  category: 'academic' | 'conduct' | 'examination' | 'attendance' | 'disciplinary' | 'other';
  content: string;
  documentUrl?: string;
  createdAt?: any;
}

export default function page() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const categories = [
    { id: 'all', label: 'All Policies' },
    { id: 'academic', label: 'Academic' },
    { id: 'conduct', label: 'Code of Conduct' },
    { id: 'examination', label: 'Examination' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'disciplinary', label: 'Disciplinary' },
  ]

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'faculty_rules'), orderBy('title', 'asc')); // Simple sort by title
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Rule));
      setRules(fetchedRules);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching rules:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSeedRules = async () => {
      if (!confirm("Are you sure you want to seed default rules? This will add duplicates if they already exist.")) return;
      
      const sampleRules = [
        {
          title: 'Academic Rules',
          category: 'academic',
          content: '1. Students must maintain a minimum CGPA of 2.0 to continue studies.\n2. Maximum credit hours per semester: 18.\n3. Course registration deadline: End of first week.\n4. Grade appeals must be submitted within 7 days of results publication.',
          documentUrl: '#'
        },
        {
          title: 'Code of Conduct',
          category: 'conduct',
          content: '1. Maintain professionalism in all interactions.\n2. No discrimination based on gender, race, or religion.\n3. Use of mobile phones restricted during classes.\n4. Report any harassment immediately to the administration.',
          documentUrl: '#'
        },
        {
          title: 'Examination Regulations',
          category: 'examination',
          content: '1. Minimum 75% attendance required to appear for exams.\n2. No electronic devices allowed in exam halls.\n3. Cheating results in immediate disqualification.\n4. Re-evaluation fee: $50 per subject.',
          documentUrl: '#'
        },
        {
          title: 'Attendance Policies',
          category: 'attendance',
          content: '1. 75% attendance mandatory for eligibility.\n2. Late arrivals count as 0.5 absent.\n3. Medical certificates required for sick leaves.\n4. Unauthorized absences lead to academic probation.',
          documentUrl: '#'
        },
        {
          title: 'Disciplinary Guidelines',
          category: 'disciplinary',
          content: '1. Plagiarism results in zero marks and warning.\n2. Repeated violations lead to suspension.\n3. Grievance committee handles complaints.\n4. Appeal process: Submit within 5 working days.',
          documentUrl: '#'
        },
      ];

      try {
          const promises = sampleRules.map(rule => addDoc(collection(db, 'faculty_rules'), {
              ...rule,
              createdAt: serverTimestamp()
          }));
          await Promise.all(promises);
          toast.success("Default rules added successfully");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed rules");
      }
  }

  const handleToggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  const handleDownload = (fileName?: string) => {
    toast.success(`Downloading policy document...`);
  }

  const filteredRules = rules.filter(rule => {
      const matchesSearch = rule.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            rule.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || rule.category === selectedCategory;
      return matchesSearch && matchesCategory;
  });

  const QuickActions = () => (
    <div className="flex flex-wrap gap-4 mb-6">
      <button 
        onClick={() => handleDownload('all')}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <IoDownloadOutline className="mr-2 text-xl" />
        Download All Policies
      </button>
      <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
        <IoPrintOutline className="mr-2 text-xl" />
        Print Handbook
      </button>
      {process.env.NODE_ENV === 'development' && rules.length === 0 && (
          <button 
            onClick={handleSeedRules}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <IoAddCircleOutline className="mr-2 text-xl" />
            Seed Default Rules
          </button>
      )}
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rules and Regulations</h1>
          <p className="text-gray-600 mt-2">Access institutional policies and guidelines.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <IoSearchOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                <input 
                    type="text" 
                    placeholder="Search policies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                <IoFilterOutline className="text-gray-400 text-xl flex-shrink-0" />
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            selectedCategory === cat.id 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Policies Accordion */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
             {loading ? (
                 <div className="p-8 text-center text-gray-500">Loading policies...</div>
             ) : filteredRules.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">
                     {rules.length === 0 ? "No policies found. Click 'Seed Default Rules' to initialize." : "No policies match your search."}
                 </div>
             ) : (
                <div className="divide-y divide-gray-200">
                    {filteredRules.map((policy) => (
                    <div key={policy.id}>
                        <div
                        onClick={() => handleToggleSection(policy.id)}
                        className={`p-6 cursor-pointer hover:bg-gray-50 flex justify-between items-center transition-colors ${expandedSection === policy.id ? 'bg-gray-50' : ''}`}
                        >
                        <div className="flex items-center space-x-3">
                            <h2 className="text-xl font-semibold text-gray-900">{policy.title}</h2>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
                                policy.category === 'academic' ? 'bg-blue-100 text-blue-800' :
                                policy.category === 'conduct' ? 'bg-purple-100 text-purple-800' :
                                policy.category === 'examination' ? 'bg-red-100 text-red-800' :
                                policy.category === 'attendance' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {policy.category}
                            </span>
                        </div>
                        <span className="text-gray-500 text-2xl font-light">
                            {expandedSection === policy.id ? '−' : '+'}
                        </span>
                        </div>
                        {expandedSection === policy.id && (
                        <div className="px-6 pb-6 bg-gray-50 border-t border-gray-100 animate-fadeIn">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed mb-4 p-4 bg-white rounded border border-gray-200">
                                {policy.content}
                            </pre>
                            <div className="flex justify-end">
                                <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(policy.documentUrl); }}
                                className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
                                >
                                <IoDownloadOutline className="mr-2 text-lg" />
                                Download PDF
                                </button>
                            </div>
                        </div>
                        )}
                    </div>
                ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Policies</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{rules.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Academic Rules</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{rules.filter(r => r.category === 'academic').length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Disciplinary Guidelines</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{rules.filter(r => r.category === 'disciplinary').length}</p>
            </div>
            </div>
        )}
      </div>
    </div>
  )
}