"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdNotificationsActive,
  MdSend,
  MdPeople,
  MdGroup,
  MdPerson,
  MdHistory,
  MdCampaign,
} from "react-icons/md";

interface NotifHistory {
  id: string;
  title: string;
  message: string;
  audience: string[];
  type: string;
  sentAt: any;
}

const TYPE_OPTIONS = [
  { label: "ℹ️ Info", value: "info" },
  { label: "⚠️ Warning", value: "warning" },
  { label: "🔴 Urgent", value: "urgent" },
  { label: "📅 Reminder", value: "reminder" },
  { label: "🎉 Announcement", value: "announcement" },
];

export default function AdminPushNotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<NotifHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    message: "",
    audience: ["student"] as string[],
    type: "info",
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const snap = await getDocs(collection(db, "notifications"));
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as NotifHistory))
        .sort((a, b) => (b.sentAt?.seconds || 0) - (a.sentAt?.seconds || 0))
        .slice(0, 20);
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleAudience = (value: string) => {
    if (value === "all") {
      setForm((p) => ({
        ...p,
        audience: ["student", "faculty", "parent", "admin"],
      }));
      return;
    }
    setForm((p) => ({
      ...p,
      audience: p.audience.includes(value)
        ? p.audience.filter((a) => a !== value)
        : [...p.audience, value],
    }));
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Please enter title and message");
      return;
    }
    if (form.audience.length === 0) {
      toast.error("Please select at least one audience group");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "notifications"), {
        title: form.title,
        message: form.message,
        audience: form.audience,
        type: form.type,
        read: false,
        sentBy: user?.uid || "admin",
        sentAt: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });

      toast.success(`✅ Notification sent to ${form.audience.join(", ")}!`);
      setForm({ title: "", message: "", audience: ["student"], type: "info" });
      fetchHistory();
    } catch (e) {
      console.error(e);
      toast.error("Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; dot: string }> = {
      urgent: { color: "bg-red-50 border-red-200 text-red-700", dot: "bg-red-500" },
      warning: { color: "bg-yellow-50 border-yellow-200 text-yellow-700", dot: "bg-yellow-500" },
      announcement: { color: "bg-purple-50 border-purple-200 text-purple-700", dot: "bg-purple-500" },
      reminder: { color: "bg-orange-50 border-orange-200 text-orange-700", dot: "bg-orange-500" },
      info: { color: "bg-blue-50 border-blue-200 text-blue-700", dot: "bg-blue-500" },
    };
    return configs[type] || configs.info;
  };

  const audienceGroups = [
    { label: "Students", value: "student", icon: MdPeople, color: "blue" },
    { label: "Faculty", value: "faculty", icon: MdGroup, color: "green" },
    { label: "Parents", value: "parent", icon: MdPerson, color: "purple" },
    { label: "All Users", value: "all", icon: MdCampaign, color: "orange" },
  ];

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MdNotificationsActive className="text-orange-500 text-3xl" />
          Push Notifications
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Send instant notifications to students, faculty, and parents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
            <h2 className="font-bold text-gray-900">Compose Notification</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              This notification will appear in users' notification panels
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Holiday Notice Tomorrow"
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Type your notification message here..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
              <div className="text-xs text-gray-400 text-right mt-0.5">
                {form.message.length}/500
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Type
              </label>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      form.type === t.value
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send To
              </label>
              <div className="grid grid-cols-2 gap-2">
                {audienceGroups.map((a) => {
                  const isSelected =
                    a.value === "all"
                      ? form.audience.length >= 3
                      : form.audience.includes(a.value);
                  return (
                    <button
                      key={a.value}
                      onClick={() => toggleAudience(a.value)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                        isSelected
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <a.icon className="text-lg" />
                      {a.label}
                    </button>
                  );
                })}
              </div>
              {form.audience.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Sending to:{" "}
                  <span className="font-semibold text-orange-600">
                    {form.audience.join(", ")}
                  </span>
                </p>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition shadow-lg shadow-orange-200 disabled:opacity-60 text-sm"
            >
              <MdSend className="text-lg" />
              {loading ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </div>

        {/* History Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MdHistory className="text-gray-500 text-xl" />
                <h2 className="font-bold text-gray-900">Notification History</h2>
              </div>
              <span className="text-xs text-gray-400">{history.length} sent</span>
            </div>
          </div>

          <div className="divide-y divide-gray-50 max-h-[580px] overflow-y-auto">
            {historyLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-20" />
                ))}
              </div>
            ) : history.length > 0 ? (
              history.map((notif) => {
                const cfg = getTypeConfig(notif.type || "info");
                return (
                  <div key={notif.id} className="p-4 hover:bg-gray-50 transition">
                    <div className={`rounded-xl border p-3 ${cfg.color}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                        <p className="text-sm font-semibold">{notif.title}</p>
                      </div>
                      <p className="text-xs ml-4 opacity-80 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-2 ml-4 text-xs opacity-60">
                        <span>
                          To:{" "}
                          {Array.isArray(notif.audience)
                            ? notif.audience.join(", ")
                            : notif.audience}
                        </span>
                        {notif.sentAt && (
                          <>
                            <span>•</span>
                            <span>
                              {new Date(notif.sentAt.seconds * 1000).toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-gray-400">
                <MdNotificationsActive className="text-4xl mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications sent yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
