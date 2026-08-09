import crypto from 'crypto';
import fs from 'fs';

// Helper function to generate a secure random string
const generateSecureToken = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};

// Get the total number of invites from command line arguments, default to 105
const arg = process.argv[2];
const TOTAL_INVITES = arg ? parseInt(arg, 10) : 105;

if (isNaN(TOTAL_INVITES) || TOTAL_INVITES <= 0) {
  console.error('Por favor, informe uma quantidade válida de exibíveis (ex: npx tsx src/scripts/generateInvites.ts 50)');
  process.exit(1);
}

const invites = [];

for (let i = 1; i <= TOTAL_INVITES; i++) {
  // Format code to LM-001, LM-010, LM-105
  const codeNumber = i.toString().padStart(3, '0');
  const code = `LM-${codeNumber}`;
  const token = generateSecureToken();

  invites.push({
    code,
    token,
    guest_name: null,
    status: 'VALID',
    used_at: null,
  });
}

// Write to a JSON file (in production, this would insert directly into Supabase/PostgreSQL)
fs.writeFileSync('./invites.json', JSON.stringify(invites, null, 2));

console.log(`Successfully generated ${TOTAL_INVITES} invites with secure tokens.`);
console.log('Saved to invites.json');

/*
Example output for one row:
{
  "code": "LM-001",
  "token": "4f9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d",
  "guest_name": null,
  "status": "VALID",
  "used_at": null
}

SQL script to insert into Supabase:

CREATE TABLE invites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  token VARCHAR(100) NOT NULL,
  guest_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'VALID',
  used_at TIMESTAMP WITH TIME ZONE
);
*/
