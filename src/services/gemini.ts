import { GoogleGenAI, Type } from '@google/genai';
import { Macros, MealType } from '../types';

// Manual Library Definitions
const LOCAL_LIBRARY: Record<string, { kcalPer100g: number, proteinPer100g: number, carbsPer100g: number, fatsPer100g: number, isAnimalProtein: boolean }> = {
  rice: { kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatsPer100g: 0.3, isAnimalProtein: false },
};

const PIECE_LIBRARY: Record<string, { kcal: number, protein: number, carbs: number, fats: number, isAnimalProtein: boolean, defaultName: string }> = {
  'seaweed snack': { kcal: 30, protein: 0, carbs: 1, fats: 2, isAnimalProtein: false, defaultName: 'Seaweed Snack' },
};

function parseLocally(query: string): { items: { name: string; macros: Macros }[] } | null {
  const items: { name: string; macros: Macros }[] = [];
  
  // Try to split query by commas
  const parts = query.toLowerCase().split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (!part) continue;

    let matched = false;

    // Check for "Xg YYY" or "X grams YYY"
    let weightMatch = part.match(/^(\d+(?:\.\d+)?)\s*(?:g|grams?)\s+(.+)$/);
    if (weightMatch) {
      const amount = parseFloat(weightMatch[1]);
      const food = weightMatch[2].trim();
      
      let foundKey = Object.keys(LOCAL_LIBRARY).find(k => food.includes(k));
      if (foundKey) {
        const data = LOCAL_LIBRARY[foundKey];
        items.push({
          name: `${amount}g ${foundKey.charAt(0).toUpperCase() + foundKey.slice(1)}`,
          macros: {
            calories: (data.kcalPer100g * amount) / 100,
            protein: data.isAnimalProtein ? (data.proteinPer100g * amount) / 100 : 0, 
            carbs: (data.carbsPer100g * amount) / 100,
            fats: (data.fatsPer100g * amount) / 100,
          }
        });
        matched = true;
        continue;
      }
    }
     
    // Check piece library (e.g., "1 seaweed snack", "seaweed snack", "2 eggs")
    let pieceMatch = part.match(/^(?:(\d+(?:\.\d+)?)\s+)?(.+)$/);
    if (pieceMatch) {
      const amount = pieceMatch[1] ? parseFloat(pieceMatch[1]) : 1;
      const food = pieceMatch[2].trim();
      
      let foundPiece = Object.keys(PIECE_LIBRARY).find(k => food.includes(k));
      if (foundPiece) {
        const data = PIECE_LIBRARY[foundPiece];
        items.push({
          name: amount === 1 ? data.defaultName : `${amount} ${data.defaultName}s`,
          macros: {
            calories: data.kcal * amount,
            protein: data.isAnimalProtein ? data.protein * amount : 0,
            carbs: data.carbs * amount,
            fats: data.fats * amount,
          }
        });
        matched = true;
        continue;
      }
    }
     
    // If we couldn't parse even one part manually, we fail local parsing completely and let Gemini handle it
    if (!matched) {
      return null;
    }
  }
  
  if (items.length > 0) return { items };
  return null;
}

export const parseFoodEntry = async (
  query: string,
  mealType: MealType
): Promise<{ items: { name: string; macros: Macros }[] }> => {
  // 1. Try Manual Analysis directly
  const localResult = parseLocally(query);
  if (localResult) {
    return localResult;
  }

  // 2. Go to Gemini as fallback
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    Role: Practical and concise nutrition assistant.

    Objective: Estimate macros for the user's proposed meals.
    The user will provide a food entry (like "120g eggs, 100g tuna" or "a bowl of cereal").
    CRITICAL: You MUST break down the user's input into separate, distinct ingredients. 

    Core Rule (Protein Constraints): ONLY count high-quality protein from animal and dairy sources (e.g., meat, poultry, fish, eggs, dairy, whey). DO NOT count or include any trace protein from carbs, vegetables, or plant sources (set their protein to 0).

    Naming Rule: Show how many grams or pieces the user ate of a specific item in the name. For example, if the user prompts "100 g rice", write "100g Rice" in the title/name.

    Context: This is for a ${mealType}.
    - If it's a main meal (breakfast, lunch, dinner), assume standard cooking oils if not specified.
    - If it's a snack, look for single items or branded items quickly.
    
    Return the result strictly as a JSON object matching the requested schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            description: 'A list of distinct ingredients that make up the meal.',
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: 'A concise, clean name for the specific ingredient, including the weight/amount requested (e.g., "100g White Rice" or "2 Eggs").',
                },
                macros: {
                  type: Type.OBJECT,
                  properties: {
                    calories: { type: Type.NUMBER, description: 'Total calories (kcal)' },
                    protein: { type: Type.NUMBER, description: 'Total quality protein in grams (0 if plant/carb based)' },
                    carbs: { type: Type.NUMBER, description: 'Total carbohydrates in grams' },
                    fats: { type: Type.NUMBER, description: 'Total fats in grams' },
                  },
                  required: ['calories', 'protein', 'carbs', 'fats'],
                },
              },
              required: ['name', 'macros'],
            }
          }
        },
        required: ['items'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to parse food entry.');
  }

  return JSON.parse(text);
};
