import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { api } from '../../lib/api';
import type { Notification } from '../../types/api';

function getNavLinks(role: string) {
  if (role === 'HR') {
    return [
      { to: '/hr/dashboard', label: 'Dashboard' },
      { to: '/hr/queue', label: 'Approval Queue' },
      { to: '/hr/requests', label: 'All Requests' },
      { to: '/hr/employees', label: 'Employees' },
      { to: '/hr/payroll', label: 'Payroll' },
    ];
  }
  if (role === 'MANAGER') {
    return [
      { to: '/manager/dashboard', label: 'Dashboard' },
      { to: '/manager/queue', label: 'Approval Queue' },
      { to: '/manager/calendar', label: 'Team Calendar' },
    ];
  }
  return [
    { to: '/employee/dashboard', label: 'Dashboard' },
    { to: '/employee/apply', label: 'Apply Leave' },
    { to: '/employee/requests', label: 'My Requests' },
    { to: '/employee/coverage', label: 'Coverage' },
    { to: '/employee/payroll', label: 'Pay Impact' },
  ];
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/me/notifications'),
    refetchInterval: 45000,
    enabled: !!user,
  });

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;
  const navLinks = getNavLinks(user?.role ?? 'EMPLOYEE');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const roleLabel: Record<string, string> = {
    EMPLOYEE: 'Employee',
    MANAGER: 'Manager',
    HR: 'HR Admin',
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#E4E7EC] sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-6 flex items-stretch h-14 gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#0B6E6E] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2.5" width="12" height="2" rx="1" fill="white"/>
                <rect x="2" y="7" width="8" height="2" rx="1" fill="white"/>
                <rect x="2" y="11.5" width="10" height="2" rx="1" fill="white"/>
              </svg>
            </div>
            <span className="text-base font-semibold text-[#101828] tracking-tight">LeaveFlow</span>
          </div>

          {/* Nav Links */}
          <nav className="flex items-stretch gap-0 flex-1" role="navigation" aria-label="Main navigation">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center px-3 text-sm font-medium border-b-2 transition-colors duration-[140ms] ${
                    isActive
                      ? 'border-[#0B6E6E] text-[#0B6E6E]'
                      : 'border-transparent text-[#475467] hover:text-[#101828] hover:border-[#D0D5DD]'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications Bell */}
            <button
              id="notifications-bell"
              aria-label={`Notifications, ${unreadCount} unread`}
              className="relative w-9 h-9 flex items-center justify-center rounded-[6px] text-[#475467] hover:bg-[#F5F6F8] transition-colors"
              onClick={() => {}}
            >
              <Bell size={18} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0B6E6E] rounded-full" />
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                id="user-menu-trigger"
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] hover:bg-[#F5F6F8] transition-colors"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
              >
                <InitialsAvatar name={user?.fullName ?? 'U'} size="sm" />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold text-[#101828]">{user?.fullName}</span>
                  <span className="text-[11px] text-[#667085]">{roleLabel[user?.role ?? '']}</span>
                </div>
                <ChevronDown size={14} className="text-[#667085]" />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#E4E7EC] rounded-[10px] py-1 z-20"
                    style={{ boxShadow: '0 4px 12px rgba(16,24,40,0.1)' }}
                    role="menu"
                  >
                    <div className="px-3 py-2.5 border-b border-[#F2F4F7]">
                      <p className="text-sm font-semibold text-[#101828]">{user?.fullName}</p>
                      <p className="text-xs text-[#667085]">{user?.email}</p>
                      <p className="text-xs text-[#0B6E6E] font-medium mt-0.5">{roleLabel[user?.role ?? '']}</p>
                    </div>
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#B42318] hover:bg-[#FEF3F2] transition-colors"
                      role="menuitem"
                    >
                      <LogOut size={15} strokeWidth={1.5} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
