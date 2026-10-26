/** @jest-environment node */
const { planRecovery } = require('../../scripts/backfill-member-organizations');
const row = (id, org, affiliation, email = 'member@example.org') => ({ id, fields: { 'EMAIL ADDRESS': email, 'ORGANIZATION NAME': org, 'AFFILIATED ENTITY': affiliation } });
test('restores independently named relationships by exact normalized email', () => {
 const plan = planRecovery([row('rec1', 'Community Farm', 'Partner Network', ' MEMBER@example.org ')], [{ _id: 'mongo', email: 'member@example.org' }]);
 expect(plan.updates[0].changes).toEqual({ organizationName: 'Community Farm', affiliatedEntity: 'Partner Network' });
 expect(plan.summary.membersToUpdate).toBe(1);
});
test('preserves existing names and legacy values and does not guess unmatched members', () => {
 const plan = planRecovery([row('rec1', 'Imported', 'Partner'), row('rec2', 'Other', '', 'missing@example.org')],
 [{ _id: 'mongo', email: 'member@example.org', organizationName: 'Member edit', fields: { 'AFFILIATED ENTITY': 'Existing Partner' } }]);
 expect(plan.updates).toHaveLength(0);
 expect(plan.summary.preservedExistingFields).toBe(2);
 expect(plan.summary.unmatchedSourceEmails).toBe(1);
});
test('skips conflicting source values and ambiguous Mongo identities', () => {
 const plan = planRecovery([row('rec1', 'Farm A'), row('rec2', 'Farm B')], [{ _id: 'mongo', email: 'member@example.org' }]);
 expect(plan.updates).toHaveLength(0);
 expect(plan.summary.conflictingSourceFields).toBe(1);
 const ambiguous = planRecovery([row('rec1', 'Farm A')], [{ _id: 'one', email: 'member@example.org' }, { _id: 'two', email: 'MEMBER@example.org' }]);
 expect(ambiguous.updates).toHaveLength(0);
 expect(ambiguous.summary.ambiguousTargetEmails).toBe(1);
});
