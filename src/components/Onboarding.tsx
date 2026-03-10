import React, { useState } from 'react';
import { ActivityLevel, Gender, Goal, UserProfile } from '../types';
import { dbService } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user } = useAuth();
  const [age, setAge] = useState<number>(30);
  const [weight, setWeight] = useState<number>(70);
  const [height, setHeight] = useState<number>(170);
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTDEE = () => {
    // Mifflin-St Jeor Equation
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr += gender === 'male' ? 5 : -161;

    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    let tdee = bmr * activityMultipliers[activityLevel];

    if (goal === 'lose') tdee -= 500;
    if (goal === 'gain') tdee += 500;

    // Macros: 30% Protein, 40% Carbs, 30% Fats
    const protein = (tdee * 0.3) / 4;
    const carbs = (tdee * 0.4) / 4;
    const fats = (tdee * 0.3) / 9;

    return {
      calories: Math.round(tdee),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fats: Math.round(fats),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const targets = calculateTDEE();
      const isAdmin = user.email === 'hila.mazor.mail@gmail.com';
      const profile: Omit<UserProfile, 'userId'> = {
        email: user.email || undefined,
        displayName: user.displayName || undefined,
        age,
        weight,
        height,
        gender,
        activityLevel,
        goal,
        targets,
        status: isAdmin ? 'approved' : 'pending',
        role: isAdmin ? 'admin' : 'user',
      };
      await dbService.saveProfile(user.uid, profile);
      onComplete();
    } catch (error) {
      console.error('Failed to save profile', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MacroTrack</h1>
        <p className="text-gray-500 mb-8">Let's set up your daily targets.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="sedentary">Sedentary (office job)</option>
              <option value="light">Light Exercise (1-2 days/week)</option>
              <option value="moderate">Moderate Exercise (3-5 days/week)</option>
              <option value="active">Heavy Exercise (6-7 days/week)</option>
              <option value="very_active">Athlete (2x per day)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
            <div className="grid grid-cols-3 gap-2">
              {(['lose', 'maintain', 'gain'] as Goal[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(g)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    goal === g
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
          >
            {isSubmitting ? 'Saving...' : 'Calculate Targets'}
          </button>
        </form>
      </div>
    </div>
  );
};
