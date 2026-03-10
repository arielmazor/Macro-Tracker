import { GoogleGenAI, Type } from '@google/genai';
import { Macros, MealType } from '../types';

export const parseFoodEntry = async (
  query: string,
  mealType: MealType
): Promise<{ name: string; macros: Macros }> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is missing.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are an expert nutritionist and calorie tracking assistant.
    The user will provide a food entry (like "120g eggs, 100g tuna" or "a bowl of cereal").
    Your task is to estimate the macros (calories, protein, carbs, fats) for the given food.
    
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
          name: {
            type: Type.STRING,
            description: 'A concise, clean name for the food entry (e.g., "Eggs and Tuna").',
          },
          macros: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER, description: 'Total calories (kcal)' },
              protein: { type: Type.NUMBER, description: 'Total protein in grams' },
              carbs: { type: Type.NUMBER, description: 'Total carbohydrates in grams' },
              fats: { type: Type.NUMBER, description: 'Total fats in grams' },
            },
            required: ['calories', 'protein', 'carbs', 'fats'],
          },
        },
        required: ['name', 'macros'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to parse food entry.');
  }

  return JSON.parse(text);
};
