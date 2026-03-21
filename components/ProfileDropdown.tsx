'use client';

import { useState, useRef, useEffect } from 'react';
import { User, KeyRound, LogOut, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 text-slate-700 hover:bg-slate-50 rounded-full transition-all border border-slate-200 bg-white shadow-sm hover:shadow"
      >
        <div className="w-8 h-8 bg-[#4F46E5] text-white rounded-full flex items-center justify-center shadow-inner">
          <User className="w-4 h-4" />
        </div>
        <div className="hidden sm:flex flex-col items-start mr-1">
          <span className="text-sm font-bold leading-tight text-slate-800">John Doe</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ID: STU-8492</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 mb-1 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4F46E5] text-white rounded-full flex items-center justify-center shadow-inner flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">John Doe</p>
              <p className="text-xs font-medium text-slate-500 truncate">ID: STU-8492</p>
            </div>
          </div>
          
          <div className="px-2 py-1 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
              <KeyRound className="w-4 h-4" />
              Change Password
            </button>
          </div>
          
          <div className="px-2 mt-1 pt-1 border-t border-slate-100">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
