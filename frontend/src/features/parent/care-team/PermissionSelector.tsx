import React from 'react';
import type { CarePermission } from '@/types/care-team';
import {
  ShieldCheck,
  Pill,
  Calendar,
  Car,
  ShoppingBag,
  History,
  CheckCircle2,
} from 'lucide-react';

export interface PermissionSelectorProps {
  selectedPermissions: CarePermission[];
  onChange: (permissions: CarePermission[]) => void;
  disabled?: boolean;
}

const PERMISSION_OPTIONS: { permission: CarePermission; title: string; subtitle: string; icon: React.ReactNode }[] = [
  { permission: 'CHECK_INS', title: 'Daily Safety Check-Ins', subtitle: 'View morning check-in responses & safety alerts', icon: <ShieldCheck className="w-5 h-5 text-[#16866B]" /> },
  { permission: 'MEDICATION', title: 'Medication Reminders', subtitle: 'View medication schedule & refill status', icon: <Pill className="w-5 h-5 text-[#16866B]" /> },
  { permission: 'APPOINTMENTS', title: 'Doctor Appointments', subtitle: 'View upcoming doctor & specialist visits', icon: <Calendar className="w-5 h-5 text-[#0284C7]" /> },
  { permission: 'TRANSPORTATION', title: 'Transportation & Rides', subtitle: 'Coordinate rides to medical appointments', icon: <Car className="w-5 h-5 text-[#8B5CF6]" /> },
  { permission: 'ERRANDS', title: 'Grocery & Pharmacy Errands', subtitle: 'Help with prescription pickups & shopping', icon: <ShoppingBag className="w-5 h-5 text-[#D97706]" /> },
  { permission: 'CARE_HISTORY', title: 'Care Activity Log', subtitle: 'View past check-ins & completed care tasks', icon: <History className="w-5 h-5 text-[#10B981]" /> },
];

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  selectedPermissions,
  onChange,
  disabled = false,
}) => {
  const togglePermission = (perm: CarePermission) => {
    if (disabled) return;
    const exists = selectedPermissions.includes(perm);
    if (exists) {
      onChange(selectedPermissions.filter((p) => p !== perm));
    } else {
      onChange([...selectedPermissions, perm]);
    }
  };

  return (
    <div className="space-y-3 text-left">
      <div className="space-y-0.5">
        <label className="block font-bold text-[#1D2926] text-base">
          What can this person help you with?
        </label>
        <p className="text-xs text-[#66736F]">
          Permissions are task-scoped for safety and privacy. Select the specific care responsibilities.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PERMISSION_OPTIONS.map((opt) => {
          const isSelected = selectedPermissions.includes(opt.permission);
          return (
            <button
              key={opt.permission}
              type="button"
              onClick={() => togglePermission(opt.permission)}
              disabled={disabled}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 focus-care flex items-start gap-3 cursor-pointer ${
                isSelected
                  ? 'bg-[#E8F4EF] border-[#16866B] text-[#16866B]'
                  : 'bg-white border-[#E5E7E5] text-[#1D2926] hover:border-[#16866B]/40'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-care-sm mt-0.5">
                {opt.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#1D2926]">{opt.title}</p>
                <p className="text-xs text-[#66736F] leading-tight mt-0.5">{opt.subtitle}</p>
              </div>

              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? 'bg-[#16866B] border-[#16866B] text-white' : 'border-[#8E9B97]'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
