import React, { useState } from 'react';
import { CareModal } from '@/components/feedback/CareModal';
import { CareInput } from '@/components/ui/CareInput';
import { CareSelect } from '@/components/ui/CareSelect';
import { CareButton } from '@/components/ui/CareButton';
import { PermissionSelector } from './PermissionSelector';
import type { InviteCareMemberRequest, CarePermission, CareMemberRole } from '@/types/care-team';
import { UserPlus } from 'lucide-react';

export interface InviteCareMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (req: InviteCareMemberRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const ROLES: { value: CareMemberRole; label: string }[] = [
  { value: 'FAMILY', label: 'Family Member (Daughter, Son, Sibling)' },
  { value: 'PRIMARY_GUARDIAN', label: 'Primary Care Guardian' },
  { value: 'FRIEND_NEIGHBOR', label: 'Trusted Friend / Neighbor' },
  { value: 'PROFESSIONAL_CAREGIVER', label: 'Professional Caregiver' },
  { value: 'VOLUNTEER', label: 'Community Volunteer' },
];

export const InviteCareMemberModal: React.FC<InviteCareMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  isSubmitting = false,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Son');
  const [role, setRole] = useState<CareMemberRole>('FAMILY');
  const [permissions, setPermissions] = useState<CarePermission[]>([
    'CHECK_INS',
    'APPOINTMENTS',
    'TRANSPORTATION',
  ]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please enter both name and mobile phone number.');
      return;
    }
    if (permissions.length === 0) {
      setError('Please select at least one permission that this person can help with.');
      return;
    }
    setError(null);

    await onInvite({
      parentId: 'p-1',
      name,
      phone,
      relationship,
      role,
      permissions,
    });

    setName('');
    setPhone('');
    setPermissions(['CHECK_INS', 'APPOINTMENTS', 'TRANSPORTATION']);
    onClose();
  };

  return (
    <CareModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Someone You Trust"
      description="Invite a family member, trusted neighbor, or caregiver to join your care circle."
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left pt-1">
        {error && (
          <div className="p-3 bg-[#FEF2F2] border border-[#EF4444]/30 rounded-xl text-xs font-bold text-[#DC2626]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CareInput
            label="Person's Name"
            placeholder="e.g. Kumar Patel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputSize="md"
          />

          <CareInput
            label="Mobile Phone Number"
            placeholder="(555) 987-6543"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputSize="md"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CareInput
            label="Relationship to You"
            placeholder="e.g. Neighbor, Daughter"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            inputSize="md"
          />

          <CareSelect
            label="Care Role"
            options={ROLES}
            value={role}
            onChange={(e) => setRole(e.target.value as CareMemberRole)}
            inputSize="md"
          />
        </div>

        {/* Task-Scoped Permission Selector */}
        <PermissionSelector
          selectedPermissions={permissions}
          onChange={setPermissions}
          disabled={isSubmitting}
        />

        <div className="pt-2">
          <CareButton
            type="submit"
            variant="primary"
            size="parent"
            fullWidth
            loading={isSubmitting}
            icon={<UserPlus className="w-6 h-6" />}
          >
            Send Care Team Invitation
          </CareButton>
        </div>
      </form>
    </CareModal>
  );
};
