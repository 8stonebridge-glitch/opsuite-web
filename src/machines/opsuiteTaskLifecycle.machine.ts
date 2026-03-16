import {
  and,
  boolType,
  defineMachine,
  enumType,
  eq,
  isin,
  lit,
  not,
  scalarVar,
  setOf,
  setVar,
  variable,
} from 'tla-precheck';

const status = variable('status');
const origin = variable('origin');
const hasStarted = variable('hasStarted');

const taskStatus = enumType(
  'none',
  'pendingApproval',
  'open',
  'inProgress',
  'submitted',
  'verified',
  'rework',
  'declined',
);

const taskOrigin = enumType('none', 'managerCreated', 'employeeRaised');
const approvalStates = setOf(lit('pendingApproval'), lit('declined'));
const postStartStates = setOf(lit('submitted'), lit('rework'), lit('verified'));

export const opsuiteTaskLifecycleMachine = defineMachine({
  version: 2,
  moduleName: 'OpSuiteTaskLifecycle',
  variables: {
    status: scalarVar(taskStatus, lit('none')),
    origin: scalarVar(taskOrigin, lit('none')),
    hasStarted: scalarVar(boolType(), lit(false)),
  },
  actions: {
    createManagerTask: {
      params: {},
      guard: and(eq(status, lit('none')), eq(origin, lit('none')), eq(hasStarted, lit(false))),
      updates: [
        setVar('status', lit('open')),
        setVar('origin', lit('managerCreated')),
      ],
    },
    raiseEmployeeTask: {
      params: {},
      guard: and(eq(status, lit('none')), eq(origin, lit('none')), eq(hasStarted, lit(false))),
      updates: [
        setVar('status', lit('pendingApproval')),
        setVar('origin', lit('employeeRaised')),
      ],
    },
    approveRaisedTask: {
      params: {},
      guard: and(eq(status, lit('pendingApproval')), eq(origin, lit('employeeRaised'))),
      updates: [setVar('status', lit('open'))],
    },
    declineRaisedTask: {
      params: {},
      guard: and(eq(status, lit('pendingApproval')), eq(origin, lit('employeeRaised'))),
      updates: [setVar('status', lit('declined'))],
    },
    startWork: {
      params: {},
      guard: eq(status, lit('open')),
      updates: [
        setVar('status', lit('inProgress')),
        setVar('hasStarted', lit(true)),
      ],
    },
    submitWork: {
      params: {},
      guard: and(eq(status, lit('inProgress')), eq(hasStarted, lit(true))),
      updates: [setVar('status', lit('submitted'))],
    },
    requestRework: {
      params: {},
      guard: and(eq(status, lit('submitted')), eq(hasStarted, lit(true))),
      updates: [setVar('status', lit('rework'))],
    },
    resumeRework: {
      params: {},
      guard: and(eq(status, lit('rework')), eq(hasStarted, lit(true))),
      updates: [setVar('status', lit('inProgress'))],
    },
    verifyTask: {
      params: {},
      guard: and(eq(status, lit('submitted')), eq(hasStarted, lit(true))),
      updates: [setVar('status', lit('verified'))],
    },
  },
  invariants: {
    managerCreatedTasksSkipApproval: {
      description: 'Manager-created tasks never go through pending approval or declined states.',
      formula: not(and(eq(origin, lit('managerCreated')), isin(status, approvalStates))),
    },
    approvalStatesBelongToRaisedTasks: {
      description: 'Only employee-raised tasks can be pending approval or declined.',
      formula: not(and(isin(status, approvalStates), not(eq(origin, lit('employeeRaised'))))),
    },
    reviewStatesRequireWorkStarted: {
      description: 'Submitted, rework, and verified states are only reachable after work has started.',
      formula: not(and(isin(status, postStartStates), eq(hasStarted, lit(false)))),
    },
    noOriginWithoutTask: {
      description: 'The empty state has no origin and has not started work.',
      formula: not(
        and(
          eq(status, lit('none')),
          not(and(eq(origin, lit('none')), eq(hasStarted, lit(false)))),
        ),
      ),
    },
  },
  proof: {
    defaultTier: 'pr',
    tiers: {
      pr: {
        domains: {},
        checks: {
          deadlock: false,
        },
        budgets: {
          maxEstimatedStates: 100,
          maxEstimatedBranching: 20,
        },
      },
    },
  },
});

export default opsuiteTaskLifecycleMachine;
