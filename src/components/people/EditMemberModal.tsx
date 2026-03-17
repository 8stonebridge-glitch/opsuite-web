'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Team, Site } from '@/types';
import { readJsonOrThrow } from '@/utils/apiHelpers';

interface EditTarget {
  id: string;
  name: string;
  email: string;
  phone: string;
  teamId?: string;
  siteId?: string;
}

interface Props {
  member: EditTarget;
  sites: Site[];
  teams: Team[];
  color: string;
  onClose: () => void;
}

export function EditMemberModal({ member, sites, teams, color, onClose }: Props) {
  const [editName, setEditName] = useState(member.name);
  const [editEmail, setEditEmail] = useState(member.email);
  const [editPhone, setEditPhone] = useState(member.phone);
  const [editPassword, setEditPassword] = useState('');
  const [editTeamId, setEditTeamId] = useState(member.teamId ?? '');
  const [editSiteId, setEditSiteId] = useState(member.siteId ?? sites[0]?.id ?? '');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const availableTeams = teams.filter((t) => !editSiteId || !t.siteId || t.siteId === editSiteId);
  const teamOptions = availableTeams.map((t) => ({ label: t.name, value: t.id }));

  const handleSave = async () => {
    const name = editName.trim();
    const email = editEmail.trim().toLowerCase();
    const phone = editPhone.trim();
    const password = editPassword.trim();

    if (name.length < 2) { setEditError('Name must be at least 2 characters.'); return; }
    if (!email || !email.includes('@')) { setEditError('Enter a valid email address.'); return; }
    if (!phone) { setEditError('Enter a phone number.'); return; }
    if (password && password.length < 8) { setEditError('Password must be at least 8 characters.'); return; }
    if (!editSiteId) { setEditError('Choose the site this person belongs to.'); return; }

    setEditError('');
    setIsSaving(true);

    try {
      await readJsonOrThrow(
        await fetch(`/api/admin/people/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            password: password || undefined,
            siteId: editSiteId,
            teamId: editTeamId || undefined,
          }),
        }),
      );
      onClose();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${member.name} from this organization?`)) return;

    setIsSaving(true);
    setEditError('');

    try {
      await readJsonOrThrow(
        await fetch(`/api/admin/people/${member.id}`, { method: 'DELETE' }),
      );
      onClose();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to remove this person.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-heading text-surface-900 dark:text-surface-100">Edit Person</p>
          <button onClick={onClose} className="text-surface-500 text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Full Name', value: editName, setter: setEditName, type: 'text', placeholder: 'Full name' },
            { label: 'Email', value: editEmail, setter: setEditEmail, type: 'email', placeholder: 'Email address' },
            { label: 'Phone Number', value: editPhone, setter: setEditPhone, type: 'tel', placeholder: '+2348012345678' },
            { label: 'New Password', value: editPassword, setter: setEditPassword, type: 'password', placeholder: 'Leave empty to keep current' },
          ].map(({ label, value, setter, type, placeholder }) => (
            <div key={label}>
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">{label}</p>
              <input
                className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 outline-none"
                placeholder={placeholder}
                value={value}
                type={type}
                onChange={(e) => { setter(e.target.value); setEditError(''); }}
              />
            </div>
          ))}
        </div>

        {teamOptions.length > 0 && (
          <div className="mt-4">
            <Select
              label="Team"
              placeholder="No team"
              options={[{ label: 'No team', value: '' }, ...teamOptions]}
              value={editTeamId}
              onChange={(v) => { setEditTeamId(v); setEditError(''); }}
            />
          </div>
        )}

        {sites.length > 0 && (
          <div className="mt-4">
            <Select
              label="Site"
              placeholder="Choose a site"
              options={sites.map((s) => ({ label: s.name, value: s.id }))}
              value={editSiteId}
              onChange={(v) => {
                setEditSiteId(v);
                setEditTeamId((curr) => {
                  const ok = teams.some((t) => t.id === curr && (!t.siteId || t.siteId === v));
                  return ok ? curr : '';
                });
                setEditError('');
              }}
            />
          </div>
        )}

        <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mt-4">
          Update the person, move them to a new site, or link them to a team. Leave password empty to keep current.
        </p>

        {editError && <p className="text-body text-red-600 mt-3">{editError}</p>}

        <div className="mt-5 space-y-3">
          <Button onClick={() => void handleSave()} disabled={isSaving} style={{ backgroundColor: color }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <button
            onClick={() => void handleDelete()}
            disabled={isSaving}
            className="w-full py-3 text-center text-body font-semibold text-red-600"
          >
            Remove Person
          </button>
        </div>
      </div>
    </div>
  );
}
