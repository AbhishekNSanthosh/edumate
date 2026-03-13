import { MdAccessTimeFilled, MdAssessment, MdAssignmentTurnedIn, MdDescription, MdEventNote, MdExitToApp, MdFolder, MdGavel, MdGroups, MdGroupWork, MdHistory, MdMailOutline, MdMenuBook, MdNotificationsActive, MdOutlineAssessment, MdOutlineCalendarMonth, MdOutlineDirectionsBus, MdOutlineHotel, MdOutlineManageAccounts, MdPeopleAlt, MdSpaceDashboard, MdStarRate, MdQuiz, MdCampaign, MdReceiptLong, MdDiscount, MdSchool, MdBadge } from "react-icons/md";
import { IoIosStats, IoMdPeople } from "react-icons/io";
import { FaGraduationCap, FaUniversity, FaUsers } from "react-icons/fa";
import { RiSettings3Fill } from "react-icons/ri";
import { IoMdPerson } from "react-icons/io";
import { MdPayment } from "react-icons/md";
import { MdAssignment } from "react-icons/md";
import { IoStatsChartSharp } from "react-icons/io5";

import { MdOutlineAccountBalance } from "react-icons/md";

export const adminSideBarMenu: SideBarMenuItem[] = [
  {
    name: "Dashboard",
    link: "dashboard",
    icon: MdSpaceDashboard,
    rightsToView: ["admin",],
  },
  {
    name: "Department",
    link: "department",
    icon: MdOutlineAccountBalance,
    rightsToView: ["admin"],
  },
  {
    name: "University",
    link: "university",
    icon: FaGraduationCap,
    rightsToView: ["admin"],
  },
  {
    name: "Subject",
    link: "subject",
    icon: MdMenuBook,
    rightsToView: ["admin"],
  },
  {
    name: "Faculty",
    link: "faculty",
    icon: IoMdPeople,
    rightsToView: ["admin"],
  },
  {
    name: "Batches",
    link: "batches",
    icon: MdGroupWork,
    rightsToView: ["admin"],
  },
  {
    name: "Assign Roles",
    link: "assign-roles",
    icon: MdOutlineManageAccounts,
    rightsToView: ["admin"],
  },
  {
    name: "Student",
    link: "student",
    icon: IoMdPerson,
    rightsToView: ["admin"],
  },

  // ACADEMICS
  {
    name: "Timetable",
    link: "timetable",
    icon: MdOutlineCalendarMonth,
    rightsToView: ["admin"],
  },
  {
    name: "Exams & Assignments",
    link: "exams-assignments",
    icon: MdAssignment,
    rightsToView: ["admin"],
  },
  {
    name: "Previous Mark Migration",
    link: "previous-mark-migration",
    icon: MdAssessment,
    rightsToView: ["admin"],
  },

  // LOGISTICS
  {
    name: "Hostel",
    link: "hostel",
    icon: MdOutlineHotel,
    rightsToView: ["admin"],
  },
  {
    name: "Transportation",
    link: "transportation",
    icon: MdOutlineDirectionsBus,
    rightsToView: ["admin"],
  },
  {
    name: "College",
    link: "college",
    icon: FaUniversity,
    rightsToView: ["admin"],
  },

  // COMMUNICATION & REPORTS
  {
    name: "Push Notifications",
    link: "push-notifications",
    icon: MdCampaign,
    rightsToView: ["admin"],
  },
  {
    name: "Reports",
    link: "reports",
    icon: MdAssessment,
    rightsToView: ["admin"],
  },
];

export const sideBarMenu: SideBarMenuItem[] = [
  {
    name: "Dashboard",
    link: "dashboard",
    icon: MdSpaceDashboard,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "My Profile",
    link: "my-profile",
    icon: IoMdPerson,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "My Fees",
    link: "my-fees",
    icon: MdPayment,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "Attendance",
    link: "attendance",
    icon: IoIosStats,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "Assignments",
    link: "assignments",
    icon: MdAssignment,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "Study Materials",
    link: "study-materials",
    icon: MdMenuBook,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "Quizzes",
    link: "quizzes",
    icon: MdQuiz,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "Performance",
    link: "performance",
    icon: IoStatsChartSharp,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "University Results",
    link: "university-results",
    icon: RiSettings3Fill,
    rightsToView: ["admin", "student"],
  },
  {
    name: "Hostel & Transport",
    link: "hostel-and-trans",
    icon: MdOutlineAccountBalance,
    rightsToView: ["admin", "student"],
  },
  {
    name: "Settings",
    link: "settings",
    icon: RiSettings3Fill,
    rightsToView: ["admin", "student"],
  },
];

