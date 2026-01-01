"use client";
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import toast from 'react-hot-toast';
import { IoClose, IoSaveOutline } from 'react-icons/io5';

interface AddResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyId: string;
  editData?: any;
  onSuccess: () => void;
}

export default function AddResearchModal({ isOpen, onClose, facultyId, editData, onSuccess }: AddResearchModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Publication');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
        setTitle(editData.title || '');
        setType(editData.type || 'Publication');
        setYear(editData.year || '');
        setDescription(editData.description || '');
    } else {
        setTitle('');
        setType('Publication');
        setYear(new Date().getFullYear().toString());
        setDescription('');
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
          facultyId,
          title,
          type,
          year,
          description,
          updatedAt: new Date().toISOString()
      };

      if (editData?.id) {
          await updateDoc(doc(db, 'faculty_research', editData.id), payload);
          toast.success("Updated successfully");
      } else {
          await addDoc(collection(db, 'faculty_research'), {
              ...payload,
              createdAt: new Date().toISOString()
          });
          toast.success("Added successfully");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">
              {editData ? 'Edit' : 'Add'} Research / Project
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <IoClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title / Topic</label>
                <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. AI in Education"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="Publication">Publication</option>
                    <option value="Project">Project</option>
                    <option value="Conference">Conference</option>
                    <option value="Grant">Grant</option>
                    <option value="Patent">Patent</option>
                    <option value="Book Chapter">Book Chapter</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input 
                    type="number" 
                    min="1900" max="2099"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Details</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief details about impact, journal name, etc."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
            </div>

            <div className="pt-2 flex justify-end gap-3">
                <button 
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-70"
                >
                    {submitting ? 'Saving...' : <><IoSaveOutline/> Save</>}
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}
