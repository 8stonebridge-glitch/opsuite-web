'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Team, Site } from '@/types';
import { readJsonOrThrow } from '@/utils/apiHelpers';

type MemberRoleOption = 'subadmin' | 'employee';

interface Props {
  sites: Site[];
  teams: Team[];
  isDirect: boolean;
  color: string;
  onClose: () => void;
}

export function CreateMemberModal({ sites, teams, isDirect, color, onClose }: Props) {
  const [memberRole, setMemberRole] = useState<MemberRoleOption>('employee');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberTeamId, setMemberTeamId] = useState('');
  const [memberSiteId, setMemberSiteId] = useState(sites[0]?.id ?? '');
  const [memberError, setMemberError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const availableTeams = teams.filter((t) => !memberSiteId || !t.siteId || t.siteId === memberSiteId);
  const teamOptions = availableTeams.map((t) => ({ label: t.name, value: t.id }));

  const handleCreate = async () => {
    const name = memberName.trim();
    const email = memberEmail.trim().toLowerCase();
    const phone = memberPhone.trim();
    const password = memberPassword.trim();

    if (name.length < 2) { setMemberError('Enter a name with at least 2 characters.'); return; }
    if (!email || !email.includes('@')) { setMemberError('Enter a valid email address.'); return; }
    if (!phone) { setMemberError('Enter a phone number.'); return; }
    if (password.length < 8) { setMemberError('Password must be at least 8 characters.'); return; }
    if (!memberSiteId) { setMemberError('Choose the site this person belongs to.'); return; }

    setMemberError('');
    setIsSaving(true);

    try {
      await readJsonOrThrow(
        await fetch('/api/admin/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            password,
            role: isDirect ? 'employee' : memberRole,
            siteId: memberSiteId,
            teamId: memberTeamId || undefined,
          }),
        }),
      );
      onClose();
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : 'We could not create that person yet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-heading text-surface-900 dark:text-surface-100">Add Person</p>
          <button onClick={onClose} className="text-surface-500 text-xl">&times;</button>
        </div>

        {!isDirect && (
          <Select
            label="Role"
            placeholder="Choose a role"
            options={[{ label: 'Employee', value: 'employee' }, { label: 'Subadmin', value: 'subadmin' }]}
            value={memberRole}
            onChange={(v) => { setMemberRole(v as MemberRoleOption); setMemberError(''); }}
          />
        )}

        <div className="mt-4 space-y-4">
          {[
            { label: 'Full Name', placeholder: 'Ada Nwobi', value: memberName, setter: setMemberName, type: 'text' },
            { label: 'Work Email', placeholder: 'ada@company.com', value: memberEmail, setter: setMemberEmail, type: 'email' },
            { label: 'Phone Number', placeholder: '+2348012345678', value: memberPhone, setter: setMemberPhone, type: 'tel' },
            { label: 'Password', placeholder: 'At least 8 characters', value: memberPassword, setter: setMemberPassword, type: 'password' },
          ].map(({ label, placeholder, value, setter, type }) => (
            <div key={label}>
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">{label}</p>
              <input
                className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 outline-none"
                placeholder={placeholder}
                value={value}
                type={type}
                onChange={(e) => { setter(e.target.value); setMemberError(''); }}
              />
            </div>
          ))}
        </div>

        {sites.length > 0 && (
          <div className="mt-4">
            <Select
              label="Site"
              placeholder="Choose a site"
              options={sites.map((s) => ({ label: s.name, value: s.id }))}
              value={memberSiteId}
              onChange={(v) => {
                setMemberSiteId(v);
                setMemberTeamId((curr) => {
                  const ok = teams.some((t) => t.id === curr && (!t.siteId || t.siteId === v));
                  return ok ? curr : '';
                });
                setMemberError('');
              }}
            />
          </div>
        )}

        {teamOptions.length > 0 && (
          <div className="mt-4">
            <Select
              label="Team (optional)"
              placeholder="No team"
              options={[{ label: 'No team', value: '' }, ...teamOptions]}
              value={memberTeamId}
              onChange={(v) => { setMemberTeamId(v); setMemberError(''); }}
            />
          </div>
        )}

        <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mt-5">
          Admin-created people can sign in immediately. Their email is trusted at creation time.
        </p>

        {memberError && <p className="text-body text-red-600 mt-4">{memberError}</p>}

        <div className="mt-5">
          <Button onClick={() => void handleCreate()} disabled={isSaving} style={{ backgroundColor: color }}>
            {isSaving ? 'Creating person...' : 'Create Person'}
          </Button>
        </div>
      </div>
    </div>
  );
}
