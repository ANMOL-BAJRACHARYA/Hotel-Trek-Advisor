import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { migrateJsonToMongoDB, closeMongoDBConnection } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the path to data directory
const dataDir = join(__dirname, '..', 'data');

// Function to read a JSON file
const readJsonFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return [];
    }
    const jsonData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return [];
  }
};

// Main migration function
const migrateAllData = async () => {
  try {
    console.log('Starting migration of JSON data to MongoDB...');
    
    // Migrate bookings
    const bookingsFile = path.join(dataDir, 'bookings.json');
    const bookings = readJsonFile(bookingsFile);
    if (bookings.length > 0) {
      const result = await migrateJsonToMongoDB('bookings', bookings);
      console.log(`Migrated ${result.insertedCount || 0} bookings to MongoDB`);
    } else {
      console.log('No bookings data to migrate');
    }
    
    // Add other collections as needed
    // For example: hotels, users, reviews, etc.
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close MongoDB connection when done
    await closeMongoDBConnection();
  }
};

// Run the migration
migrateAllData().then(() => {
  console.log('Migration process finished');
}); 