"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const displayName = user?.name || user?.username || "User";
  const displayId = user?.id
    ? `STU-${String(user.id).padStart(4, "0")}`
    : "Guest";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 text-slate-700 hover:bg-slate-50 rounded-full transition-all border border-slate-200 bg-white shadow-sm hover:shadow"
      >
        <div className="w-8 h-8 bg-[#4F46E5] text-white rounded-full flex items-center justify-center shadow-inner">
          {user?.isAdmin ? (
            <Shield className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>
        <div className="hidden sm:flex flex-col items-start mr-1">
          <span className="text-sm font-bold leading-tight text-slate-800">
            {displayName}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            ID: {displayId}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 mb-1 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4F46E5] text-white rounded-full flex items-center justify-center shadow-inner flex-shrink-0">
              {user?.isAdmin ? (
                <Shield className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">
                {displayName}
              </p>
              <p className="text-xs font-medium text-slate-500 truncate">
                {user?.email || user?.username}
              </p>
              {user?.isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>
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
