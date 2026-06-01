import Link from 'next/link';
import { useRouter } from 'next/router';

interface AdminSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const navItems = [
  {
    label: 'Dashboard',
    section: 'dashboard',
    href: '/admin/dashboard',
    isClientSide: true,
    icon: (
      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6m-6 0H7m6 0v6m0 0h6m-6 0H7" /></svg>
    ),
  },
  {
    label: 'Form Versions',
    section: 'form-versions',
    href: '/admin/form-versions',
    isClientSide: false,
    icon: (
      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    ),
  },
  {
    label: 'Admin Users',
    section: 'admin-users',
    href: '/admin/admin-users',
    isClientSide: false,
    icon: (
      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    ),
  },
  {
    label: 'Support Tickets',
    section: 'support-tickets',
    href: '/admin/support-tickets',
    isClientSide: false,
    icon: (
      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" /></svg>
    ),
  },
  {
    label: 'Analytics',
    section: 'analytics',
    href: '/admin/analytics',
    isClientSide: false,
    icon: (
      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    ),
  },
];

export default function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const router = useRouter();

  const handleNavClick = (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (item.isClientSide) {
      // Client-side navigation for dashboard
      if (onSectionChange) {
        onSectionChange(item.section);
      }
    } else {
      // Page navigation for admin-users and analytics
      router.push(item.href);
    }
  };

  return (
    <aside className="h-screen bg-white border-r w-64 flex-shrink-0 hidden md:flex flex-col py-6 px-4">
      <div className="mb-8">
        <span className="text-2xl font-bold text-blue-700">Admin Panel</span>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              onClick={(e) => handleNavClick(item, e)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors font-medium text-base w-full text-left ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto pt-8 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Black Sustainability Inc.
      </div>
    </aside>
  );
} 