'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convexApi';
import type { Id } from '@/lib/convexApiTypes';
import { Button } from '@/components/ui/Button';
import { useIndustryColor } from '@/store/selectors';

type InviteRole = 'subadmin' | 'employee';

export default function InviteMemberPage() {
  const color = useIndustryColor();
  const sites = useQuery(api.sites.listForActiveOrganization) ?? [];
  const teams = useQuery(api.teams.listForActiveOrganization) ?? [];
  const createMember = useMutation(api.memberships.createProvisionedMember);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<InviteRole>('employee');
  const [selectedSiteIds, setSelectedSiteIds] = useState<Id<'sites'>[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Id<'teams'>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim() && name.trim() && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError('');

    try {
      await createMember({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        siteIds: selectedSiteIds,
        teamIds: selectedTeamIds,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setName('');
    setPhone('');
    setRole('employee');
    setSelectedSiteIds([]);
    setSelectedTeamIds([]);
    setSuccess(false);
    setError('');
  };

  const toggleSite = (id: Id<'sites'>) => {
    setSelectedSiteIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const toggleTeam = (id: Id<'teams'>) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  if (success) {
    return (
      <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
        <div className="px-5 pt-6 pb-24 max-w-lg mx-auto">
          <div className="text-center pt-20">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
              style={{ backgroundColor: `${color}18` }}
            >
              <svg className="w-8 h-8" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-display tracking-tight text-surface-900 dark:text-surface-100 mb-2">
              Member Invited
            </h1>
            <p className="text-body text-surface-400 dark:text-surface-500 mb-8">
              {name} has been added to your organization.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={resetForm}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-white font-medium transition-colors"
                style={{ backgroundColor: color }}
              >
                Invite Another
              </button>
              <Link
                href="/admin/people"
                className="text-caption text-surface-400 dark:text-surface-500 hover:text-surface-600"
              >
                Back to People
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="px-5 pt-6 pb-24 max-w-lg mx-auto">
        {/* Back link */}
        <Link
          href="/admin/people"
          className="flex items-center gap-1 mb-6 text-caption text-surface-400 dark:text-surface-500 hover:text-surface-600"
        >
          &larr; Back to People
        </Link>

        <h1 className="text-display tracking-tight text-surface-900 dark:text-surface-100 mb-2">
          Invite Team Member
        </h1>
        <p className="text-body text-surface-400 dark:text-surface-500 mb-8">
          Add a new member to your organization.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-card px-4 py-3 text-body text-surface-900 dark:text-surface-100 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-card px-4 py-3 text-body text-surface-900 dark:text-surface-100 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-card px-4 py-3 text-body text-surface-900 dark:text-surface-100 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-card px-4 py-3 text-body text-surface-900 dark:text-surface-100 outline-none focus:border-emerald-500"
            >
              <option value="employee">Employee</option>
              <option value="subadmin">Sub-Admin</option>
            </select>
          </div>

          {/* Site assignment */}
          {sites.length > 0 && (
            <div>
              <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">
                Sites
              </label>
              <div className="flex flex-wrap gap-2">
                {sites.map((site) => {
                  const isSelected = selectedSiteIds.includes(site._id);
                  return (
                    <button
                      key={site._id}
                      type="button"
                      onClick={() => toggleSite(site._id)}
                      className={`px-3 py-1.5 rounded-full text-caption border transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-500 dark:text-surface-400'
                      }`}
                    >
                      {site.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team assignment */}
          {teams.length > 0 && (
            <div>
              <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">
                Teams
              </label>
              <div className="flex flex-wrap gap-2">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team._id);
                  return (
                    <button
                      key={team._id}
                      type="button"
                      onClick={() => toggleTeam(team._id)}
                      className={`px-3 py-1.5 rounded-full text-caption border transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-500 dark:text-surface-400'
                      }`}
                    >
                      {team.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-caption text-red-500">{error}</p>
          )}

          {/* Submit */}
          <div className="pt-2">
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Inviting...' : 'Send Invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
