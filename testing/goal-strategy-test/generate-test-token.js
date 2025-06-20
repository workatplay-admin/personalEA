import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test_jwt_secret_key_for_development_minimum_32_characters_long';

const payload = {
  id: 'test-user-123',
  email: 'test@example.com',
  scopes: ['goals.read', 'goals.write', 'milestones.read', 'milestones.write', 'tasks.read', 'tasks.write']
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('Test JWT Token:');
console.log(token);
console.log('\nUse this token in Authorization header as:');
console.log(`Authorization: Bearer ${token}`);