'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { useSession } from '@/providers/SessionProvider'
import { useHydrated } from '@/hooks/useHydrated'
import { useOrgMode } from '@/store/selectors-user'
import {
  Home,
  ClipboardList,
  MessageSquare,
  Users,
  Settings,
  ArrowRightFromLine,
} from 'lucide-react'

import { SidebarLayout } from '@/components/catalyst/sidebar-layout'
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarSpacer,
} from '@/components/catalyst/sidebar'
import { Navbar, NavbarSpacer, NavbarSection } from '@/components/catalyst/navbar'
import { useApp } from '@/store/AppContext'
import { InboxButton } from '@/components/inbox/InboxButton'
import { InboxProvider } from '@/components/inbox/InboxProvider'

const NAV_ITEMS = [
  { label: 'Overview', href: '/subadmin/overview',  icon: Home },
  { label: 'Tasks',    href: '/subadmin/tasks',     icon: ClipboardList },
  { label: 'Messages', href: '/subadmin/messages',   icon: MessageSquare },
  { label: 'Team',     href: '/subadmin/people',     icon: Users },
  { label: 'More',     href: '/subadmin/more',       icon: Settings },
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function SubAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useApp()
  const { user } = useSession()
  const { signOut } = useAuthActions()
  const isMounted = useHydrated()
  const orgMode = useOrgMode()

  // Role guard — redirect non-subadmins away
  useEffect(() => {
    if (!isMounted || !state.onboardingComplete) return
    if (state.role !== 'subadmin') {
      router.push('/')
    }
  }, [isMounted, state.onboardingComplete, state.role, router])

  // Direct org mode guard — subadmin routes are inaccessible in direct orgs
  useEffect(() => {
    if (!isMounted || !state.onboardingComplete) return
    if (orgMode === 'direct') {
      router.push('/')
    }
  }, [isMounted, state.onboardingComplete, orgMode, router])

  const activeWorkspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId)
  const orgName = activeWorkspace?.orgName || 'Workspace'
  const userName = user?.name || 'Manager'

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <InboxButton />
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarSection>
              <SidebarItem href="/subadmin/overview">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
                  {orgName.charAt(0).toUpperCase()}
                </span>
                <SidebarLabel className="font-semibold">{orgName}</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
                <SidebarItem key={href} href={href} current={isActive(pathname, href)}>
                  <Icon data-slot="icon" className="h-5 w-5" />
                  <SidebarLabel>{label}</SidebarLabel>
                </SidebarItem>
              ))}
            </SidebarSection>

            <SidebarSpacer />
          </SidebarBody>

          <SidebarFooter>
            <SidebarSection>
              <SidebarItem
                onClick={async () => {
                  if (window.confirm('Are you sure you want to sign out?')) {
                    await signOut()
                    window.location.href = '/sign-in'
                  }
                }}
              >
                <ArrowRightFromLine data-slot="icon" className="h-5 w-5" />
                <SidebarLabel>{userName}</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarFooter>
        </Sidebar>
      }
    >
      <InboxProvider>{children}</InboxProvider>
    </SidebarLayout>
  )
}
