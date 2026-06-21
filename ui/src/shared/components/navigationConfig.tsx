import type { ReactNode } from 'react'
import { BsBarChart, BsBriefcase, BsBuilding, BsCalendarCheck, BsChatDots, BsFileEarmarkText, BsGear, BsGrid, BsPeople, BsPersonBadge, BsShieldCheck } from 'react-icons/bs'
import { FiActivity, FiChevronRight, FiLayers, FiUsers } from 'react-icons/fi'

export type HorizontalMenuItem = {
  key: string
  label: string
  to?: string
  icon: ReactNode
  children?: HorizontalMenuItem[]
}

export const buildHorizontalMenu = (dashboardPath: string): HorizontalMenuItem[] => [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: dashboardPath,
    icon: <BsGrid />,
  },
  {
    key: 'master-management',
    label: 'Master Management',
    icon: <BsBriefcase />,
    children: [
      { key: 'users', label: 'Users', to: '/users', icon: <FiUsers /> },
      { key: 'teams', label: 'Teams', to: '/users', icon: <BsPeople /> },
      { key: 'departments', label: 'Departments', to: '/users', icon: <BsBuilding /> },
      { key: 'designations', label: 'Designations', to: '/users', icon: <BsPersonBadge /> },
      { key: 'employees', label: 'Employees', to: '/users', icon: <FiUsers /> },
      {
        key: 'roles',
        label: 'Roles',
        to: '/roles',
        icon: <BsShieldCheck />,
        children: [
          { key: 'role-admin', label: 'Admin', to: '/roles', icon: <FiChevronRight /> },
          { key: 'role-manager', label: 'Manager', to: '/roles', icon: <FiChevronRight /> },
          { key: 'role-recruiter', label: 'Recruiter', to: '/roles', icon: <FiChevronRight /> },
        ],
      },
    ],
  },
  {
    key: 'candidate-management',
    label: 'Candidate Management',
    icon: <BsPeople />,
    children: [
      { key: 'candidates', label: 'Candidates', to: '/candidates', icon: <FiUsers /> },
      { key: 'candidate-marketing', label: 'Candidate Marketing', to: '/candidates', icon: <FiLayers /> },
      { key: 'marketing-profiles', label: 'Marketing Profiles', to: '/candidates', icon: <BsFileEarmarkText /> },
      { key: 'profile-change-requests', label: 'Profile Change Requests', to: '/candidates', icon: <BsChatDots /> },
    ],
  },
  {
    key: 'activities',
    label: 'Activities',
    icon: <FiActivity />,
    children: [
      { key: 'tasks', label: 'Tasks', to: '/tasks', icon: <BsCalendarCheck /> },
      { key: 'daily-applications', label: 'Daily Applications', to: '/tasks', icon: <BsFileEarmarkText /> },
      { key: 'screenings', label: 'Screenings', to: '/tasks', icon: <BsShieldCheck /> },
      { key: 'interviews', label: 'Interviews', to: '/tasks', icon: <BsPeople /> },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: <BsBarChart />,
    children: [
      { key: 'task-reports', label: 'Task Reports', to: '/reports/tasks', icon: <BsBarChart /> },
      { key: 'candidate-performance', label: 'Candidate Performance', to: '/reports/candidate-performance', icon: <BsBarChart /> },
      { key: 'recruiter-performance', label: 'Recruiter Performance', to: '/reports/candidates', icon: <BsBarChart /> },
      { key: 'team-performance', label: 'Team Performance', to: '/manager/reports/team-workload', icon: <BsBarChart /> },
      { key: 'feedback-report', label: 'Feedback Report', to: '/reports/feedback-report', icon: <BsChatDots /> },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <BsGear />,
    children: [
      { key: 'role-settings', label: 'Roles & Permissions', to: '/roles', icon: <BsShieldCheck /> },
      { key: 'user-settings', label: 'User Settings', to: '/users', icon: <FiUsers /> },
    ],
  },
]
