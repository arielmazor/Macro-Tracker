import { doc, getDoc, setDoc, collection, getDocs, query, where, deleteDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, DailyLog, FoodEntry, SavedMeal } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // Profile
  getProfile: async (userId: string): Promise<UserProfile | null> => {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },
  saveProfile: async (userId: string, profile: Omit<UserProfile, 'userId'>) => {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, { ...profile, userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getAllUsers: async (): Promise<UserProfile[]> => {
    const path = 'users';
    try {
      const q = collection(db, 'users');
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  updateUserStatus: async (userId: string, status: 'approved' | 'rejected') => {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Daily Logs
  subscribeToDailyLog: (userId: string, dateStr: string, callback: (log: DailyLog) => void) => {
    const path = `users/${userId}/dailyLogs/${dateStr}`;
    const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as DailyLog);
      } else {
        callback({ userId, date: dateStr, entries: [] });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  getDailyLog: async (userId: string, dateStr: string): Promise<DailyLog> => {
    const path = `users/${userId}/dailyLogs/${dateStr}`;
    try {
      const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as DailyLog) : { userId, date: dateStr, entries: [] };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return { userId, date: dateStr, entries: [] };
    }
  },
  getAllLogs: async (userId: string): Promise<Record<string, DailyLog>> => {
    const path = `users/${userId}/dailyLogs`;
    try {
      const q = collection(db, 'users', userId, 'dailyLogs');
      const querySnapshot = await getDocs(q);
      const logs: Record<string, DailyLog> = {};
      querySnapshot.forEach((doc) => {
        logs[doc.id] = doc.data() as DailyLog;
      });
      return logs;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return {};
    }
  },
  saveDailyLog: async (userId: string, log: DailyLog) => {
    const path = `users/${userId}/dailyLogs/${log.date}`;
    try {
      const docRef = doc(db, 'users', userId, 'dailyLogs', log.date);
      await setDoc(docRef, { ...log, userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  addEntry: async (userId: string, dateStr: string, entry: FoodEntry) => {
    const log = await dbService.getDailyLog(userId, dateStr);
    log.entries.push(entry);
    await dbService.saveDailyLog(userId, log);
  },
  updateEntry: async (userId: string, dateStr: string, entryId: string, updatedEntry: FoodEntry) => {
    const log = await dbService.getDailyLog(userId, dateStr);
    const index = log.entries.findIndex(e => e.id === entryId);
    if (index !== -1) {
      log.entries[index] = updatedEntry;
      await dbService.saveDailyLog(userId, log);
    }
  },
  removeEntry: async (userId: string, dateStr: string, entryId: string) => {
    const log = await dbService.getDailyLog(userId, dateStr);
    log.entries = log.entries.filter(e => e.id !== entryId);
    await dbService.saveDailyLog(userId, log);
  },

  // Saved Meals
  getSavedMeals: async (userId: string): Promise<SavedMeal[]> => {
    const path = `users/${userId}/savedMeals`;
    try {
      const q = collection(db, 'users', userId, 'savedMeals');
      const querySnapshot = await getDocs(q);
      const meals: SavedMeal[] = [];
      querySnapshot.forEach((doc) => {
        meals.push(doc.data() as SavedMeal);
      });
      return meals;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  saveMeal: async (userId: string, meal: Omit<SavedMeal, 'userId'>) => {
    const meals = await dbService.getSavedMeals(userId);
    const existingMeal = meals.find(m => m.name.toLowerCase() === meal.name.toLowerCase());
    
    if (existingMeal) {
      const path = `users/${userId}/savedMeals/${existingMeal.id}`;
      try {
        const docRef = doc(db, 'users', userId, 'savedMeals', existingMeal.id);
        await updateDoc(docRef, { usageCount: increment(1) });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      const path = `users/${userId}/savedMeals/${meal.id}`;
      try {
        const docRef = doc(db, 'users', userId, 'savedMeals', meal.id);
        await setDoc(docRef, { ...meal, userId });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  },
  incrementMealUsage: async (userId: string, mealId: string) => {
    const path = `users/${userId}/savedMeals/${mealId}`;
    try {
      const docRef = doc(db, 'users', userId, 'savedMeals', mealId);
      await updateDoc(docRef, { usageCount: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  findMealByName: async (userId: string, name: string): Promise<SavedMeal | undefined> => {
    const meals = await dbService.getSavedMeals(userId);
    return meals.find(m => m.name.toLowerCase() === name.toLowerCase());
  }
};
