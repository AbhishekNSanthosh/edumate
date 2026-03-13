"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdQuiz,
  MdTimer,
  MdBarChart,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdSearch,
  MdArrowBack,
  MdArrowForward,
  MdSend,
  MdWorkspacePremium,
  MdReplay,
} from "react-icons/md";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  batch: string;
  description: string;
  timeLimit: number;
  questions: QuizQuestion[];
  createdByName: string;
  totalMarks: number;
  isPublished: boolean;
  createdAt: any;
}

interface Submission {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  answers: number[];
  submittedAt: any;
}

type ViewState = "list" | "taking" | "result";

export default function StudentQuizPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<ViewState>("list");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [lastResult, setLastResult] = useState<Submission | null>(null);

  // Quiz taking state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizSnap, subSnap] = await Promise.all([
        getDocs(query(collection(db, "quizzes"), where("isPublished", "==", true))),
        getDocs(query(collection(db, "quiz_submissions"), where("studentId", "==", user!.uid))),
      ]);

      const quizData = quizSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz));
      quizData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setQuizzes(quizData);

      const subData = subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      setSubmissions(subData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const hasSubmitted = (quizId: string) =>
    submissions.some((s) => s.quizId === quizId);

  const getSubmission = (quizId: string) =>
    submissions.find((s) => s.quizId === quizId);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestion(0);
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setTimeLeft(quiz.timeLimit * 60);
    setView("taking");
  };

  const handleSubmit = useCallback(async (forcedAnswers?: number[]) => {
    if (!activeQuiz || !user || submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    const finalAnswers = forcedAnswers || answers;
    const score = activeQuiz.questions.reduce((s, q, i) => {
      return finalAnswers[i] === q.correctAnswer ? s + q.marks : s;
    }, 0);

    const percentage = Math.round((score / activeQuiz.totalMarks) * 100);

    try {
      await addDoc(collection(db, "quiz_submissions"), {
        quizId: activeQuiz.id,
        quizTitle: activeQuiz.title,
        studentId: user.uid,
        answers: finalAnswers,
        score,
        totalMarks: activeQuiz.totalMarks,
        percentage,
        submittedAt: serverTimestamp(),
      });

      const result: Submission = {
        id: Date.now().toString(),
        quizId: activeQuiz.id,
        quizTitle: activeQuiz.title,
        score,
        totalMarks: activeQuiz.totalMarks,
        percentage,
        answers: finalAnswers,
        submittedAt: new Date(),
      };
      setLastResult(result);
      setView("result");
      await fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  }, [activeQuiz, answers, submitting, user]);

  // Timer effect
  useEffect(() => {
    if (view !== "taking" || !activeQuiz) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [view, activeQuiz]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-green-600";
    if (pct >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const filtered = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ========== QUIZ LIST VIEW ==========
  if (view === "list") {
    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdQuiz className="text-purple-600 text-3xl" />
            Quizzes
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Attempt quizzes assigned by your faculty
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Available", value: quizzes.length },
            { label: "Completed", value: submissions.length },
            {
              label: "Avg Score",
              value:
                submissions.length > 0
                  ? Math.round(
                      submissions.reduce((s, sub) => s + sub.percentage, 0) /
                        submissions.length
                    ) + "%"
                  : "—",
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse h-36" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((quiz) => {
              const submitted = hasSubmitted(quiz.id);
              const sub = getSubmission(quiz.id);
              return (
                <div
                  key={quiz.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                    {submitted && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {quiz.subject}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {quiz.batch}
                    </span>
                  </div>
                  {quiz.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <MdQuiz className="text-sm" />
                      {quiz.questions.length} Qs
                    </span>
                    <span className="flex items-center gap-1">
                      <MdTimer className="text-sm" />
                      {quiz.timeLimit} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MdBarChart className="text-sm" />
                      {quiz.totalMarks} marks
                    </span>
                    <span>By {quiz.createdByName}</span>
                  </div>

                  {submitted && sub ? (
                    <div className="flex items-center justify-between">
                      <div
                        className={`text-sm font-bold ${getScoreColor(sub.percentage)}`}
                      >
                        Score: {sub.score}/{sub.totalMarks} ({sub.percentage}%)
                      </div>
                      <span className="text-xs text-gray-400">Already submitted</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => startQuiz(quiz)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition shadow-sm shadow-purple-200"
                    >
                      Start Quiz →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4">
              <MdQuiz className="text-4xl text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No quizzes available</h3>
            <p className="text-gray-500 text-sm">Check back when your faculty publishes a quiz</p>
          </div>
        )}
      </div>
    );
  }

  // ========== TAKING QUIZ VIEW ==========
  if (view === "taking" && activeQuiz) {
    const q = activeQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / activeQuiz.questions.length) * 100;
    const isLowTime = timeLeft < 60;

    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-bold text-gray-900">{activeQuiz.title}</h2>
            <p className="text-xs text-gray-500">
              Question {currentQuestion + 1} of {activeQuiz.questions.length}
            </p>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${
              isLowTime
                ? "bg-red-100 text-red-600 animate-pulse"
                : "bg-purple-50 text-purple-700"
            }`}
          >
            <MdTimer className="text-xl" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-4">
          <div className="flex items-start gap-3 mb-6">
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0">
              Q{currentQuestion + 1}
            </span>
            <p className="text-base font-medium text-gray-900 leading-relaxed">
              {q.question}
            </p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  const newAnswers = [...answers];
                  newAnswers[currentQuestion] = i;
                  setAnswers(newAnswers);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  answers[currentQuestion] === i
                    ? "border-purple-500 bg-purple-50 text-purple-900"
                    : "border-gray-100 hover:border-gray-300 text-gray-700"
                }`}
              >
                {answers[currentQuestion] === i ? (
                  <MdCheckCircle className="text-purple-500 text-xl flex-shrink-0" />
                ) : (
                  <MdRadioButtonUnchecked className="text-gray-300 text-xl flex-shrink-0" />
                )}
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick jump */}
        <div className="flex flex-wrap gap-2 mb-4">
          {activeQuiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                i === currentQuestion
                  ? "bg-purple-600 text-white"
                  : answers[i] !== -1
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <MdArrowBack /> Previous
          </button>

          {currentQuestion < activeQuiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion((p) => p + 1)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition"
            >
              Next <MdArrowForward />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition shadow-lg shadow-green-200 disabled:opacity-60"
            >
              <MdSend /> {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========== RESULT VIEW ==========
  if (view === "result" && lastResult && activeQuiz) {
    const { score, totalMarks, percentage, answers: submittedAnswers } = lastResult;
    const grade =
      percentage >= 90
        ? { label: "Excellent!", color: "text-green-600", bg: "bg-green-50" }
        : percentage >= 75
        ? { label: "Good Job!", color: "text-blue-600", bg: "bg-blue-50" }
        : percentage >= 60
        ? { label: "Passed", color: "text-yellow-600", bg: "bg-yellow-50" }
        : { label: "Needs Improvement", color: "text-red-600", bg: "bg-red-50" };

    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        {/* Result Card */}
        <div className="max-w-2xl mx-auto">
          <div className={`${grade.bg} rounded-2xl p-8 text-center mb-6 border border-gray-100`}>
            <MdWorkspacePremium className={`text-6xl ${grade.color} mx-auto mb-3`} />
            <h2 className={`text-3xl font-bold ${grade.color}`}>{grade.label}</h2>
            <p className="text-gray-600 mt-2">{activeQuiz.title}</p>
            <div className="mt-6">
              <div className={`text-6xl font-bold ${grade.color}`}>{percentage}%</div>
              <div className="text-gray-500 mt-1">
                {score} / {totalMarks} marks
              </div>
            </div>
          </div>

          {/* Answers Review */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-4">
            <h3 className="font-bold text-gray-900 mb-4">Answer Review</h3>
            <div className="space-y-4">
              {activeQuiz.questions.map((q, i) => {
                const isCorrect = submittedAnswers[i] === q.correctAnswer;
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border ${
                      isCorrect ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isCorrect
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        Q{i + 1} {isCorrect ? "✓" : "✗"}
                      </span>
                      <p className="text-sm font-medium text-gray-800">{q.question}</p>
                    </div>
                    <div className="ml-8 space-y-1 text-xs">
                      {submittedAnswers[i] !== -1 && submittedAnswers[i] !== q.correctAnswer && (
                        <p className="text-red-600">
                          Your answer: {q.options[submittedAnswers[i]]}
                        </p>
                      )}
                      <p className="text-green-700 font-medium">
                        Correct: {q.options[q.correctAnswer]} (+{q.marks} marks)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              setView("list");
              setActiveQuiz(null);
              setLastResult(null);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition shadow-lg shadow-purple-200"
          >
            <MdReplay /> Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  return null;
}
