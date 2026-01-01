"use client"
import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import { IoCheckmarkDoneCircleOutline, IoTrashOutline, IoFilterOutline, IoSearchOutline } from "react-icons/io5";
import toast from 'react-hot-toast'

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Basic query, client-side filtering since composite indexes might be required for complex server-side filtering
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(100) // Start with 100 recent notifications
    )

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)))
      setLoading(false)
    })

    return () => unsub()
  }, [])

  // Filter Logic
  const filteredNotifications = notifications.filter(n => {
     const matchesType = filterType === 'all' || n.type === filterType || (filterType === 'unread' && !n.read)
     const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase())
     return matchesType && matchesSearch
  })

  // Handlers
  const handleMarkAsRead = async (id: string) => {
      try {
          await updateDoc(doc(db, "notifications", id), { read: true })
      } catch (e) {
          console.error(e)
          toast.error("Failed to update")
      }
  }

  const handleDelete = async (id: string) => {
      try {
          await deleteDoc(doc(db, "notifications", id))
          toast.success("Deleted")
      } catch (e) {
          toast.error("Failed to delete")
      }
  }

  const markAllDisplayedAsRead = async () => {
    try {
        const batch = writeBatch(db)
        let count = 0
        filteredNotifications.forEach(n => {
            if(!n.read) {
                batch.update(doc(db, "notifications", n.id), { read: true })
                count++
            }
        })
        if (count > 0) {
            await batch.commit()
            toast.success(`Marked ${count} as read`)
        } else {
            toast('No unread notifications to mark')
        }
    } catch (e) {
        toast.error("Batch update failed")
    }
  }

  const deleteAllDisplayed = async () => {
    if(!confirm("Are you sure you want to delete all visible notifications?")) return;
    
    try {
        const batch = writeBatch(db)
        filteredNotifications.forEach(n => {
             batch.delete(doc(db, "notifications", n.id))
        })
        await batch.commit()
        toast.success("All visible notifications deleted")
    } catch (e) {
        toast.error("Batch delete failed")
    }
  }

  const getTypeColor = (type?: string) => {
      switch(type) {
          case 'success': return 'bg-green-100 border-green-200 text-green-800';
          case 'error': return 'bg-red-100 border-red-200 text-red-800';
          case 'warning': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
          default: return 'bg-blue-50 border-blue-100 text-blue-800';
      }
  }

  if (loading) return <div className="mt-[100px] flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                 <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                 <p className="text-gray-600 mt-1">Stay updated with system alerts and activities.</p>
            </div>
            <div className="flex space-x-3">
                 <button onClick={markAllDisplayedAsRead} className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition">
                     <IoCheckmarkDoneCircleOutline className="text-xl"/>
                     <span className="text-sm font-medium">Mark as Read</span>
                 </button>
                 <button onClick={deleteAllDisplayed} className="flex items-center space-x-2 px-4 py-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition">
                     <IoTrashOutline className="text-xl"/>
                     <span className="text-sm font-medium">Clear All</span>
                 </button>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
             <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                  <span className="text-gray-400 text-xl"><IoFilterOutline/></span>
                  {['all', 'unread', 'info', 'success', 'warning', 'error'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`capitalize px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                            filterType === t ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                          {t}
                      </button>
                  ))}
             </div>
             
             <div className="relative w-full md:w-64">
                <IoSearchOutline className="absolute left-3 top-2.5 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Search messages..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
        </div>

        {/* List */}
        <div className="space-y-3">
            {filteredNotifications.length > 0 ? (
                filteredNotifications.map(notification => (
                    <div 
                        key={notification.id} 
                        className={`group relative p-5 rounded-xl border transition-all duration-200 hover:shadow-md ${
                            !notification.read ? 'bg-white border-blue-200 shadow-sm border-l-4 border-l-blue-500' : 'bg-white/60 border-gray-200'
                        }`}
                    >
                         <div className="flex justify-between items-start">
                             <div className="flex-1 pr-8">
                                 <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider ${getTypeColor(notification.type)}`}>
                                          {notification.type || 'Info'}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                          {new Date(notification.createdAt).toLocaleString()}
                                      </span>
                                 </div>
                                 <h3 className={`text-base font-semibold mb-1 ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                     {notification.title}
                                 </h3>
                                 <p className="text-sm text-gray-600 leading-relaxed">
                                     {notification.message}
                                 </p>
                             </div>
                             
                             <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notification.read && (
                                     <button onClick={() => handleMarkAsRead(notification.id)} title="Mark as Read" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                                         <IoCheckmarkDoneCircleOutline size={20}/>
                                     </button>
                                  )}
                                  <button onClick={() => handleDelete(notification.id)} title="Delete" className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                                      <IoTrashOutline size={20}/>
                                  </button>
                             </div>
                         </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="text-gray-400 text-xl mb-2">No notifications found</div>
                    <p className="text-gray-500 text-sm">Try adjusting your filters or search query.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}
