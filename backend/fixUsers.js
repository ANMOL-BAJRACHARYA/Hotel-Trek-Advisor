import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the users file path
const usersFile = path.join(__dirname, 'data', 'users.json');

// Create the admin user object
const adminUser = {
  id: "1",
  username: "admin",
  email: "admin@example.com",
  password: "$2a$10$i4qpakjZN44CpjcPsz1FXuQbA0GZtfYn5TR5GYUiGmGnQcZULtnyi", // admin123
  role: "admin",
  isFirstLogin: true,
  createdAt: new Date().toISOString()
};

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.log(`Creating data directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write the users file
console.log(`Writing users file to: ${usersFile}`);
fs.writeFileSync(usersFile, JSON.stringify([adminUser], null, 2), 'utf8');
console.log('Users file has been created with the admin user');
console.log('You can now log in with:');
console.log('Username: admin');
console.log('Password: admin123');

// Generate a new hash for verification
const hash = await bcrypt.hash('admin123', 10);
console.log('\nFor reference, a new bcrypt hash for "admin123" is:');
console.log(hash); 