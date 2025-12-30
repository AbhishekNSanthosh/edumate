'use client';

import React, { useState } from 'react'

interface Message {
  id: number;
  sender: string;
  type: 'admin' | 'student' | 'announcement' | 'reply';
  content: string;
  timestamp: string;
  read: boolean;
  attachment?: string;
}

interface ChatHistory {
  id: number;
  user: string;
  messages: Message[];
  lastMessage: string;
  unreadCount: number;
}

export default function page() {
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null)
  const [newMessage, setNewMessage] = useState('')

  // Sample data - in a real app, this would come from an API
  const chats: ChatHistory[] = [
    {
      id: 1,
      user: 'Admin - Dr. Alice Johnson',
      messages: [
        { id: 1, sender: 'Admin', type: 'admin', content: 'Please submit your attendance report by EOD.', timestamp: 'Dec 30, 2025 10:30 AM', read: true },
        { id: 2, sender: 'You', type: 'reply', content: 'Understood, will submit shortly.', timestamp: 'Dec 30, 2025 10:35 AM', read: true },
      ],
      lastMessage: 'Understood, will submit shortly.',
      unreadCount: 0,
    },
    {
      id: 2,
      user: 'Student - John Doe (2022CSE001)',
      messages: [
        { id: 3, sender: 'John Doe', type: 'student', content: 'Query about assignment deadline extension.', timestamp: 'Dec 30, 2025 11:15 AM', read: false },
      ],
      lastMessage: 'Query about assignment deadline extension.',
      unreadCount: 1,
    },
    {
      id: 3,
      user: 'Announcement - Faculty Meeting',
      messages: [
        { id: 4, sender: 'Announcement', type: 'announcement', content: 'Faculty meeting scheduled for Jan 2, 2026 at 2 PM. Agenda attached.', timestamp: 'Dec 29, 2025 4:00 PM', read: true, attachment: 'meeting_agenda.pdf' },
      ],
      lastMessage: 'Faculty meeting scheduled for Jan 2, 2026 at 2 PM. Agenda attached.',
      unreadCount: 0,
    },
  ]

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && selectedChat) {
      // Simulate sending message
      setNewMessage('')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Simulate file upload
    console.log('File uploaded:', e.target.files?.[0]?.name)
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <input
        type="text"
        placeholder="Search messages..."
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 flex-1"
      />
      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        New Chat
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Archive
      </button>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Message Box</h1>
          <p className="text-gray-600 mt-2">Internal communication system for faculty.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{chat.user}</p>
                      <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
            {selectedChat ? (
              <>
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedChat.user}</h2>
                </div>
                <div className="p-4 overflow-y-auto max-h-[400px] space-y-4">
                  {selectedChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.sender === 'You'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        {msg.attachment && (
                          <a href="#" className="text-xs underline mt-1 block">
                            📎 {msg.attachment}
                          </a>
                        )}
                        <p className="text-xs opacity-75 mt-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="attachment"
                    />
                    <label htmlFor="attachment" className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                      📎
                    </label>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Select a chat to start messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Chats</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{chats.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Unread Messages</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{chats.reduce((sum, chat) => sum + chat.unreadCount, 0)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Conversations</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{chats.filter(chat => chat.messages.length > 0).length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}