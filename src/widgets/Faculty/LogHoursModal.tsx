"use client";
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import toast from 'react-hot-toast';
import { IoClose, IoSaveOutline } from 'react-icons/io5';

interface LogHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyId: string;
  onSuccess: () => void;
}

export default function LogHoursModal({ isOpen, onClose, facultyId, onSuccess }: LogHoursModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityType, setActivityType] = useState('Meeting');
  const [duration, setDuration] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
        toast.error("Description is required");
        return;
    }
    if (duration <= 0) {
        toast.error("Duration must be positive");
        return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'faculty_work_logs'), {
          facultyId,
          date,
          activityType,
          duration: Number(duration),
          description,
          createdAt: new Date().toISOString(),
          status: 'pending' // Manual logs might need approval
      });
      
      toast.success("Hours logged successfully");
      onSuccess();
      onClose();
      // Reset form
      setDescription('');
      setDuration(1);
    } catch (error) {
      console.error(error);
      toast.error("Failed to log hours");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Log Non-Teaching Hours</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <IoClose size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                <select 
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="Meeting">Meeting</option>
                    <option value="Research">Research & Development</option>
                    <option value="Evaluation">Evaluation / Grading</option>
                    <option value="Mentoring">Student Mentoring</option>
                    <option value="Administrative">Administrative Task</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Hours)</label>
                <input 
                    type="number" 
                    step="0.5"
                    min="0.5"
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief details about the task..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    required
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
                    {submitting ? 'Saving...' : <><IoSaveOutline/> Save Log</>}
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}
