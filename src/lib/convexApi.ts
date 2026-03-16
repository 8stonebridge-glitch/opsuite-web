/**
 * Convex API references for the web app.
 *
 * Uses `anyApi` from convex/server which provides runtime function references
 * matching the backend's module structure. The Convex backend is at the repo root
 * (/convex/), not inside the web/ directory.
 */
import { anyApi } from 'convex/server';

// Type the API for better DX
interface ConvexApi {
  users: {
    viewer: any;
    syncFromAuth: any;
    syncFromAuthAction: any;
    setActiveOrganization: any;
  };
  organizations: {
    active: any;
    listForViewer: any;
    create: any;
    storeSignupDraft: any;
    updateMode: any;
  };
  tasks: {
    listForCurrentScope: any;
    getDetail: any;
    create: any;
    addNote: any;
    updateStatus: any;
    markNoChange: any;
    delegate: any;
    approvePending: any;
    verify: any;
    requestRework: any;
  };
  memberships: {
    listForActiveOrganization: any;
    createProvisionedMember: any;
    removeMember: any;
    reassignMember: any;
    updateMember: any;
  };
  sites: {
    listForActiveOrganization: any;
    create: any;
  };
  teams: {
    listForActiveOrganization: any;
    create: any;
  };
  availability: {
    listForCurrentScope: any;
    createRequest: any;
    approve: any;
    reject: any;
    cancel: any;
  };
}

export const api = anyApi as unknown as ConvexApi;
