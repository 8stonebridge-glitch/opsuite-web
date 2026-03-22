import {
  Home,
  ClipboardList,
  CheckSquare,
  BarChart3,
  MessageSquare,
  MapPin,
  Users,
  Settings,
  Sun,
  Hand,
  Bell,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

export type AppRole = 'owner_admin' | 'subadmin' | 'employee';

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
  /** On mobile, items with the same mobileTab are grouped under that tab */
  mobileTab?: string;
  badge?: 'needsReview';
}

/**
 * Single source of truth for all navigation across roles.
 * NAV-ADAPT-01: one config, consumed by Sidebar + BottomTabBar.
 * NAV-TAB-05: unauthorized role items are absent from DOM entirely.
 */
const ALL_NAV_ITEMS: NavItem[] = [
  // ── Admin ──
  { id: 'admin-overview',  href: '/admin/overview',  label: 'Overview',  icon: Home,          roles: ['owner_admin'] },
  { id: 'admin-tasks',     href: '/admin/tasks',     label: 'Tasks',     icon: ClipboardList, roles: ['owner_admin'], badge: 'needsReview' },
  { id: 'admin-approvals', href: '/admin/approvals', label: 'Approvals', icon: CheckSquare,   roles: ['owner_admin'], mobileTab: 'Tasks' },
  { id: 'admin-messages',  href: '/admin/messages',  label: 'Messages',  icon: MessageSquare, roles: ['owner_admin'] },
  { id: 'admin-sites',     href: '/admin/sites',     label: 'Teams',     icon: MapPin,        roles: ['owner_admin'], mobileTab: 'Team' },
  { id: 'admin-people',    href: '/admin/people',    label: 'People',    icon: Users,         roles: ['owner_admin'], mobileTab: 'Team' },
  { id: 'admin-reports',   href: '/admin/reports',   label: 'Reports',   icon: BarChart3,     roles: ['owner_admin'], mobileTab: 'More' },
  { id: 'admin-more',      href: '/admin/more',      label: 'More',      icon: Settings,      roles: ['owner_admin'] },

  // ── Subadmin ──
  { id: 'sub-overview',  href: '/subadmin/overview',  label: 'Overview',   icon: Home,          roles: ['subadmin'] },
  { id: 'sub-tasks',     href: '/subadmin/tasks',     label: 'Tasks',      icon: ClipboardList, roles: ['subadmin'], badge: 'needsReview' },
  { id: 'sub-checkins',  href: '/subadmin/check-ins', label: 'Check-ins',  icon: Bell,          roles: ['subadmin'] },
  { id: 'sub-messages',  href: '/subadmin/messages',  label: 'Messages',   icon: MessageSquare, roles: ['subadmin'] },
  { id: 'sub-people',    href: '/subadmin/people',    label: 'Team',       icon: Users,         roles: ['subadmin'], mobileTab: 'More' },
  { id: 'sub-more',      href: '/subadmin/more',      label: 'More',       icon: Settings,      roles: ['subadmin'] },

  // ── Employee ──
  { id: 'emp-myday',    href: '/employee/my-day',    label: 'My Day',   icon: Sun,           roles: ['employee'] },
  { id: 'emp-tasks',    href: '/employee/tasks',     label: 'Tasks',    icon: ClipboardList, roles: ['employee'] },
  { id: 'emp-checkin',  href: '/employee/check-in',  label: 'Handoff',  icon: Hand,          roles: ['employee'] },
  { id: 'emp-messages', href: '/employee/messages',  label: 'Messages', icon: MessageSquare, roles: ['employee'] },
  { id: 'emp-more',     href: '/employee/more',      label: 'More',     icon: Settings,      roles: ['employee'] },
];

/** Get all sidebar items for a role (desktop — shows everything) */
export function getSidebarItems(role: AppRole): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Mobile tab definition */
export interface MobileTab {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: 'needsReview';
  /** All hrefs that should highlight this tab */
  matchPaths: string[];
}

/**
 * Get mobile bottom tabs for a role (max 5).
 * NAV-TAB-03: never exceeds 5 tabs on mobile.
 * Items with mobileTab are grouped under their parent tab.
 */
export function getMobileTabs(role: AppRole): MobileTab[] {
  const items = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));

  const tabs: MobileTab[] = [];
  const grouped = new Map<string, string[]>();

  for (const item of items) {
    if (item.mobileTab) {
      // This item is grouped under another tab
      const existing = grouped.get(item.mobileTab);
      if (existing) {
        existing.push(item.href);
      } else {
        grouped.set(item.mobileTab, [item.href]);
      }
    } else {
      // This is a primary tab
      tabs.push({
        id: item.id,
        label: item.label,
        icon: item.icon,
        href: item.href,
        badge: item.badge,
        matchPaths: [item.href],
      });
    }
  }

  // Merge grouped items into their parent tabs
  for (const tab of tabs) {
    const childPaths = grouped.get(tab.label);
    if (childPaths) {
      tab.matchPaths.push(...childPaths);
    }
  }

  // Add "Team" and "More" tabs for admin if they only exist as groups
  for (const [groupLabel, paths] of grouped.entries()) {
    const parentExists = tabs.some((t) => t.label === groupLabel);
    if (!parentExists) {
      // Find the icon from the first grouped item
      const firstGroupedItem = items.find((i) => i.mobileTab === groupLabel);
      const moreItem = items.find((i) => i.label === groupLabel);
      const icon = moreItem?.icon ?? firstGroupedItem?.icon ?? Settings;
      const href = paths[0];

      tabs.push({
        id: `mobile-${groupLabel.toLowerCase()}`,
        label: groupLabel,
        icon,
        href,
        matchPaths: paths,
      });
    }
  }

  return tabs;
}

/** Check if a path is active for a given href */
export function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

/** Check if any of the match paths are active */
export function isTabActive(pathname: string, matchPaths: string[]): boolean {
  return matchPaths.some((path) => isPathActive(pathname, path));
}
