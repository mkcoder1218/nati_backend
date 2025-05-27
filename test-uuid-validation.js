// Test script to verify UUID validation
const express = require('express');

// Helper function to validate UUID format
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Test cases
const testCases = [
  'new',
  'invalid-id',
  '123',
  'abc-def-ghi',
  '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
  '550e8400-e29b-41d4-a716-44665544000g', // Invalid UUID (contains 'g')
  '',
  null,
  undefined
];

console.log('Testing UUID validation:');
console.log('======================');

testCases.forEach((testCase, index) => {
  const result = isValidUUID(testCase);
  console.log(`Test ${index + 1}: "${testCase}" -> ${result ? 'VALID' : 'INVALID'}`);
});

console.log('\nExpected results:');
console.log('- "new" should be INVALID (this was causing the error)');
console.log('- Valid UUID should be VALID');
console.log('- All other cases should be INVALID');
