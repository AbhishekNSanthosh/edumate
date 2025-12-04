import { MdAccessTimeFilled, MdAssessment, MdAssignmentTurnedIn, MdDescription, MdEventNote, MdExitToApp, MdFolder, MdGavel, MdGroups, MdGroupWork, MdHistory, MdMailOutline, MdMenuBook, MdOutlineAssessment, MdOutlineCalendarMonth, MdOutlineDirectionsBus, MdOutlineHotel, MdOutlineManageAccounts, MdPeopleAlt, MdSpaceDashboard, MdStarRate } from "react-icons/md";
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
    rightsToView: ["admin", "faculty"],
  },
  {
    name: "Assignments",
    link: "assignments",
    icon: MdAssignment,
    rightsToView: ["admin", "faculty"],
  },
  {
    name: "Performance",
    link: "performance",
    icon: IoStatsChartSharp,
    rightsToView: ["admin", "faculty"],
  },
  {
    name: "University Results",
    link: "university-results",
    icon: RiSettings3Fill,
    rightsToView: ["admin"],
  },
  {
    name: "Hostel & Transport",
    link: "hostel-and-trans",
    icon: MdOutlineAccountBalance,
    rightsToView: ["admin"],
  },
];

export const parentSideBarMenu: SideBarMenuItem[] = [
  {
    name: "Dashboard",
    link: "dashboard",
    icon: MdSpaceDashboard,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "My Ward's Profile",
    link: "my-profile",
    icon: IoMdPerson,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "My Ward's Fees",
    link: "my-fees",
    icon: MdPayment,
    rightsToView: ["admin", "faculty", "student"],
  },
  {
    name: "Attendance",
    link: "attendance",
    icon: IoIosStats,
    rightsToView: ["admin", "faculty"],
  },
  {
    name: "Assignments",
    link: "assignments",
    icon: MdAssignment,
    rightsToView: ["admin", "faculty"],
  },
  {
    name: "My ward's Performance",
    link: "performance",
    icon: IoStatsChartSharp,
    rightsToView: ["admin", "faculty"],
  },
  {
    name: "University Results",
    link: "university-results",
    icon: RiSettings3Fill,
    rightsToView: ["admin"],
  },
  {
    name: "Hostel & Transport",
    link: "hostel-and-trans",
    icon: MdOutlineAccountBalance,
    rightsToView: ["admin"],
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
