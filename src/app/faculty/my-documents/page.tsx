'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import { IoCloudUploadOutline, IoDocumentTextOutline, IoTrashOutline, IoDownloadOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoAlertCircleOutline } from 'react-icons/io5'

interface Document {
  id: string;
  type: string;
  name: string;
  uploadDate: string;
  url: string;
  fileName: string;
  status: 'pending' | 'verified' | 'rejected';
  verifier?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function page() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('Educational Certificate')
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)

  const documentTypes = [
      'Educational Certificate', 
      'Experience Certificate', 
      'Joining Order', 
      'ID Proof', 
      'Academic Document',
      'Research Paper',
      'Other'
  ]

  // Fetch Documents
  useEffect(() => {
    if (!user) return;

    const q = query(
        collection(db, 'faculty_documents'), 
        where('facultyId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Document));
        // Sort client-side to avoid composite index
        docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocuments(docs);
    }, (err) => {
        // Handle index error gracefully usually, but here we might need an index for composite query
        // If sorting by createdAt causes issues without index, we can sort client side
        console.error("Fetch documents error", err);
        if (err.message.includes('requires an index')) {
             toast.error("System initializing... please refresh in a moment");
        }
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
          toast.error("File size must be less than 5MB");
          return;
      }

      setUploading(true);
      const toastId = toast.loading("Uploading document...");

      try {
          // 1. Upload to Storage
          const storageRef = ref(storage, `faculty_documents/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);

          // 2. Save Metadata to Firestore
          await addDoc(collection(db, 'faculty_documents'), {
              facultyId: user.uid,
              name: file.name.split('.')[0], // Use filename as default doc name or can ask user input
              fileName: file.name,
              url,
              type: selectedType,
              uploadDate: new Date().toISOString().split('T')[0],
              createdAt: new Date().toISOString(),
              status: 'pending'
          });

          toast.success("Document uploaded successfully", { id: toastId });
      } catch (error) {
          console.error(error);
          toast.error("Upload failed", { id: toastId });
      } finally {
          setUploading(false);
          // Reset input logic if needed
      }
  }

  const handleDelete = async (id: string, fileName: string) => {
      if(!confirm("Are you sure you want to delete this document?")) return;
      try {
          await deleteDoc(doc(db, 'faculty_documents', id));
          // Optionally delete from storage too if we want to clean up
          toast.success("Document deleted");
      } catch (error) {
          console.error(error);
          toast.error("Failed to delete");
      }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><IoCheckmarkCircleOutline/> Verified</span>;
      case 'pending': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><IoTimeOutline/> Pending</span>;
      case 'rejected': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><IoAlertCircleOutline/> Rejected</span>;
      default: return null;
    }
  }

  // Statistics
  const total = documents.length;
  const verified = documents.filter(d => d.status === 'verified').length;
  const pending = documents.filter(d => d.status === 'pending').length;

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-600 mt-2">Securely manage your employment and academic records.</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h2>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                    <select 
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {documentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                
                <div className="w-full md:w-auto">
                    <label className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer shadow-sm w-full md:w-auto ${
                        uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                        {uploading ? (
                             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div> 
                        ) : (
                             <IoCloudUploadOutline size={20} />
                        )}
                        <span>{uploading ? 'Uploading...' : 'Choose & Upload File'}</span>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Accepted formats: PDF, JPG, PNG, DOC (Max 5MB)</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Uploads</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Verified Documents</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{verified}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pending Verification</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pending}</p>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Your Documents</h2>
          </div>
          
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Document Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Upload Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {documents.length > 0 ? (
                          documents.map(doc => (
                              <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                              <IoDocumentTextOutline size={20}/>
                                          </div>
                                          <div>
                                              <p className="font-medium text-gray-900">{doc.name}</p>
                                              <p className="text-xs text-gray-500">{doc.fileName}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600">{doc.type}</td>
                                  <td className="px-6 py-4 text-sm text-gray-600">{doc.uploadDate}</td>
                                  <td className="px-6 py-4">
                                      {getStatusBadge(doc.status)}
                                      {doc.rejectionReason && (
                                          <p className="text-xs text-red-500 mt-1">Reason: {doc.rejectionReason}</p>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                      <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                        title="Download/View"
                                      >
                                          <IoDownloadOutline size={18}/>
                                      </a>
                                      <button 
                                        onClick={() => handleDelete(doc.id, doc.fileName)}
                                        className="inline-flex p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                                        title="Delete"
                                      >
                                          <IoTrashOutline size={18}/>
                                      </button>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                  No documents uploaded yet.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
        </div>
      </div>
    </div>
  )
}