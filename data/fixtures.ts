export type FixtureCase = 'support' | 'contradiction' | 'irrelevant' | 'duplicate' | 'insufficient';

export const fixtureManifest = {
  synthetic: true,
  employee: { id: 'employee-001', name: 'Synthetic Employee', synthetic: true },
  manager: { id: 'manager-001', name: 'Synthetic Manager', synthetic: true },
  reviewers: ['reviewer-001', 'reviewer-002', 'reviewer-003', 'reviewer-004'].map((id) => ({ id, type: 'peer', synthetic: true })),
  appraisal: { id: 'appraisal-001', employeeId: 'employee-001', managerId: 'manager-001', synthetic: true },
  competency: { id: 'competency-problem-solving', name: 'Problem solving', synthetic: true },
  anchors: [1, 2, 3, 4, 5].map((level) => ({ id: `anchor-problem-solving-${level}`, level, text: `Synthetic rubric anchor ${level}`, synthetic: true })),
  feedback: [
    ['fb-001', 'reviewer-001', 'answer-001', 'Evidence demonstrates clear root-cause analysis.', 'support'],
    ['fb-002', 'reviewer-001', 'answer-002', 'Evidence demonstrates clear root-cause analysis.', 'duplicate'],
    ['fb-003', 'reviewer-002', 'answer-003', 'Frequently resolves complex incidents independently.', 'support'],
    ['fb-004', 'reviewer-002', 'answer-004', 'Needs more structure when solving unfamiliar problems.', 'contradiction'],
    ['fb-005', 'reviewer-003', 'answer-005', 'Communicates project updates promptly.', 'irrelevant'],
    ['fb-006', 'reviewer-003', 'answer-006', 'Could document troubleshooting steps more consistently.', 'contradiction'],
    ['fb-007', 'reviewer-004', 'answer-007', 'No examples were provided for this competency.', 'insufficient'],
  ].map(([id, reviewerId, answerId, text, expectedCase]) => ({ id, reviewerId, answerId, text, expectedCase: expectedCase as FixtureCase, synthetic: true })),
  selfReview: { id: 'answer-self-001', employeeId: 'employee-001', text: 'I solved a synthetic incident by isolating its root cause.', synthetic: true },
} as const;

export type FixtureManifest = typeof fixtureManifest;
