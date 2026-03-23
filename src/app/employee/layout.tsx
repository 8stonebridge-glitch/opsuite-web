'use client'

import { usePathname } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import {
  Sun,
  ClipboardList,
  MessageSquare,
  Hand,
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
  { label: 'My Day',    href: '/employee/my-day',    icon: Sun },
  { label: 'Tasks',     href: '/employee/tasks',     icon: ClipboardList },
  { label: 'Messages',  href: '/employee/messages',  icon: MessageSquare },
  { label: 'Check-in',  href: '/employee/check-in',  icon: Hand },
  { label: 'More',      href: '/employee/more',      icon: Settings },
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state } = useApp()
  const { user } = useUser()
  const { signOut } = useClerk()

  const activeWorkspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId)
  const orgName = activeWorkspace?.orgName || 'Workspace'
  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Employee'
    : 'Employee'

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
              <SidebarItem href="/employee/my-day">
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
