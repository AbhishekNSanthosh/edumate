'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaGraduationCap, FaCalendarAlt, FaEdit, FaSave, FaTimes, FaCamera } from 'react-icons/fa'

interface UserProfile {
  displayName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  qualification: string;
  bio: string;
  photoUrl: string;
  joiningDate?: any;
}

export default function page() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UserProfile>({
      displayName: '',
      email: '',
      phoneNumber: '',
      department: '',
      designation: '',
      qualification: '',
      bio: '',
      photoUrl: '',
  })

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchProfile = async () => {
        try {
            const docRef = doc(db, 'faculty_profiles', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                setProfile(data);
                setFormData(data);
            } else {
                // Initialize with Auth data if profile doesn't exist
                const initialData: UserProfile = {
                    displayName: user.displayName || '',
                    email: user.email || '',
                    phoneNumber: '',
                    department: '',
                    designation: '',
                    qualification: '',
                    bio: '',
                    photoUrl: user.photoURL || '',
                    joiningDate: serverTimestamp()
                };
                setProfile(initialData);
                setFormData(initialData);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    }

    fetchProfile();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSave = async () => {
      if (!user) return;
      try {
          await setDoc(doc(db, 'faculty_profiles', user.uid), {
              ...formData,
              updatedAt: serverTimestamp()
          }, { merge: true });
          
          setProfile(formData);
          setIsEditing(false);
          toast.success("Profile updated successfully");
      } catch (error) {
          console.error(error);
          toast.error("Failed to update profile");
      }
  }

  const handleCancel = () => {
      if (profile) setFormData(profile);
      setIsEditing(false);
  }

  const handleSeedProfile = async () => {
      if (!user) return;
      if (!confirm("Seed default profile data? This will overwrite current details.")) return;

      const seedData: UserProfile = {
          displayName: user.displayName || 'Faculty Member',
          email: user.email || 'faculty@edumate.edu',
          phoneNumber: '+91 98765 43210',
          department: 'Computer Science & Engineering',
          designation: 'Assistant Professor',
          qualification: 'M.Tech in CSE, Ph.D. (Pursuing)',
          bio: 'Passionate educator with 5+ years of experience in teaching Data Structures and Algorithms. Research interests include AI and Machine Learning.',
          photoUrl: user.photoURL || 'https://ui-avatars.com/api/?name=Faculty+Member&background=0D8ABC&color=fff',
          joiningDate: serverTimestamp()
      };

      try {
          await setDoc(doc(db, 'faculty_profiles', user.uid), seedData);
          setProfile(seedData);
          setFormData(seedData);
          toast.success("Profile seeded successfully");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed profile");
      }
  }

  if (loading) return <div className="mt-[100px] p-8 text-center text-gray-500">Loading profile...</div>

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            
            {/* Header / Cover */}
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            
            <div className="px-6 pb-6">
                <div className="flex justify-between items-end -mt-12 mb-6">
                     <div className="relative">
                         <img 
                            src={formData.photoUrl || 'https://via.placeholder.com/150'} 
                            alt="Profile" 
                            className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                         />
                     </div>
                     {!isEditing && (
                         <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                         >
                             <FaEdit /> <span>Edit Profile</span>
                         </button>
                     )}
                     {isEditing && (
                         <div className="flex space-x-2 items-center">
                             <label className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm cursor-pointer">
                                 <FaCamera /> <span>Change Photo</span>
                                 <input 
                                     type="file" 
                                     accept="image/*"
                                     className="hidden"
                                     onChange={(e) => {
                                         if (e.target.files && e.target.files[0]) {
                                             // In a real app, upload to storage and get URL.
                                             // For now, prompt for URL or use a placeholder logic, 
                                             // or better yet, since we can't easily handle file uploads without storage,
                                             // let's confirm usage of a generated avatar or external URL.
                                             // Actually, simplified: Read as dataURL for small images or simulation.
                                             // Simulating an upload delay and setting a dummy new URL for demo.
                                             const file = e.target.files[0];
                                             const reader = new FileReader();
                                             reader.onloadend = () => {
                                                 setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
                                                 toast.success("Photo updated (preview only until saved)");
                                             };
                                             reader.readAsDataURL(file);
                                         }
                                     }}
                                 />
                             </label>
                             <button 
                                onClick={handleCancel}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                             >
                                 <FaTimes /> <span>Cancel</span>
                             </button>
                             <button 
                                onClick={handleSave}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                             >
                                 <FaSave /> <span>Save Changes</span>
                             </button>
                         </div>
                     )}
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input 
                                        name="displayName"
                                        value={formData.displayName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                    <input 
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g. Assistant Professor"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{profile?.displayName || 'No Name Set'}</h1>
                                <p className="text-gray-600 font-medium">{profile?.designation || 'No Designation'}</p>
                            </div>
                        )}
                    </div>

                    {/* Detailed Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                         {/* Department */}
                         <div className="flex items-start space-x-3">
                             <div className="mt-1 p-2 bg-blue-100 text-blue-600 rounded-lg">
                                 <FaBuilding />
                             </div>
                             <div className="flex-1">
                                 <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Department</label>
                                 {isEditing ? (
                                     <input 
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        className="mt-1 w-full px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="e.g. CSE"
                                     />
                                 ) : (
                                     <p className="text-gray-900 font-medium">{profile?.department || '-'}</p>
                                 )}
                             </div>
                         </div>

                         {/* Qualification */}
                         <div className="flex items-start space-x-3">
                             <div className="mt-1 p-2 bg-purple-100 text-purple-600 rounded-lg">
                                 <FaGraduationCap />
                             </div>
                             <div className="flex-1">
                                 <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Qualification</label>
                                 {isEditing ? (
                                     <input 
                                        name="qualification"
                                        value={formData.qualification}
                                        onChange={handleInputChange}
                                        className="mt-1 w-full px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="e.g. Ph.D."
                                     />
                                 ) : (
                                     <p className="text-gray-900 font-medium">{profile?.qualification || '-'}</p>
                                 )}
                             </div>
                         </div>

                         {/* Phone */}
                         <div className="flex items-start space-x-3">
                             <div className="mt-1 p-2 bg-green-100 text-green-600 rounded-lg">
                                 <FaPhone />
                             </div>
                             <div className="flex-1">
                                 <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                                 {isEditing ? (
                                     <input 
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        className="mt-1 w-full px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="+91..."
                                     />
                                 ) : (
                                     <p className="text-gray-900 font-medium">{profile?.phoneNumber || '-'}</p>
                                 )}
                             </div>
                         </div>

                         {/* Email */}
                         <div className="flex items-start space-x-3">
                             <div className="mt-1 p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                                 <FaEnvelope />
                             </div>
                             <div className="flex-1">
                                 <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                 <p className="text-gray-900 font-medium break-all">{profile?.email || '-'}</p>
                             </div>
                         </div>
                    </div>
                    
                    {/* Bio */}
                    <div>
                         <label className="block text-sm font-semibold text-gray-900 mb-2">About Me</label>
                         {isEditing ? (
                             <textarea 
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Write clear and concise bio..."
                             />
                         ) : (
                             <p className="text-gray-700 leading-relaxed bg-white text-sm">
                                 {profile?.bio || <span className="text-gray-400 italic">No bio available.</span>}
                             </p>
                         )}
                    </div>

                    {/* Footer / Seeding */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="pt-6 border-t border-gray-100 flex justify-center">
                            <button 
                                onClick={handleSeedProfile}
                                className="text-xs text-purple-600 hover:text-purple-800 underline"
                            >
                                (Dev) Seed Default Profile Data
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
