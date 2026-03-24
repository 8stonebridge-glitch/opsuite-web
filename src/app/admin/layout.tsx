'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { useSession } from '@/providers/SessionProvider';
import { useHydrated } from '@/hooks/useHydrated';
import { useIndustryColor, useDashboardCounters } from '@/store/selectors';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { InboxButton } from '@/components/inbox/InboxButton';
import { InboxProvider } from '@/components/inbox/InboxProvider';
import { getSidebarItems, isPathActive } from '@/components/navigation/nav-config';
import { useAuthActions } from '@convex-dev/auth/react';

import { SidebarLayout } from '@/components/catalyst/sidebar-layout';
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarSpacer,
} from '@/components/catalyst/sidebar';
import { Navbar, NavbarSpacer, NavbarSection } from '@/components/catalyst/navbar';
import { NavbarItem } from '@/components/catalyst/navbar';

import { LogOut, ChevronDown } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const { user } = useSession();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useHydrated();
  const color = useIndustryColor();
  const counters = useDashboardCounters();
  const items = getSidebarItems('owner_admin');

  // Client-side role guard — prevents UI flash for wrong-role users.
  useEffect(() => {
    if (!isMounted || !state.onboardingComplete) return;
    if (state.role !== 'admin') {
      router.push('/');
    }
  }, [isMounted, state.onboardingComplete, state.role, router]);

  const orgInitial = (state.onboarding.orgName || 'O').charAt(0);
  const orgName = state.onboarding.orgName || 'OpSuite';
  const industryName = state.onboarding.industry?.name || 'Workspace';

  return (
    <ProtectedRoute>
      <SidebarLayout
        navbar={
          <Navbar>
            <NavbarSpacer />
            <NavbarSection>
              <NavbarItem aria-label="Notifications">
                <InboxButton />
              </NavbarItem>
            </NavbarSection>
          </Navbar>
        }
        sidebar={
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {orgInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-950 dark:text-white">
                    {orgName}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {industryName}
                  </span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarBody>
              <SidebarSection>
                {items.map((item) => {
                  const active = isPathActive(pathname, item.href);
                  return (
                    <SidebarItem key={item.id} href={item.href} current={active}>
                      <item.icon data-slot="icon" className="size-5" />
                      <SidebarLabel>{item.label}</SidebarLabel>
                      {item.badge === 'needsReview' && counters.needsReview > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {counters.needsReview}
                        </span>
                      )}
                    </SidebarItem>
                  );
                })}
              </SidebarSection>

              <SidebarSpacer />
            </SidebarBody>

            <SidebarFooter>
              {user && (
                <SidebarSection>
                  <SidebarItem>
                    <div className="flex w-full items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {(user.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-950 dark:text-white">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </SidebarItem>
                  <SidebarItem
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to sign out?')) {
                        await signOut();
                        window.location.href = '/sign-in';
                      }
                    }}
                  >
                    <LogOut data-slot="icon" className="size-5" />
                    <SidebarLabel>Sign out</SidebarLabel>
                  </SidebarItem>
                </SidebarSection>
              )}
            </SidebarFooter>
          </Sidebar>
        }
      >
        <InboxProvider>{children}</InboxProvider>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
