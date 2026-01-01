'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import { FaFolder, FaFilePdf, FaFileImage, FaFileAlt, FaTrash, FaCloudUploadAlt, FaHdd } from 'react-icons/fa'

interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number; // in bytes
  url: string;
  folder: 'root' | 'documents' | 'assignments' | 'research';
  ownerId: string;
  createdAt: any;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB

export default function page() {
  const { user } = useAuth()
  const [files, setFiles] = useState<StoredFile[]>([])
  const [currentFolder, setCurrentFolder] = useState<'root' | 'documents' | 'assignments' | 'research'>('root')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Fetch Files
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
        collection(db, 'faculty_files'), 
        where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedFiles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as StoredFile));
        
        // Client-side sort by date descending
        fetchedFiles.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
            return dateB.getTime() - dateA.getTime();
        });

        setFiles(fetchedFiles);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching files:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSeedFiles = async () => {
      if (!user) return;
      if (!confirm("Seed default files?")) return;

      try {
          const sampleFiles = [
            { name: 'Syllabus_2025.pdf', type: 'application/pdf', size: 2500000, folder: 'documents', url: '#', ownerId: user.uid, createdAt: serverTimestamp() },
            { name: 'Research_Proposal_Draft.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1500000, folder: 'research', url: '#', ownerId: user.uid, createdAt: serverTimestamp() },
            { name: 'Assignment_1_Questions.pdf', type: 'application/pdf', size: 500000, folder: 'assignments', url: '#', ownerId: user.uid, createdAt: serverTimestamp() },
            { name: 'Profile_Photo.jpg', type: 'image/jpeg', size: 3500000, folder: 'root', url: '#', ownerId: user.uid, createdAt: serverTimestamp() },
          ];

          for (const f of sampleFiles) {
              await addDoc(collection(db, 'faculty_files'), f);
          }
          toast.success("Files seeded successfully");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed files");
      }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      setUploading(true);

      // Simulate network delay
      setTimeout(async () => {
          try {
              // Create metadata record
              // In a real app, we would upload to Firebase Storage and get URL
              const newFile = {
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  url: '#', // Simulated URL
                  folder: currentFolder,
                  ownerId: user.uid,
                  createdAt: serverTimestamp()
              };
              
              await addDoc(collection(db, 'faculty_files'), newFile);
              toast.success("File uploaded successfully");
          } catch (err) {
              console.error(err);
              toast.error("Upload failed");
          } finally {
              setUploading(false);
          }
      }, 1500);
    }
  }

  const handleDelete = async (fileId: string) => {
      if (!confirm("Delete this file permanently?")) return;
      try {
          await deleteDoc(doc(db, 'faculty_files', fileId));
          toast.success("File deleted");
      } catch (e) {
          console.error(e);
          toast.error("Failed to delete file");
      }
  }

  const filteredFiles = files.filter(f => f.folder === currentFolder);
  const totalUsed = files.reduce((acc, curr) => acc + curr.size, 0);
  const usagePercentage = (totalUsed / STORAGE_LIMIT) * 100;

  const FileIcon = ({ type }: { type: string }) => {
      if (type.includes('pdf')) return <FaFilePdf className="text-red-500 text-3xl" />;
      if (type.includes('image')) return <FaFileImage className="text-purple-500 text-3xl" />;
      return <FaFileAlt className="text-blue-500 text-3xl" />;
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
             <label className={`block w-full py-3 px-4 rounded-lg text-center font-medium text-white transition-colors cursor-pointer ${uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                 {uploading ? 'Uploading...' : 'Upload File'}
                 <input type="file" className="hidden" disabled={uploading} onChange={handleUpload} />
             </label>
             
             <nav className="mt-8 space-y-2">
                 {[
                     { id: 'root', label: 'My Drive', icon: FaHdd },
                     { id: 'documents', label: 'Documents', icon: FaFolder },
                     { id: 'assignments', label: 'Assignments', icon: FaFolder },
                     { id: 'research', label: 'Research', icon: FaFolder },
                 ].map((item) => (
                     <button
                        key={item.id}
                        onClick={() => setCurrentFolder(item.id as any)}
                        className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentFolder === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                     >
                         <item.icon className={currentFolder === item.id ? 'text-blue-500' : 'text-gray-400'} />
                         <span>{item.label}</span>
                     </button>
                 ))}
             </nav>
          </div>

          {/* Storage Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Storage</h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(usagePercentage, 100)}%` }}></div>
              </div>
              <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{formatSize(totalUsed)}</span> used of {formatSize(STORAGE_LIMIT)}
              </p>
          </div>
          
           {/* Seeding (Dev only) */}
           {process.env.NODE_ENV === 'development' && files.length === 0 && (
               <button onClick={handleSeedFiles} className="mt-4 w-full py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg border border-purple-200">
                   + Seed Sample Files
               </button>
           )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md min-h-[600px] flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 capitalize">
                        {currentFolder === 'root' ? 'My Drive' : currentFolder}
                    </h2>
                    <span className="text-sm text-gray-500">{filteredFiles.length} items</span>
                </div>

                <div className="p-6 flex-1">
                    {loading ? (
                        <div className="text-center text-gray-500 mt-10">Loading files...</div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="text-center flex flex-col items-center justify-center h-full text-gray-400">
                            <FaFolder className="text-6xl mb-4 opacity-20" />
                            <p>No files in this folder.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFiles.map((file) => (
                                <div key={file.id} className="group relative bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all border border-gray-100 hover:border-blue-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-white rounded-lg shadow-sm">
                                            <FileIcon type={file.type} />
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(file.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                    <h3 className="font-medium text-gray-900 truncate mb-1" title={file.name}>{file.name}</h3>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>{formatSize(file.size)}</span>
                                        <span>
                                            {file.createdAt?.toDate ? file.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  )
}
