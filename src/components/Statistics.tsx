import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { DailyLog, SavedMeal } from '../types';
import { format, subDays, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Statistics: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [frequentMeals, setFrequentMeals] = useState<SavedMeal[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const allLogs = await dbService.getAllLogs(user.uid);
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        return allLogs[date] || { userId: user.uid, date, entries: [] };
      }).reverse();
      
      setLogs(last7Days);

      const meals = await dbService.getSavedMeals(user.uid);
      const sortedMeals = meals
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5);
      setFrequentMeals(sortedMeals);
    };

    fetchData();
  }, [user]);

  const chartData = logs.map(log => {
    const totals = log.entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.macros.calories,
        protein: acc.protein + entry.macros.protein,
      }),
      { calories: 0, protein: 0 }
    );
    return {
      name: format(parseISO(log.date), 'EEE'),
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
    };
  });

  const handleQuickAdd = async (meal: SavedMeal) => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await dbService.addEntry(user.uid, todayStr, {
      id: Date.now().toString(),
      name: meal.name,
      macros: meal.macros,
      mealType: 'snack', // Default to snack for quick add, user can change later
      timestamp: new Date().toISOString(),
      isSavedMeal: true,
    });
    await dbService.incrementMealUsage(user.uid, meal.id);
    alert(`Added ${meal.name} to today's log!`);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 p-6 pb-32">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Hello, {user?.displayName ? user.displayName.split(' ')[0] : 'there'}! 👋
      </h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-8">Insights</h2>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Last 7 Days</h2>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                yAxisId="left" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="calories" 
                stroke="#4f46e5" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Calories"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="protein" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Protein (g)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Frequent Foods */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequent Meals</h2>
        {frequentMeals.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4">No saved meals yet. Add some from the dashboard!</p>
        ) : (
          <div className="space-y-3">
            {frequentMeals.map(meal => (
              <div key={meal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{meal.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(meal.macros.calories)} kcal • {Math.round(meal.macros.protein)}g P
                  </p>
                </div>
                <button
                  onClick={() => handleQuickAdd(meal)}
                  className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm hover:shadow-md transition-all group-hover:scale-105"
                  title="Add to today"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
