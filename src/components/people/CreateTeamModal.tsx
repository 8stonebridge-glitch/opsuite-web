'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/convexApi';
import type { Site } from '@/types';
import type { Id } from '@/lib/convexApiTypes';

const COLOR_SWATCHES = ['#6366f1', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'] as const;

interface Props {
  sites: Site[];
  color: string;
  onClose: () => void;
}

export function CreateTeamModal({ sites, color, onClose }: Props) {
  const createTeam = useMutation(api.teams.create);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('#6366f1');
  const [teamSiteId, setTeamSiteId] = useState(sites[0]?.id ?? '');
  const [demoLeadName, setDemoLeadName] = useState('');
  const [teamError, setTeamError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    const name = teamName.trim();
    if (name.length < 2) { setTeamError('Enter a team name with at least 2 characters.'); return; }
    if (!teamSiteId) { setTeamError('Choose the site this team belongs to.'); return; }
    if (demoLeadName.trim().length < 2) { setTeamError('Enter a lead name for this team.'); return; }

    setTeamError('');
    setIsSaving(true);

    try {
      await createTeam({
        name,
        color: teamColor,
        siteId: teamSiteId as Id<'sites'>,
      });
      onClose();
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'We could not create that team yet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} aria-label="Close modal" />
      <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-heading text-surface-900 dark:text-surface-100">Add Team</p>
          <button onClick={onClose} className="text-surface-500 text-xl">&times;</button>
        </div>

        <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">Team Name</p>
        <input
          className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none"
          placeholder="Operations North"
          value={teamName}
          onChange={(e) => { setTeamName(e.target.value); setTeamError(''); }}
        />

        <Select
          label="Site"
          placeholder="Choose a site"
          options={sites.map((s) => ({ label: s.name, value: s.id }))}
          value={teamSiteId}
          onChange={(v) => { setTeamSiteId(v); setTeamError(''); }}
        />

        <div className="mt-4">
          <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">Lead Name</p>
          <input
            className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 outline-none"
            placeholder="Enter a lead name"
            value={demoLeadName}
            onChange={(e) => { setDemoLeadName(e.target.value); setTeamError(''); }}
          />
        </div>

        <div className="mt-4">
          <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">Team Color</p>
          <div className="flex flex-wrap gap-3">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                onClick={() => setTeamColor(swatch)}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${teamColor === swatch ? 'ring-2 ring-surface-900 dark:ring-surface-100' : ''}`}
                style={{ backgroundColor: swatch }}
              >
                {teamColor === swatch && <span className="text-white text-sm">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mt-5">
          Teams show up in owner, subadmin, and employee views. The lead is attached at creation so the team has a clear owner from day one.
        </p>

        {teamError && <p className="text-body text-red-600 mt-4">{teamError}</p>}

        <div className="mt-5">
          <Button onClick={() => void handleCreate()} disabled={isSaving} style={{ backgroundColor: color }}>
            {isSaving ? 'Creating team...' : 'Create Team'}
          </Button>
        </div>
      </div>
    </div>
  );
}
