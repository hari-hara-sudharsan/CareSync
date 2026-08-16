import React from 'react';
import type { Appointment } from '@/types';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { Calendar, MapPin, User, Car } from 'lucide-react';

export interface AppointmentCardProps {
  appointment: Appointment;
  onRequestRide?: (id: string) => void;
  className?: string;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onRequestRide,
  className,
}) => {
  return (
    <CareCard variant="default" padding="md" className={className}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 shadow-care-sm">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
                {appointment.type}
              </span>
              <h3 className="text-xl font-bold text-[#1D2926] leading-tight">
                {appointment.title}
              </h3>
              <p className="text-sm font-medium text-[#66736F] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#16866B]" /> {appointment.doctorName}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-[#66736F] pt-2 border-t border-[#F0ECE1]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#16866B]" />
            <span className="font-semibold text-[#1D2926]">{appointment.dateTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#16866B]" />
            <span>{appointment.location}</span>
          </div>
          {appointment.notes && (
            <p className="text-xs text-[#8E9B97] italic">{appointment.notes}</p>
          )}
        </div>

        {appointment.transportRequired && onRequestRide && (
          <div className="pt-2 flex items-center justify-between bg-[#FAF7F1] p-3 rounded-xl border border-[#E5E7E5]">
            <span className="text-xs font-medium text-[#1D2926] flex items-center gap-1.5">
              <Car className="w-4 h-4 text-[#8B5CF6]" /> Transport needed?
            </span>
            <CareButton
              variant="pill"
              size="sm"
              icon={<Car className="w-4 h-4" />}
              onClick={() => onRequestRide(appointment.id)}
            >
              Request Volunteer Ride
            </CareButton>
          </div>
        )}
      </div>
    </CareCard>
  );
};
