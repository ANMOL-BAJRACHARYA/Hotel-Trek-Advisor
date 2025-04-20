import { MongoClient } from 'mongodb';

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'hotelBookingSystem';

// Create a singleton connection
let db = null;

/**
 * Connect to MongoDB
 */
export async function connectToMongoDB() {
  try {
    if (db) return db;
    
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Get reference to the database
    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Close the MongoDB connection
 */
export async function closeMongoDBConnection() {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

/**
 * Insert a document into a collection
 */
export async function insertDocument(collectionName, document) {
  try {
    const database = await connectToMongoDB();
    const collection = database.collection(collectionName);
    const result = await collection.insertOne(document);
    return result;
  } catch (error) {
    console.error(`Error inserting document into ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Find documents in a collection
 */
export async function findDocuments(collectionName, query = {}) {
  try {
    const database = await connectToMongoDB();
    const collection = database.collection(collectionName);
    return await collection.find(query).toArray();
  } catch (error) {
    console.error(`Error finding documents in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update a document in a collection
 */
export async function updateDocument(collectionName, filter, update) {
  try {
    const database = await connectToMongoDB();
    const collection = database.collection(collectionName);
    const result = await collection.updateOne(filter, { $set: update });
    return result;
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a document from a collection
 */
export async function deleteDocument(collectionName, filter) {
  try {
    const database = await connectToMongoDB();
    const collection = database.collection(collectionName);
    const result = await collection.deleteOne(filter);
    return result;
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

// Helper function to migrate JSON data to MongoDB
export async function migrateJsonToMongoDB(collectionName, jsonData) {
  try {
    const database = await connectToMongoDB();
    const collection = database.collection(collectionName);
    
    // If array of documents, use insertMany
    if (Array.isArray(jsonData)) {
      if (jsonData.length === 0) return { acknowledged: true, insertedCount: 0 };
      return await collection.insertMany(jsonData);
    }
    
    // If single document, use insertOne
    return await collection.insertOne(jsonData);
  } catch (error) {
    console.error(`Error migrating JSON to MongoDB collection ${collectionName}:`, error);
    throw error;
  }
} 