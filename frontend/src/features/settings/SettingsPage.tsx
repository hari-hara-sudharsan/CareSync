import React, { useState, useEffect } from 'react';
import { CareTopBar } from '@/components/navigation/CareTopBar';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { settingsService, type UserSettingsResponse } from '@/services/settingsService';
import {
  User,
  ShieldCheck,
  Bell,
  Lock,
  Clock,
  Mail,
  Phone,
  Save,
  CheckCircle2,
  KeyRound,
  FileText,
} from 'lucide-react';

interface SettingsPageProps {
  onNavigate?: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<UserSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form edit state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getUserSettings();
      setSettings(data);
      setFullName(data.account.full_name || '');
      setEmail(data.account.email || '');
      setTimezone(data.account.timezone || 'America/New_York (EST)');
    } catch {
      console.warn('Failed to load user settings');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsService.updateUserSettings({
        full_name: fullName,
        email: email,
        timezone: timezone,
      });
      if (res.success) {
        showToast('Account preferences updated in PostgreSQL ✓');
        await loadSettings();
      }
    } catch {
      showToast('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] pb-24 font-sans selection:bg-[#E8F4EF]">
      {/* Top Bar Navigation */}
      <CareTopBar
        userName={settings?.account.full_name || 'CareSync User'}
        userRole={`${settings?.account.role || 'Member'} Settings`}
        onSettingsClick={() => onNavigate ? onNavigate('/settings') : undefined}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Header Title */}
        <div className="space-y-1 text-left">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3.5 py-1 rounded-full border border-[#16866B]/20">
              Account & System Preferences
            </span>
            {settings?.account.is_verified && (
              <CareBadge variant="success">✓ Verified Session</CareBadge>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
            Settings & Security Controls
          </h1>
          <p className="text-base text-[#66736F]">
            Manage your authenticated profile, security parameters, notification preferences, and privacy parameters.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <CareSkeleton variant="card" className="h-44" />
            <CareSkeleton variant="card" className="h-44" />
            <CareSkeleton variant="card" className="h-44" />
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Section 1: Account Profile Settings */}
            <CareCard variant="bordered" padding="lg" className="border-2 border-[#E5E7E5] shadow-care-sm space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#E5E7E5]">
                <div className="w-10 h-10 rounded-xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center font-bold">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1D2926]">Account Profile</h3>
                  <p className="text-xs text-[#66736F]">Authoritative PostgreSQL account details for {settings.account.role}</p>
                </div>
              </div>

              <form onSubmit={handleSaveAccountSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-[#1D2926] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#16866B]" /> Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAF7F1] text-sm font-semibold text-[#1D2926] focus-care"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-[#1D2926] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#16866B]" /> Verified Phone Number
                    </label>
                    <input
                      type="text"
                      value={settings.account.phone}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-slate-100 text-sm font-semibold text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-400">Cryptographically bound via SMS OTP.</span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-[#1D2926] flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#16866B]" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@caresync.org"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAF7F1] text-sm font-semibold text-[#1D2926] focus-care"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-[#1D2926] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#16866B]" /> System Timezone
                    </label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAF7F1] text-sm font-semibold text-[#1D2926] focus-care"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <CareButton
                    variant="primary"
                    size="sm"
                    disabled={saving}
                    icon={<Save className="w-4 h-4" />}
                    type="submit"
                  >
                    {saving ? 'Saving to Database...' : 'Save Profile Changes'}
                  </CareButton>
                </div>
              </form>
            </CareCard>

            {/* Section 2: Security & Authentication Parameters */}
            <CareCard variant="bordered" padding="lg" className="border-2 border-[#E5E7E5] shadow-care-sm space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#E5E7E5]">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1D2926]">Security & Session Identity</h3>
                  <p className="text-xs text-[#66736F]">Active session credentials and authentication safeguards</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-2xl bg-[#FAF7F1] border border-[#E5E7E5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#66736F]">Authentication Strategy</span>
                    <CareBadge variant="success">ACTIVE</CareBadge>
                  </div>
                  <div className="text-sm font-extrabold text-[#1D2926] flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#16866B]" /> {settings.security.otp_delivery_method}
                  </div>
                  <p className="text-xs text-[#66736F]">5-minute cryptographically generated OTP with 60-second cooldown and 5-attempt rate limit lockout.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F1] border border-[#E5E7E5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#66736F]">Session Token</span>
                    <CareBadge variant="info">{settings.security.token_type}</CareBadge>
                  </div>
                  <div className="text-sm font-extrabold text-[#1D2926] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Authorized Role: {settings.account.role}
                  </div>
                  <p className="text-xs text-[#66736F]">Stateful JWT verified against PostgreSQL backend on every API transaction.</p>
                </div>
              </div>
            </CareCard>

            {/* Section 3: Notification Delivery Preferences */}
            <CareCard variant="bordered" padding="lg" className="border-2 border-[#E5E7E5] shadow-care-sm space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#E5E7E5]">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1D2926]">Notification Channels</h3>
                  <p className="text-xs text-[#66736F]">Real delivery channels backed by NotificationRecord pipeline</p>
                </div>
              </div>

              <div className="space-y-3 text-left">
                {[
                  { title: 'SMS Care Alerts', desc: 'Instant SMS notifications when care requests change status', active: settings.notifications.sms_alerts },
                  { title: 'In-App Push Drawer Notifications', desc: 'Real-time updates in the CareSync header drawer', active: settings.notifications.push_notifications },
                  { title: 'Emergency Escalation Alerts', desc: 'Priority notifications for critical care escalations', active: settings.notifications.emergency_escalation_sms },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF7F1] border border-[#E5E7E5] flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-[#1D2926]">{item.title}</h4>
                      <p className="text-xs text-[#66736F]">{item.desc}</p>
                    </div>
                    <CareBadge variant={item.active ? 'success' : 'neutral'}>
                      {item.active ? 'ENABLED' : 'DISABLED'}
                    </CareBadge>
                  </div>
                ))}
              </div>
            </CareCard>

            {/* Section 4: Privacy & Audit Safeguards */}
            <CareCard variant="bordered" padding="lg" className="border-2 border-[#E5E7E5] shadow-care-sm space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#E5E7E5]">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1D2926]">Privacy & Audit Traceability</h3>
                  <p className="text-xs text-[#66736F]">Task-scoped privacy controls and immutable audit logging</p>
                </div>
              </div>

              <div className="space-y-3 text-left">
                <div className="p-3.5 rounded-2xl bg-[#FAF7F1] border border-[#E5E7E5] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#1D2926]">Care Circle Data Isolation</h4>
                    <p className="text-xs text-[#66736F]">ABAC policy restricts parent data to authorized care circle members only</p>
                  </div>
                  <CareBadge variant="info">ENFORCED (ABAC)</CareBadge>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7F1] border border-[#E5E7E5] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#1D2926]">Immutable Audit Logging</h4>
                    <p className="text-xs text-[#66736F]">All consequential care actions logged to AuditEvent PostgreSQL table</p>
                  </div>
                  <CareBadge variant="success">
                    <FileText className="w-3 h-3 inline mr-1" /> AUDITED
                  </CareBadge>
                </div>
              </div>
            </CareCard>
          </div>
        ) : null}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="Settings System" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  );
};
