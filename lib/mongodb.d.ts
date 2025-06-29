import { Db } from 'mongodb';

export interface DatabaseConnection {
  db: Db;
  client?: any;
}

export function connectToDatabase(): Promise<DatabaseConnection>; 