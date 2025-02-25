// lib/mongodb.js
import { MongoClient } from 'mongodb';

if (!process.env.NEXT_PUBLIC_MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable so the client is reused
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client for every instance
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
