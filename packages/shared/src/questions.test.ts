import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeBank, normalizeQuestion, gradeQuestion, publicQuestion, migrateSelection, answerText } from './questions'

const bank = normalizeBank(JSON.parse(readFileSync(new URL('../../../examples/question-44.json', import.meta.url), 'utf8')))
const q = bank.questions[0]!
assert.equal(q.questionHeader[1]!.type, 'image')
assert.equal(Buffer.from(q.questionHeader[1]!.content.split(',')[1]!, 'base64').subarray(0, 2).toString('hex'), 'ffd8')
assert.deepEqual(normalizeBank(JSON.parse(JSON.stringify(bank))), bank)
assert.equal(gradeQuestion(q, '["c"]'), true)
assert.equal(gradeQuestion(q, '["a"]'), false)
assert.equal(gradeQuestion(q, 'C'), false)
const shuffled = { ...q, options: [...q.options].reverse() }
assert.equal(gradeQuestion(shuffled, '["c"]'), true)
assert.equal(answerText(shuffled), 'B')
assert.equal(gradeQuestion({ ...q, correctAnswer: null }, '["c"]'), null)
assert.deepEqual(Object.keys(publicQuestion(q)).sort(), ['id', 'options', 'questionHeader', 'type'])
const legacy = normalizeQuestion({ id: 'keep-my-id', type: 'multi_choice', stem: 'Choose', options: ['A. Alpha', 'B. Beta', 'C. Gamma'], answer: 'A,C', analysis: 'Because' })
assert.equal(legacy.id, 'keep-my-id')
assert.equal(legacy.type, 'multiple_choice')
assert.deepEqual(legacy.correctAnswer, ['a', 'c'])
assert.equal(migrateSelection(legacy, 'CA'), '["c","a"]')
assert.equal(gradeQuestion(legacy, '["c","a"]'), true)
assert.equal(gradeQuestion(legacy, '["a","a"]'), false)
const arbitrary = normalizeQuestion({ ...legacy, options: [{ id: 'choice,one', content: { type: 'image', content: q.questionHeader[1]!.content } }, { id: 'long-option-2', content: { type: 'text', content: 'Two' } }], correctAnswer: ['long-option-2', 'choice,one'], explanation: { general: [], byOptionId: { 'choice,one': [{ type: 'text', format: 'html', content: '<b>One</b>' }] } } })
assert.equal(gradeQuestion(arbitrary, JSON.stringify(['choice,one', 'long-option-2'])), true)
assert.throws(() => normalizeQuestion({ ...q, correctAnswer: ['missing'] }))
assert.throws(() => normalizeQuestion({ ...q, options: [q.options[0], q.options[0]] }))
assert.throws(() => normalizeQuestion({ ...q, questionHeader: [{ type: 'image', content: 'https://example.com/image.png' }] }))
assert.throws(() => normalizeQuestion({ ...q, options: [{ id: 'a', content: [q.options[0]!.content] }, q.options[1]] }))
assert.throws(() => normalizeBank({ ...bank, questions: [q, q] }))
for (const type of ['fill_blank', 'short_answer', 'true_false']) {
  const migrated = normalizeQuestion({ id: type, type, stem: 'Q', options: [], answer: 'True', analysis: '' })
  assert.equal(gradeQuestion(migrated, 'true'), type === 'short_answer' ? null : true)
}
assert.equal(gradeQuestion(normalizeQuestion({ id: 'tf', type: 'true_false', stem: 'Q', answer: 'False', options: [] }), 'invalid'), false)
console.log('Schema round-trip, migration, arbitrary IDs, shuffle, unknown answers, validation and public projection passed')
