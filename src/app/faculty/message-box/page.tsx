'use client';

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp, orderBy, serverTimestamp, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any;
  readBy: string[];
  attachment?: string;
  type?: 'text' | 'file';
}

interface Conversation {
  id: string;
  participants: string[];
  participantsDetails: {
    uid: string;
    name: string;
    role: string;
  }[];
  lastMessage: string;
  lastMessageTimestamp: any;
  unreadCounts: { [key: string]: number };
}

export default function page() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch Conversations
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
        collection(db, 'conversations'), 
        where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Conversation));
        
        // Client-side sort to avoid composite index requirement
        chats.sort((a, b) => {
            const timeA = a.lastMessageTimestamp?.seconds || 0;
            const timeB = b.lastMessageTimestamp?.seconds || 0;
            return timeB - timeA;
        });
        
        setConversations(chats);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Messages for Selected Chat
  useEffect(() => {
      if (!selectedChat) return;

      const q = query(
          collection(db, 'messages'),
          where('conversationId', '==', selectedChat.id)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          } as Message));

          // Client-side sort
          msgs.sort((a, b) => {
              const timeA = a.timestamp?.seconds || 0;
              const timeB = b.timestamp?.seconds || 0;
              return timeA - timeB; // Ascending
          });

          setMessages(msgs);
      });

      return () => unsubscribe();
  }, [selectedChat]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat || !user) return;

    try {
        const msgData = {
            conversationId: selectedChat.id,
            senderId: user.uid,
            senderName: user.displayName || 'Faculty',
            content: newMessage,
            timestamp: serverTimestamp(),
            readBy: [user.uid],
            type: 'text'
        };

        // Add message
        await addDoc(collection(db, 'messages'), msgData);

        // Update conversation
        await updateDoc(doc(db, 'conversations', selectedChat.id), {
            lastMessage: newMessage,
            lastMessageTimestamp: serverTimestamp(),
            // Logic to increment unread count for others could go here (requires transactions for accuracy or cloud functions)
        });

        setNewMessage('');
    } catch (error) {
        console.error("Send failed", error);
        toast.error("Failed to send");
    }
  }

  const handleSeedChat = async () => {
      if (!user) return;
      try {
          // Create a convo with 'Admin'
          const participantsDetails = [
              { uid: user.uid, name: user.displayName || 'You', role: 'faculty' },
              { uid: 'admin_test_uid', name: 'Admin Office', role: 'admin' }
          ];
          
          const convoData = {
              participants: [user.uid, 'admin_test_uid'],
              participantsDetails,
              lastMessage: 'Welcome to the portal!',
              lastMessageTimestamp: serverTimestamp(),
              unreadCounts: { [user.uid]: 1 }
          };

          const docRef = await addDoc(collection(db, 'conversations'), convoData);
          
          // Add initial message
          await addDoc(collection(db, 'messages'), {
              conversationId: docRef.id,
              senderId: 'admin_test_uid',
              senderName: 'Admin Office',
              content: 'Welcome to the portal! Please feel free to ask any questions.',
              timestamp: serverTimestamp(),
              readBy: ['admin_test_uid'],
              type: 'text'
          });

          toast.success("Test chat created with Admin");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed chat");
      }
  }

  const getOtherParticipant = (chat: Conversation) => {
      return chat.participantsDetails.find(p => p.uid !== user?.uid) || chat.participantsDetails[0];
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Simulate file upload
    if (e.target.files?.[0]) {
        toast.success(`File ${e.target.files[0].name} selected (Upload simulation)`);
    }
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <input
        type="text"
        placeholder="Search messages..."
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 flex-1"
      />
      <button 
        onClick={handleSeedChat}
        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
        + Seed Test Chat
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Chat List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading && <p className="p-4 text-center text-gray-500">Loading chats...</p>}
              {!loading && conversations.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                      No conversations yet. <br/> Click "Seed Test Chat" to start.
                  </div>
              )}
              {conversations.map((chat) => {
                const otherUser = getOtherParticipant(chat);
                const isUnread = false; // Implement unread logic based on unreadCounts if needed
                return (
                    <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    >
                    <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{otherUser?.name} <span className="text-xs text-gray-500">({otherUser?.role})</span></p>
                        <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                        </div>
                        {chat.unreadCounts?.[user?.uid || ''] > 0 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {chat.unreadCounts?.[user?.uid || '']}
                        </span>
                        )}
                    </div>
                    </div>
                );
              })}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            {selectedChat ? (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                      {getOtherParticipant(selectedChat)?.name}
                  </h2>
                  <span className="text-xs text-gray-500">{selectedChat.id}</span>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                        msg.senderId === user?.uid
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        {msg.attachment && (
                          <a href="#" className="text-xs underline mt-1 block">
                            📎 {msg.attachment}
                          </a>
                        )}
                        <p className={`text-[10px] mt-1 text-right ${msg.senderId === user?.uid ? 'text-blue-100' : 'text-gray-400'}`}>
                            {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="attachment"
                    />
                    <label htmlFor="attachment" className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                      📎
                    </label>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="text-6xl mb-4">💬</div>
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}