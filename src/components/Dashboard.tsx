import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ProgressCircle } from './ProgressCircle';
import { dbService } from '../services/db';
import { getTodayStr } from '../utils/storage';
import { FoodEntry, MealType, UserProfile, DailyLog, SavedMeal } from '../types';
import { parseFoodEntry } from '../services/gemini';
import { Plus, Loader2, Bookmark, Trash2, ChevronDown, ChevronUp, Edit2, Library, X, Check, Settings } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [log, setLog] = useState<DailyLog>({ userId: user?.uid || '', date: getTodayStr(), entries: [] });
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [input, setInput] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSnacks, setExpandedSnacks] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Goals Edit State
  const [showEditGoals, setShowEditGoals] = useState(false);
  const [editGoalCalories, setEditGoalCalories] = useState(0);
  const [editGoalProtein, setEditGoalProtein] = useState(0);
  const [editGoalCarbs, setEditGoalCarbs] = useState(0);
  const [editGoalFats, setEditGoalFats] = useState(0);
  
  // Edit State
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState(0);
  const [editProtein, setEditProtein] = useState(0);
  const [editCarbs, setEditCarbs] = useState(0);
  const [editFats, setEditFats] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    
    dbService.getProfile(user.uid).then(setProfile);
    dbService.getSavedMeals(user.uid).then(setSavedMeals);
    
    const unsubscribe = dbService.subscribeToDailyLog(user.uid, getTodayStr(), (updatedLog) => {
      setLog(updatedLog);
    });
    
    return () => unsubscribe();
  }, [user]);

  const refreshSavedMeals = async () => {
    if (user) {
      const meals = await dbService.getSavedMeals(user.uid);
      setSavedMeals(meals);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Check local library
      const savedMeal = await dbService.findMealByName(user.uid, input.trim());
      
      let newEntry: FoodEntry;

      if (savedMeal) {
        newEntry = {
          id: Date.now().toString(),
          name: savedMeal.name,
          macros: savedMeal.macros,
          mealType: selectedMeal,
          timestamp: new Date().toISOString(),
          isSavedMeal: true,
        };
        await dbService.incrementMealUsage(user.uid, savedMeal.id);
      } else {
        // 2. AI API Call
        const parsed = await parseFoodEntry(input, selectedMeal);
        newEntry = {
          id: Date.now().toString(),
          name: parsed.name,
          macros: parsed.macros,
          mealType: selectedMeal,
          timestamp: new Date().toISOString(),
          isSavedMeal: false,
        };
      }

      await dbService.addEntry(user.uid, getTodayStr(), newEntry);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      await refreshSavedMeals();
    } catch (err: any) {
      setError(err.message || 'Failed to parse entry. Check API key or try a different description.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFromLibrary = async (meal: SavedMeal) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const newEntry: FoodEntry = {
        id: Date.now().toString(),
        name: meal.name,
        macros: meal.macros,
        mealType: selectedMeal,
        timestamp: new Date().toISOString(),
        isSavedMeal: true,
      };
      await dbService.addEntry(user.uid, getTodayStr(), newEntry);
      await dbService.incrementMealUsage(user.uid, meal.id);
      setShowLibrary(false);
      await refreshSavedMeals();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (user) {
      await dbService.removeEntry(user.uid, getTodayStr(), id);
    }
  };

  const handleSaveMeal = async (entry: FoodEntry) => {
    if (user) {
      await dbService.saveMeal(user.uid, {
        id: Date.now().toString(),
        name: entry.name,
        macros: entry.macros,
        usageCount: 1,
      });
      const updatedLog = { ...log };
      const e = updatedLog.entries.find(e => e.id === entry.id);
      if (e) e.isSavedMeal = true;
      await dbService.saveDailyLog(user.uid, updatedLog);
      await refreshSavedMeals();
    }
  };

  const startEditing = (entry: FoodEntry) => {
    setEditingEntry(entry);
    setEditName(entry.name);
    setEditCalories(entry.macros.calories);
    setEditProtein(entry.macros.protein);
    setEditCarbs(entry.macros.carbs);
    setEditFats(entry.macros.fats);
  };

  const saveEdit = async () => {
    if (user && editingEntry) {
      const updatedEntry: FoodEntry = {
        ...editingEntry,
        name: editName,
        macros: {
          calories: Number(editCalories) || 0,
          protein: Number(editProtein) || 0,
          carbs: Number(editCarbs) || 0,
          fats: Number(editFats) || 0,
        }
      };
      
      setEditingEntry(null);
      await dbService.updateEntry(user.uid, getTodayStr(), editingEntry.id, updatedEntry);
    }
  };

  const openEditGoals = () => {
    if (profile) {
      setEditGoalCalories(profile.targets.calories);
      setEditGoalProtein(profile.targets.protein);
      setEditGoalCarbs(profile.targets.carbs);
      setEditGoalFats(profile.targets.fats);
      setShowEditGoals(true);
    }
  };

  const saveGoals = async () => {
    if (user && profile) {
      const updatedProfile = {
        ...profile,
        targets: {
          calories: Number(editGoalCalories) || 0,
          protein: Number(editGoalProtein) || 0,
          carbs: Number(editGoalCarbs) || 0,
          fats: Number(editGoalFats) || 0,
        }
      };
      await dbService.saveProfile(user.uid, updatedProfile);
      setProfile(updatedProfile);
      setShowEditGoals(false);
    }
  };

  if (!profile) return null;

  const consumed = log.entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.macros.calories,
      protein: acc.protein + entry.macros.protein,
      carbs: acc.carbs + entry.macros.carbs,
      fats: acc.fats + entry.macros.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const renderMealSection = (type: MealType, title: string) => {
    const entries = log.entries.filter(e => e.mealType === type);
    const isSnack = type === 'snack';
    
    if (isSnack && !expandedSnacks && entries.length === 0) {
      return (
        <button 
          onClick={() => setExpandedSnacks(true)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">Snacks</span>
          <ChevronDown className="w-5 h-5" />
        </button>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div 
          className={cn(
            "px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center",
            isSnack && "cursor-pointer hover:bg-gray-50 transition-colors"
          )}
          onClick={() => isSnack && setExpandedSnacks(!expandedSnacks)}
        >
          <h3 className="font-semibold text-gray-900 capitalize">{title}</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">
              {Math.round(entries.reduce((sum, e) => sum + e.macros.calories, 0))} kcal
            </span>
            {isSnack && (
              expandedSnacks ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
        
        {(!isSnack || expandedSnacks) && (
          <div className="divide-y divide-gray-50">
            {entries.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center italic">No entries yet</div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="p-4 group">
                  {editingEntry?.id === entry.id ? (
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium uppercase">Kcal</label>
                          <input type="number" value={editCalories} onChange={(e) => setEditCalories(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium uppercase">Pro</label>
                          <input type="number" value={editProtein} onChange={(e) => setEditProtein(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium uppercase">Carb</label>
                          <input type="number" value={editCarbs} onChange={(e) => setEditCarbs(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium uppercase">Fat</label>
                          <input type="number" value={editFats} onChange={(e) => setEditFats(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setEditingEntry(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{entry.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {Math.round(entry.macros.protein)}g P • {Math.round(entry.macros.carbs)}g C • {Math.round(entry.macros.fats)}g F
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditing(entry)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Entry"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!entry.isSavedMeal && (
                          <button 
                            onClick={() => handleSaveMeal(entry)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Save to Library"
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-md mx-auto min-h-screen bg-gray-50 pb-64"
    >
      {/* Header / Macros */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-white px-6 py-8 rounded-b-[2.5rem] shadow-sm mb-6"
      >
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500 tracking-tight mb-1">Macro Tracker</h1>
            <p className="text-sm text-gray-500 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <button 
            onClick={openEditGoals}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="Edit Goals"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-8">
          <ProgressCircle
            label="Calories"
            consumed={consumed.calories}
            goal={profile.targets.calories}
            colorClass="text-indigo-600"
            size="lg"
          />
        </div>

        <div className="flex justify-between px-2">
          <ProgressCircle
            label="Protein"
            consumed={consumed.protein}
            goal={profile.targets.protein}
            colorClass="text-emerald-500"
            size="md"
          />
          <ProgressCircle
            label="Carbs"
            consumed={consumed.carbs}
            goal={profile.targets.carbs}
            colorClass="text-amber-500"
            size="md"
          />
          <ProgressCircle
            label="Fats"
            consumed={consumed.fats}
            goal={profile.targets.fats}
            colorClass="text-rose-500"
            size="md"
          />
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="px-4 space-y-4"
      >
        {renderMealSection('breakfast', 'Breakfast')}
        {renderMealSection('lunch', 'Lunch')}
        {renderMealSection('dinner', 'Dinner')}
        {renderMealSection('snack', 'Snacks')}
      </motion.div>

      {/* Edit Goals Modal */}
      {showEditGoals && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Goals</h3>
              <button onClick={() => setShowEditGoals(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calories (kcal)</label>
                <input type="number" value={editGoalCalories} onChange={(e) => setEditGoalCalories(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                  <input type="number" value={editGoalProtein} onChange={(e) => setEditGoalProtein(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                  <input type="number" value={editGoalCarbs} onChange={(e) => setEditGoalCarbs(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fats (g)</label>
                  <input type="number" value={editGoalFats} onChange={(e) => setEditGoalFats(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            <button 
              onClick={saveGoals}
              className="w-full mt-6 bg-indigo-600 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Input (Sticky Bottom) */}
      <div className="fixed bottom-[72px] left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-4 pb-safe z-40">
        <div className="max-w-md mx-auto relative">
          
          {/* Library Dropdown */}
          {showLibrary && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
              <div className="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h4 className="text-sm font-semibold text-gray-700">Meal Library</h4>
                <button onClick={() => setShowLibrary(false)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              {savedMeals.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">No saved meals yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {savedMeals.map(meal => (
                    <button
                      key={meal.id}
                      onClick={() => handleAddFromLibrary(meal)}
                      className="w-full text-left p-3 hover:bg-indigo-50 transition-colors flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{meal.name}</p>
                        <p className="text-xs text-gray-500">{Math.round(meal.macros.calories)} kcal</p>
                      </div>
                      <Plus className="w-4 h-4 text-indigo-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleAddEntry} className="flex flex-col gap-2">
            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg border border-red-100 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowLibrary(!showLibrary)}
                  className="bg-indigo-50 text-indigo-600 p-3 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center"
                  title="Meal Library"
                >
                  <Library className="w-5 h-5" />
                </button>
                <select
                  value={selectedMeal}
                  onChange={(e) => setSelectedMeal(e.target.value as MealType)}
                  className="bg-gray-100 border-none text-xs font-medium text-gray-700 rounded-xl px-2 py-3 outline-none focus:ring-2 focus:ring-indigo-500 h-[44px]"
                >
                  <option value="breakfast">🍳 Brkfst</option>
                  <option value="lunch">🥗 Lunch</option>
                  <option value="dinner">🥩 Dinner</option>
                  <option value="snack">🍎 Snack</option>
                </select>
              </div>

              <div className="relative flex-1 bg-gray-100 rounded-2xl border-2 border-transparent focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-xl focus-within:-translate-y-2 transition-all duration-300 ease-out flex items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddEntry(e);
                    }
                  }}
                  placeholder='e.g. "120g eggs, 100g tuna"'
                  className="w-full bg-transparent border-none text-gray-900 pl-4 pr-12 py-3 outline-none placeholder:text-gray-400 resize-none min-h-[48px] focus:min-h-[130px] transition-all duration-300 ease-out"
                  rows={1}
                  disabled={isLoading}
                />
                <div className="absolute right-2 bottom-1.5 flex items-center">
                  {isLoading ? (
                    <div className="p-1.5 text-indigo-600 flex items-center gap-2">
                      <span className="text-xs font-medium animate-pulse hidden sm:inline-block">Parsing...</span>
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};