export const parentSideBarMenu: SideBarMenuItem[] = [
  {
    name: "Dashboard",
    link: "dashboard",
    icon: MdSpaceDashboard,
    rightsToView: ["admin", "faculty", "student", "parent"],
  },
  {
    name: "My Ward's Profile",
    link: "my-profile",
    icon: IoMdPerson,
    rightsToView: ["admin", "faculty", "student", "parent"],
  },
  {
    name: "My Ward's Fees",
    link: "my-fees",
    icon: MdPayment,
    rightsToView: ["admin", "faculty", "student", "parent"],
  },
  {
    name: "Attendance",
    link: "attendance",
    icon: IoIosStats,
    rightsToView: ["admin", "faculty", "parent"],
  },
  {
    name: "Assignments",
    link: "assignments",
    icon: MdAssignment,
    rightsToView: ["admin", "faculty", "parent"],
  },
  {
    name: "My ward's Performance",
    link: "performance",
    icon: IoStatsChartSharp,
    rightsToView: ["admin", "faculty", "parent"],
  },
  {
    name: "University Results",
    link: "university-results",
    icon: RiSettings3Fill,
    rightsToView: ["admin", "parent"],
  },
  {
    name: "Hostel & Transport",
    link: "hostel-and-trans",
    icon: MdOutlineAccountBalance,
    rightsToView: ["admin", "parent"],
  },
];

export const facultySideBarMenu: SideBarMenuItem[] = [
  {
    name: "Dashboard",
    link: "dashboard",
    icon: MdSpaceDashboard,
    rightsToView: ["faculty"],
  },
  {
    name: "My Batch",
    link: "my-batch",
    icon: MdGroups,
    rightsToView: ["faculty"],
  },
  {
    name: "Timetable",
    link: "timetable",
    icon: MdOutlineCalendarMonth,
    rightsToView: ["faculty"],
  },
  {
    name: "My Working Hours",
    link: "my-working-hours",
    icon: MdAccessTimeFilled,
    rightsToView: ["faculty"],
  },
  {
    name: "My Documents",
    link: "my-documents",
    icon: MdDescription,
    rightsToView: ["faculty"],
  },
  {
    name: "My Attendance",
    link: "my-attendance",
    icon: IoIosStats,
    rightsToView: ["faculty"],
  },
  {
    name: "My Previous Details",
    link: "my-previous-details",
    icon: MdHistory,
    rightsToView: ["faculty"],
  },
  {
    name: "My Ratings",
    link: "my-ratings",
    icon: MdStarRate,
    rightsToView: ["faculty"],
  },
  {
    name: "Evaluation",
    link: "evaluation",
    icon: MdAssignmentTurnedIn,
    rightsToView: ["faculty"],
  },
  {
    name: "Leave Management",
    link: "leave-management",
    icon: MdEventNote,
    rightsToView: ["faculty"],
  },
  {
    name: "Leave Approvals",
    link: "leave-approvals",
    icon: MdAssignmentTurnedIn,
    rightsToView: ["faculty"], // Filtered by role (HOD/Principal/Director) on the page
  },
  {
    name: "Student Leave Management",
    link: "student-leave-management",
    icon: MdPeopleAlt,
    rightsToView: ["faculty"],
  },
  {
    name: "Transport",
    link: "transport",
    icon: MdOutlineDirectionsBus,
    rightsToView: ["faculty"],
  },
  {
    name: "Message box (0)",
    link: "message-box",
    icon: MdMailOutline,
    rightsToView: ["faculty"],
  },
  {
    name: "Rules and Regulations",
    link: "rules-and-regulations",
    icon: MdGavel,
    rightsToView: ["faculty"],
  },
  {
    name: "Committees",
    link: "committees",
    icon: MdGroups,
    rightsToView: ["faculty"],
  },
  {
    name: "Exam",
    link: "exam",
    icon: MdAssignment,
    rightsToView: ["faculty"],
  },
  {
    name: "Study Materials",
    link: "study-materials",
    icon: MdMenuBook,
    rightsToView: ["faculty"],
  },
  {
    name: "Quizzes",
    link: "quizzes",
    icon: MdQuiz,
    rightsToView: ["faculty"],
  },
  {
    name: "Staff Appraisal",
    link: "staff-appraisal",
    icon: MdOutlineAssessment,
    rightsToView: ["faculty"],
  },
  {
    name: "File Storage",
    link: "file-storage",
    icon: MdFolder,
    rightsToView: ["faculty"],
  },
  {
    name: "Redirect to Admission",
    link: "redirect-to-admission",
    icon: MdExitToApp,
    rightsToView: ["faculty"],
  },
];

