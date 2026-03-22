'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

/* ─── Create Site Modal ─── */
export function CreateSiteModal({
  color,
  onClose,
  onCreateSite,
}: {
  color: string;
  onClose: () => void;
  onCreateSite: (name: string, code: string) => Promise<void>;
}) {
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteError, setSiteError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    const trimmedName = siteName.trim();
    if (trimmedName.length < 2) {
      setSiteError('Enter a team name with at least 2 characters.');
      return;
    }
    setSiteError('');
    setIsSaving(true);
    try {
      await onCreateSite(trimmedName, siteCode);
      setSiteName('');
      setSiteCode('');
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : 'We could not create that team yet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} aria-label="Close modal" />
      <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-card px-5 pt-5 pb-10 w-full md:max-w-lg">
        <ModalHeader onClose={onClose} />
        <SiteFormFields
          siteName={siteName}
          siteCode={siteCode}
          siteError={siteError}
          isSaving={isSaving}
          color={color}
          onNameChange={(v) => { setSiteName(v); setSiteError(''); }}
          onCodeChange={(v) => { setSiteCode(v); setSiteError(''); }}
          onSubmit={() => void handleCreate()}
        />
      </div>
    </div>
  );
}

/* ─── Modal Header ─── */
function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <p className="text-heading text-surface-900 dark:text-surface-100">Add Team</p>
      <button onClick={onClose} className="text-surface-500 text-xl">&times;</button>
    </div>
  );
}

const INPUT_CLASS =
  'w-full bg-surface-50 dark:bg-surface-900 rounded-xl px-4 py-3 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none border border-surface-200 dark:border-surface-800 focus:border-surface-400 dark:focus:border-surface-600 transition-colors';

/* ─── Site Form Fields ─── */
function SiteFormFields({
  siteName, siteCode, siteError, isSaving, color, onNameChange, onCodeChange, onSubmit,
}: {
  siteName: string;
  siteCode: string;
  siteError: string;
  isSaving: boolean;
  color: string;
  onNameChange: (val: string) => void;
  onCodeChange: (val: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
        Team Name
      </p>
      <input className={INPUT_CLASS} placeholder="Victoria Hub" value={siteName} onChange={(e) => onNameChange(e.target.value)} />

      <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
        Team Code (optional)
      </p>
      <input className={`${INPUT_CLASS} uppercase`} placeholder="VIC-HUB" value={siteCode} onChange={(e) => onCodeChange(e.target.value)} />

      {siteError ? <p className="text-body text-red-600 mb-4">{siteError}</p> : null}

      <Button onClick={onSubmit} disabled={isSaving} style={{ backgroundColor: color }}>
        {isSaving ? 'Creating team...' : 'Create Team'}
      </Button>
    </>
  );
}
