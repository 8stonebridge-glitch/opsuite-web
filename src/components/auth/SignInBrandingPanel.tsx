'use client';

import { ClipboardList, Users, MapPin, Shield } from 'lucide-react';

const FEATURES = [
  { icon: ClipboardList, label: 'Task Management', desc: 'Create, assign, and track tasks across your organization' },
  { icon: Users, label: 'Team Coordination', desc: 'Manage teams, roles, and accountability chains' },
  { icon: MapPin, label: 'Multi-Site Operations', desc: 'Oversee work across all your locations in one place' },
  { icon: Shield, label: 'Real-Time Visibility', desc: 'Live dashboards, audit trails, and performance insights' },
];

function FeatureItem({ icon: Icon, label, desc }: (typeof FEATURES)[number]) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-[18px] h-[18px] text-emerald-100" />
      </div>
      <div>
        <p className="text-caption font-semibold">{label}</p>
        <p className="text-micro text-emerald-200 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function SignInBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-emerald-600 text-white p-10 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/20" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/10" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-title">O</div>
          <span className="text-title tracking-tight">OpSuite</span>
        </div>

        <h1 className="text-display leading-tight mb-4">
          Operations management,{' '}
          <span className="text-emerald-200">simplified.</span>
        </h1>
        <p className="text-emerald-100 text-body leading-relaxed mb-12 max-w-sm">
          Streamline your field operations with real-time task tracking, team management, and performance insights.
        </p>

        <div className="space-y-5">
          {FEATURES.map((f) => (
            <FeatureItem key={f.label} {...f} />
          ))}
        </div>
      </div>

      <p className="relative z-10 text-micro text-emerald-300 mt-8">
        Trusted by operations teams across industries
      </p>
    </div>
  );
}
