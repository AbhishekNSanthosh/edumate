"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdQuiz,
  MdAdd,
  MdDelete,
  MdEdit,
  MdSearch,
  MdClose,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdBarChart,
  MdPeople,
  MdTimer,
  MdPublish,
  MdUnpublished,
} from "react-icons/md";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  marks: number;
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  batch: string;
  description: string;
  timeLimit: number; // in minutes
  questions: QuizQuestion[];
  createdBy: string;
  createdByName: string;
  isPublished: boolean;
  totalMarks: number;
  createdAt: any;
  submissionsCount?: number;
  hideMarks?: boolean;
}

const emptyQuestion = (): QuizQuestion => ({
  id: Date.now().toString(),
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  marks: 1,
});

export default function FacultyQuizPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [profile, setProfile] = useState<any>(null);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    batch: "",
    description: "",
    timeLimit: 30,
    hideMarks: false,
    questions: [emptyQuestion()],
  });

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchQuizzes();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "faculty"), where("authUid", "==", user!.uid))
      );
      if (!snap.empty) setProfile(snap.docs[0].data());
    } catch (e) {}
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "quizzes"),
        where("createdBy", "==", user!.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      // Count submissions for each quiz
      const withCounts = await Promise.all(
        data.map(async (quiz) => {
          const submissions = await getDocs(
            query(collection(db, "quiz_submissions"), where("quizId", "==", quiz.id))
          );
          return { ...quiz, submissionsCount: submissions.size };
        })
      );
      setQuizzes(withCounts);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      subject: "",
      batch: "",
      description: "",
      timeLimit: 30,
      hideMarks: false,
      questions: [emptyQuestion()],
    });
    setEditQuiz(null);
  };

  const addQuestion = () => {
    setForm((p) => ({ ...p, questions: [...p.questions, emptyQuestion()] }));
  };

  const removeQuestion = (idx: number) => {
    if (form.questions.length === 1) return;
    setForm((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setForm((p) => ({
      ...p,
      questions: p.questions.map((q, i) =>
        i === idx ? { ...q, [field]: value } : q
      ),
    }));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setForm((p) => ({
      ...p,
      questions: p.questions.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = value;
        return { ...q, options: newOpts };
      }),
    }));
  };

  const handleSave = async (publish = false) => {
    if (!form.title || !form.subject || !form.batch) {
      toast.error("Please fill title, subject, and batch");
      return;
    }
    const invalidQ = form.questions.find(
      (q) => !q.question || q.options.some((o) => !o)
    );
    if (invalidQ) {
      toast.error("Please complete all questions and options");
      return;
    }

    try {
      const totalMarks = form.questions.reduce((s, q) => s + q.marks, 0);
      const payload = {
        ...form,
        totalMarks,
        isPublished: publish,
        createdBy: user!.uid,
        createdByName: profile?.name || "Faculty",
        createdAt: serverTimestamp(),
      };

      if (editQuiz) {
        await updateDoc(doc(db, "quizzes", editQuiz.id), { ...payload, createdAt: editQuiz.createdAt });
        toast.success("Quiz updated!");
      } else {
        await addDoc(collection(db, "quizzes"), payload);
        toast.success(publish ? "Quiz published!" : "Quiz saved as draft!");
      }

      resetForm();
      setActiveTab("list");
      fetchQuizzes();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save quiz");
    }
  };

  const togglePublish = async (quiz: Quiz) => {
    try {
      await updateDoc(doc(db, "quizzes", quiz.id), { isPublished: !quiz.isPublished });
      toast.success(quiz.isPublished ? "Quiz unpublished" : "Quiz published!");
      fetchQuizzes();
    } catch (e) {
      toast.error("Failed to update quiz");
    }
  };

  const handleDelete = async (quiz: Quiz) => {
    if (!confirm("Delete this quiz? All submissions will be lost.")) return;
    try {
      await deleteDoc(doc(db, "quizzes", quiz.id));
      toast.success("Quiz deleted");
      fetchQuizzes();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const loadEditQuiz = (quiz: Quiz) => {
    setEditQuiz(quiz);
    setForm({
      title: quiz.title,
      subject: quiz.subject,
      batch: quiz.batch,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      hideMarks: quiz.hideMarks || false,
      questions: quiz.questions,
    });
    setActiveTab("create");
  };

  const filtered = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdQuiz className="text-purple-600 text-3xl" />
            Quiz Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage quizzes for your students</p>
        </div>

        <div className="flex gap-2">
          {["list", "create"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "list") resetForm();
                setActiveTab(tab as any);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab === "list" ? "My Quizzes" : editQuiz ? "Edit Quiz" : "Create Quiz"}
            </button>
          ))}
        </div>
      </div>

      {/* QUIZ LIST */}
      {activeTab === "list" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Quizzes", value: quizzes.length },
              { label: "Published", value: quizzes.filter((q) => q.isPublished).length },
              { label: "Drafts", value: quizzes.filter((q) => !q.isPublished).length },
              {
                label: "Total Submissions",
                value: quizzes.reduce((s, q) => s + (q.submissionsCount || 0), 0),
              },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Quiz Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse h-40" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {quiz.subject}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {quiz.batch}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            quiz.isPublished
                              ? "bg-green-50 text-green-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {quiz.isPublished ? "● Published" : "○ Draft"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <MdQuiz className="text-sm" />
                      {quiz.questions.length} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <MdTimer className="text-sm" />
                      {quiz.timeLimit} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MdBarChart className="text-sm" />
                      {quiz.totalMarks} marks
                    </span>
                    <span className="flex items-center gap-1">
                      <MdPeople className="text-sm" />
                      {quiz.submissionsCount || 0} submissions
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePublish(quiz)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        quiz.isPublished
                          ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
                          : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                      }`}
                    >
                      {quiz.isPublished ? (
                        <>
                          <MdUnpublished className="text-sm" /> Unpublish
                        </>
                      ) : (
                        <>
                          <MdPublish className="text-sm" /> Publish
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => loadEditQuiz(quiz)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 border border-blue-200 transition"
                    >
                      <MdEdit className="text-sm" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(quiz)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 border border-red-200 transition ml-auto"
                    >
                      <MdDelete className="text-sm" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
              <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                <MdQuiz className="text-4xl text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No quizzes yet</h3>
              <p className="text-gray-500 text-sm mb-4">Create your first quiz to get started</p>
              <button
                onClick={() => setActiveTab("create")}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
              >
                Create Quiz
              </button>
            </div>
          )}
        </>
      )}

      {/* QUIZ CREATOR */}
      {activeTab === "create" && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <h2 className="text-lg font-bold text-gray-900">
                {editQuiz ? "Edit Quiz" : "Create New Quiz"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Fill in the details and add questions</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quiz Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Unit 2 Assessment"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="e.g., Data Structures"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.batch}
                    onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
                    placeholder="e.g., CSE 2024"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={form.timeLimit}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 30 }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-[10px]">
                    Hide Marks
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={form.hideMarks}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, hideMarks: e.target.checked }))
                      }
                      className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-600">Hide marks from students</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Quiz instructions or description..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Questions ({form.questions.length})
                  </h3>
                  <div className="text-xs text-gray-500">
                    Total Marks: {form.questions.reduce((s, q) => s + q.marks, 0)}
                  </div>
                </div>

                <div className="space-y-4">
                  {form.questions.map((question, qIdx) => (
                    <div
                      key={question.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">
                          Q{qIdx + 1}
                        </span>
                        <button
                          onClick={() => removeQuestion(qIdx)}
                          className="text-gray-400 hover:text-red-500 transition"
                        >
                          <MdClose className="text-lg" />
                        </button>
                      </div>

                      <div className="mb-3">
                        <textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                          placeholder="Enter your question..."
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {question.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuestion(qIdx, "correctAnswer", optIdx)}
                              className="flex-shrink-0"
                            >
                              {question.correctAnswer === optIdx ? (
                                <MdCheckCircle className="text-green-500 text-xl" />
                              ) : (
                                <MdRadioButtonUnchecked className="text-gray-300 text-xl hover:text-green-400 transition" />
                              )}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className={`flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                                question.correctAnswer === optIdx
                                  ? "border-green-300 bg-green-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 font-medium">Marks:</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={question.marks}
                          onChange={(e) =>
                            updateQuestion(qIdx, "marks", parseInt(e.target.value) || 1)
                          }
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400 text-center"
                        />
                        <span className="text-xs text-green-600 font-medium ml-2">
                          ✓ Click radio button to set correct answer
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addQuestion}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-purple-200 text-purple-600 rounded-xl text-sm font-medium hover:bg-purple-50 transition"
                >
                  <MdAdd className="text-xl" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab("list");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition shadow-lg shadow-purple-200"
              >
                <MdPublish className="inline mr-1" />
                Publish Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
