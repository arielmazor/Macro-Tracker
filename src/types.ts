export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Gender = 'male' | 'female';

export interface UserProfile {
  userId: string;
  email?: string;
  displayName?: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  targets: Macros;
  status: 'pending' | 'approved' | 'rejected';
  role: 'admin' | 'user';
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  name: string;
  macros: Macros;
  mealType: MealType;
  timestamp: string;
  isSavedMeal?: boolean;
}

export interface SavedMeal {
  userId: string;
  id: string;
  name: string;
  macros: Macros;
  usageCount: number;
}

export interface DailyLog {
  userId: string;
  date: string; // YYYY-MM-DD
  entries: FoodEntry[];
}
