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

async function main() {
  try {
    console.log('Fixing admin password...');
    
    // Create a simpler password hash (using shorter rounds for better compatibility)
    const salt = await bcrypt.genSalt(8); // Use 8 rounds instead of 10 for compatibility
    const password = 'admin123';
    const hash = await bcrypt.hash(password, salt);
    
    console.log(`Generated hash for "${password}": ${hash}`);
    
    // Create the admin user object with the new hash
    const adminUser = {
      id: "1",
      username: "admin",
      email: "admin@example.com",
      password: hash,
      role: "admin",
      isFirstLogin: true,
      createdAt: new Date().toISOString()
    };
    
    // Write the users file
    console.log(`Writing users file to: ${usersFile}`);
    fs.writeFileSync(usersFile, JSON.stringify([adminUser], null, 2), 'utf8');
    console.log('Users file has been updated with the admin user');
    console.log('You can now log in with:');
    console.log('Username: admin');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error fixing admin password:', error);
  }
}

main(); 