"use client";
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import toast from 'react-hot-toast';
import { IoClose, IoSaveOutline } from 'react-icons/io5';

interface AddExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyId: string;
  editData?: any; // If provided, we are in edit mode
  type: 'institution' | 'designation';
  onSuccess: () => void;
}

export default function AddExperienceModal({ isOpen, onClose, facultyId, editData, type, onSuccess }: AddExperienceModalProps) {
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState(''); // Used for 'role' in institution or 'designation'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
        setInstitution(editData.institution || '');
        setRole(editData.role || editData.designation || '');
        setFromDate(editData.from || '');
        setToDate(editData.to || '');
        setIsCurrent(editData.to === 'Present');
    } else {
        // Reset
        setInstitution('');
        setRole('');
        setFromDate('');
        setToDate('');
        setIsCurrent(false);
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
          facultyId,
          entryType: type, // 'institution' or 'designation'
          institution,
          [type === 'institution' ? 'role' : 'designation']: role,
          from: fromDate,
          to: isCurrent ? 'Present' : toDate,
          updatedAt: new Date().toISOString()
      };

      if (editData?.id) {
          await updateDoc(doc(db, 'faculty_experience', editData.id), payload);
          toast.success("Updated successfully");
      } else {
          await addDoc(collection(db, 'faculty_experience'), {
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
              {editData ? 'Edit' : 'Add'} {type === 'institution' ? 'Previous Institution' : 'Designation'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <IoClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution / Organization</label>
                <input 
                    type="text" 
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'institution' ? 'Role / Position' : 'Designation'}
                </label>
                <input 
                    type="text" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From (Year)</label>
                    <input 
                        type="number" 
                        min="1900" max="2099"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        placeholder="YYYY"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">To (Year)</label>
                     <div className="flex flex-col gap-2">
                         <input 
                            type="number" 
                            min="1900" max="2099"
                            value={isCurrent ? '' : toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            placeholder="YYYY"
                            disabled={isCurrent}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isCurrent ? 'bg-gray-100' : ''}`}
                            required={!isCurrent}
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input 
                                type="checkbox"
                                checked={isCurrent}
                                onChange={(e) => setIsCurrent(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            Currently working here
                        </label>
                     </div>
                </div>
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