export const officeSideBarMenu: SideBarMenuItem[] = [
  {
    name: "Dashboard",
    link: "dashboard",
    icon: MdSpaceDashboard,
    rightsToView: ["office"],
  },
  {
    name: "Batch Fee Management",
    link: "batch-fees",
    icon: MdGroups,
    rightsToView: ["office"],
  },
  {
    name: "Hostel & Transport",
    link: "hostel-transport",
    icon: MdOutlineHotel,
    rightsToView: ["office"],
  },
  {
    name: "Student Fees",
    link: "student-fees",
    icon: MdReceiptLong,
    rightsToView: ["office"],
  },
  {
    name: "Fee Discounts",
    link: "fee-discounts",
    icon: MdDiscount,
    rightsToView: ["office"],
  },
  {
    name: "Scholarships",
    link: "scholarships",
    icon: MdSchool,
    rightsToView: ["office"],
  },
  {
    name: "Staff Directory",
    link: "staff",
    icon: MdBadge,
    rightsToView: ["office"],
  },
  {
    name: "Payment History",
    link: "payment-history",
    icon: MdPayment,
    rightsToView: ["office"],
  },
  {
    name: "Reports",
    link: "reports",
    icon: MdAssessment,
    rightsToView: ["office"],
  },
];


export const COLLECTIONS = {
  ADMINS: "admins",
  ASSIGNMENTS: "assignments",
  ATTENDANCE: "attendance",
  BATCHES: "batches",
  CONVERSATIONS: "conversations",
  DEPARTMENTS: "departments",
  EVALUATION_REPORTS: "evaluation_reports",
  FACULTY: "faculty",
  FACULTY_ATTENDANCE: "faculty_attendance",
  FACULTY_DOCUMENTS: "faculty_documents",
  FACULTY_EXPERIENCE: "faculty_experience",
  FACULTY_FILES: "faculty_files",
  FACULTY_LEAVES: "faculty_leaves",
  FACULTY_PROFILES: "faculty_profiles",
  FACULTY_TRANSPORT: "faculty_transport",
  LEAVE_BALANCES: "leave_balances",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  PARENTS: "parents",
  QUIZZES: "quizzes",
  QUIZ_SUBMISSIONS: "quiz_submissions",
  SETTINGS: "settings",
  STUDENT_LEAVES: "student_leaves",
  STUDENT_SERVICES: "student_services",
  STUDENTS: "students",
  STUDY_MATERIALS: "study_materials",
  SUBJECTS: "subjects",
  TIMETABLES: "timetables",
  OFFICE_STAFF: "office_staff",
  FEE_DISCOUNTS: "fee_discounts",
  SCHOLARSHIPS: "scholarships",
  FEES: "fees",
  PAYMENT_HISTORY: "payment_history",
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// --- Firebase Data Structures ---

export interface Admin {
  uid?: string; // id is usually the document ID
  email: string;
  avatar: string; // URL of the admin avatar
  role: 'admin'; // Or list other roles if you have them e.g. 'admin' | 'superadmin'
}

export interface Assignment {
  id?: string; // id is usually the document ID
  title: string;
  description: string;
  course: string;
  grade: string;
  status: string; // e.g. "Graded"
  studentId: string;
  dueDate: any; // Firebase Timestamp
  createdAt: any; // Firebase Timestamp
}

export interface Attendance {
  id: string; // Typically corresponds to date + batchId + subjectId
  batchId: string;
  subjectId: string;
  facultyId: string;
  date: string;
  records: {
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Batch {
  id?: string; // id is usually the document ID
  name: string; // e.g., "CSE 2024-2028"
  academicYear: string;
  department: string;
  semester: string;
  status: string; // e.g. "active"
  tutor: string;
  createdAt: string; // ISO String based on data
}

export interface Conversation {
  id?: string;
  lastMessage: string;
  lastMessageTimestamp: any; // Firebase Timestamp
  participants: string[];
  participantsDetails: {
    name: string;
    role: string;
    uid: string;
  }[];
  unreadCounts: Record<string, number>;
}

export interface Department {
  id?: string; // id is usually the document ID
  code: string;
  courses: any[]; // Or define a specific type if known
  createdAt: string; // ISO String based on data
  faculty: any[]; // Or define a specific type if known
  hod: string;
  name: string;
  status: string; // e.g. "active"
  students: number;
}

export interface EvaluationReport{
  id?: string;
  cgpa: number;
  color: string;
  createdAt: any; // Firebase Timestamp
  facultyId: string;
  overallGrade: string;
  percentage: number;
  regNumber: string;
  status: string; // e.g. "passed"
  student: string;
  studentId: string;
  subject: string;
}

export interface Faculty {
  uid: string;
  accessStatus: string; // e.g. "active"
  authUid: string;
  createdAt: string; // ISO String based on data
  department: string;
  designation: string;
  email: string;
  name: string;
  phone: string;
  role: string; // e.g. "Tutor"
  updatedAt: string; // ISO String based on data
}

export interface FacultyAttendance {
  id?: string;
  checkInTime: string;
  checkOutTime: string;
  createdAt: string;
  date: string;
  facultyId: string;
}

export interface FacultyDocument {
  id?: string;
  createdAt: string;
  facultyId: string;
  fileName: string;
  name: string;
  status: string; // e.g. "pending"
  type: string; // e.g. "Experience Certificate"
  uploadDate: string;
  url: string;
}

export interface FacultyExperience {
  id?: string;
  createdAt: string;
  entryType: string; // e.g. "institution"
  facultyId: string;
  from: string;
  institution: string;
  role: string;
  to: string;
  updatedAt: string;
}

export interface FacultyFile {
  id?: string; // id is usually the document ID
  createdAt: any; // Firebase Timestamp
  folder: string; // e.g. "root"
  name: string;
  ownerId: string;
  size: number;
  type: string; // e.g. "image/jpeg"
  url: string;
}

export interface FacultyLeave {
  id?: string;
  appliedDate: string;
  approvedBy: string;
  createdAt: any; // Firebase Timestamp
  days: number;
  facultyId: string;
  facultyName: string;
  facultyDepartment: string;
  fromDate: string;
  reason: string;
  status: string; // e.g. "pending_hod", "pending_principal", "pending_director", "approved", "rejected", "cancelled"
  toDate: string;
  type: string; // e.g. "CL"
  // Approval workflow fields
  currentApprover: 'hod' | 'principal' | 'director' | 'none';
  isLateSubmission: boolean; // true if submitted after 8:30 AM of leave date
  submittedAt: string; // ISO timestamp of submission
  // HOD action
  hodId?: string;
  hodName?: string;
  hodStatus?: 'pending' | 'recommended' | 'rejected';
  hodRemarks?: string;
  hodActionDate?: string;
  // Principal action
  principalId?: string;
  principalName?: string;
  principalStatus?: 'pending' | 'approved' | 'rejected' | 'disabled';
  principalRemarks?: string;
  principalActionDate?: string;
  // Director action
  directorId?: string;
  directorName?: string;
  directorStatus?: 'pending' | 'approved' | 'rejected';
  directorRemarks?: string;
  directorActionDate?: string;
}

export interface FacultyProfile {
  id?: string; // id is usually the document ID (faculty UID)
  bio: string;
  department: string;
  designation: string;
  displayName: string;
  email: string;
  joiningDate: any; // Firebase Timestamp
  phoneNumber: string;
  photoUrl: string;
}

export interface FacultyTransport {
  id?: string; // id is usually the document ID
  assignedRoute?: Record<string, any>;
  dropPoint: string;
  dueDate: string;
  facultyId: string;
  feeDetails?: Record<string, any>;
  monthlyFee: string;
  name: string;
  passNumber: string;
  paymentDate: string;
  pickupPoint: string;
  routeNumber: string;
  status: string; // e.g. "active" or "paid"
  transportSchedule?: any[]; // Array of transport schedules maps
  validity: string;
}

export interface LeaveBalance {
  id?: string; // Document ID
  balance: number;
  code: string; // e.g., "OD"
  description: string;
  facultyId: string;
  name: string; // e.g. "On Duty"
}

export interface Message {
  id?: string; // Document ID
  content: string;
  conversationId: string;
  readBy: string[];
  senderId: string;
  senderName: string;
  timestamp: any; // Firebase Timestamp
  type: string; // e.g. "text"
}

export interface Notification {
  id?: string; // Document ID
  createdAt: string;
  message: string;
  read: boolean;
  title: string;
  type: string; // e.g. "info"
}

export interface Parent {
  id?: string; // Document ID
  address: string;
  email: string;
  name: string;
  occupation: string;
  phone: string;
  photoUrl: string;
}

export interface Settings {
  id: string; // Usually a single document e.g., "app_settings"
  maintenanceMode: boolean;
  academicYear: string;
  currentSemesterType: 'odd' | 'even';
  features?: Record<string, boolean>; // Togglable features
  updatedAt?: string;
}

export interface StudentLeave {
  id?: string; // Document ID
  appliedDate: string;
  approvedBy: string;
  approvedDate: string;
  createdAt: any; // Firebase Timestamp
  days: number;
  fromDate: string;
  reason: string;
  regNumber: string;
  status: string; // e.g. "rejected"
  student: string;
  toDate: string;
  type: string; // e.g. "Sick Leave"
}

export interface StudentService {
  id?: string; // Document ID
  hostel?: Record<string, any>;
  transport?: Record<string, any>;
}

export interface Student {
  uid?: string; // Document ID
  address?: Record<string, any>;
  attendance: string;
  batch: string;
  createdAt: string;
  department: string;
  email: string;
  emailNotifications: boolean;
  info?: Record<string, any>;
  sessions?: any[]; // Array of session maps
  settings?: Record<string, any>;
  status: string; // e.g., "active"
}

export interface Subject {
  id?: string; // Document ID
  code: string; // e.g., "CSE301"
  createdAt: string;
  credits: number;
  department: string;
  name: string;
  semester: string; // e.g., "3rd Semester"
  status: string; // e.g., "active"
  type: string; // e.g., "Core"
}

export interface Timetable {
  id?: string; // Document ID
  batch: string;
  createdAt: any; // Firebase Timestamp
  schedule?: Record<string, string[]>; // e.g., map of day (e.g., "Monday") to an array of subject codes/names
}

export interface OfficeStaff {
  uid?: string;
  email: string;
  name: string;
  avatar?: string;
  role: string; // e.g. "office"
}

export interface FeeRecord {
  id?: string;
  studentId: string;
  studentName: string;
  regNumber: string;
  batch: string;
  department: string;
  feeType: string; // e.g. "Tuition", "Hostel", "Transport", "Lab", "Exam"
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue" | "partial";
  paidAmount: number;
  paidDate?: string;
  semester: string;
  academicYear: string;
  createdAt: any;
  updatedAt?: any;
}

export interface FeeDiscount {
  id?: string;
  studentId: string;
  studentName: string;
  regNumber: string;
  batch: string;
  department: string;
  discountType: string; // e.g. "Merit", "Need-based", "Sibling", "Staff Ward", "Sports"
  percentage: number;
  amount: number;
  reason: string;
  status: "active" | "expired" | "revoked";
  appliedFrom: string;
  appliedTo: string;
  approvedBy: string;
  createdAt: any;
}

export interface Scholarship {
  id?: string;
  name: string;
  description: string;
  provider: string; // e.g. "Government", "Institution", "Private", "NGO"
  amount: number;
  eligibility: string;
  status: "active" | "closed" | "upcoming";
  applicationDeadline: string;
  academicYear: string;
  recipientCount: number;
  recipients?: {
    studentId: string;
    studentName: string;
    regNumber: string;
    amount: number;
    status: "awarded" | "disbursed" | "pending";
  }[];
  createdAt: any;
}
