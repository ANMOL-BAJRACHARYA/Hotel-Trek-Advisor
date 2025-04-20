# MongoDB Integration for Hotel Booking System

This document describes how to set up and use MongoDB with the Hotel Booking System.

## Prerequisites

1. Install MongoDB on your system:
   - [Download MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - Follow the installation instructions for your platform

2. Make sure MongoDB is running on your system
   - Default URL: `mongodb://localhost:27017`

## Configuration

The system is configured to use MongoDB as the primary database and fall back to JSON file storage if MongoDB is unavailable.

### Connection Configuration

You can customize the MongoDB connection by modifying the `backend/db/mongodb.js` file:

```javascript
// Connection URL (change this if your MongoDB runs on a different host/port)
const url = 'mongodb://localhost:27017';

// Database Name (you can change this to your preferred name)
const dbName = 'hotelBookingSystem';
```

## Migrating Existing Data

To migrate your existing JSON data to MongoDB:

1. Make sure MongoDB is running
2. Run the migration script:

```bash
cd backend
npm run migrate-to-mongodb
```

This will copy all your existing data from the JSON files to MongoDB.

## Checking MongoDB Status

You can check the MongoDB connection status by accessing the following API endpoint:

```
GET /api/admin/mongodb-status
```

This will return:
- `status: "connected"` if MongoDB is connected
- `status: "disconnected"` if MongoDB is unavailable

## Fallback to JSON Storage

If MongoDB is unavailable, the system will automatically fall back to using JSON files for storage. This ensures your application continues to work even if the database service is down.

The following operations use both MongoDB and JSON storage:
- Creating bookings
- Confirming bookings
- Cancelling bookings
- Retrieving bookings

## Adding More Collections

If you want to add more collections to MongoDB, follow this pattern:

1. Add migration logic to `scripts/migrateToMongoDB.js`
2. Update the relevant route handlers to use both MongoDB and JSON storage

## Troubleshooting

If you encounter issues with MongoDB:

1. Ensure MongoDB is running on your system
2. Check the connection URL in `db/mongodb.js`
3. Verify you have proper permissions to access the database
4. Check server logs for detailed error messages 