import { Firestore, Transaction } from '@google-cloud/firestore';
import { config } from '../config';

export class VisitorCounterService {
  private firestore: Firestore;
  private collectionName: string;
  private documentId: string;

  constructor() {
    this.firestore = new Firestore();
    this.collectionName = process.env.FIRESTORE_COLLECTION || 'visitor_counters';
    this.documentId = process.env.FIRESTORE_DOCUMENT_ID || 'global_counter';
  }

  async incrementCounter(): Promise<number> {
    try {
      const counterRef = this.firestore.collection(this.collectionName).doc(this.documentId);
      
      // Use a transaction to ensure atomic increment
      const newCount = await this.firestore.runTransaction(async (transaction: Transaction) => {
        const doc = await transaction.get(counterRef);
        let currentCount = 0;
        
        if (doc.exists) {
          currentCount = doc.data()?.count || 0;
        }
        
        const newCount = currentCount + 1;
        transaction.set(counterRef, { count: newCount, lastUpdated: new Date() });
        return newCount;
      });

      return newCount;
    } catch (error) {
      console.error('Error incrementing visitor counter:', error);
      throw new Error('Failed to increment visitor counter');
    }
  }

  async getCounter(): Promise<number> {
    try {
      const doc = await this.firestore
        .collection(this.collectionName)
        .doc(this.documentId)
        .get();

      if (!doc.exists) {
        return 0;
      }

      return doc.data()?.count || 0;
    } catch (error) {
      console.error('Error getting visitor counter:', error);
      throw new Error('Failed to get visitor counter');
    }
  }
} 