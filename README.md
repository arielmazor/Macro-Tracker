# Macro-Tracker

An AI-powered nutrition and macro-tracking application that allows you to easily log your meals using natural language. Built with React, Vite, Tailwind CSS, Firebase, and the Google Gemini API.

View your app in AI Studio: https://ai.studio/apps/ddbb1029-07a9-4a0c-aa32-16ce2742dedd

## Features

- **AI-Powered Food Logging:** Just type what you ate (e.g., "120g eggs, 100g tuna") and the app will use Gemini AI to automatically parse and calculate calories, protein, carbs, and fats.
- **Progress Tracking:** Interactive dashboard with progress circles for your daily calorie and macronutrient goals.
- **Meal Library:** Save your frequent meals and add them with a single click.
- **Statistics & Insights:** View daily and historical data of your macronutrient intake.
- **Admin Dashboard:** Manage user access and permissions.
- **Cloud Sync:** Data is securely stored and synchronized in real-time across devices using Firebase Firestore.

## Technologies Used

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend/Database:** Firebase (Authentication and Firestore)
- **AI Integration:** Google Gemini API (`@google/genai`)

## Run Locally

**Prerequisites:** Node.js, Firebase Project, Gemini API Key

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` or `.env.local` file in the root of your project based on `.env.example`. You will need to provide your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Firebase Setup
Ensure your Firebase configuration is correctly set up. You will need to:
1. Create a Firebase project and enable Authentication (e.g., Google Sign-In) and Firestore.
2. In the Firebase Console, go to Authentication -> Settings -> Authorized domains and add `localhost` (and `127.0.0.1` if necessary).
3. The app's Firebase initialization is handled in `src/firebase.ts`. You may need to provide your Firebase config via environment variables or hardcoded values if not using the default config blueprint.

### 4. Run the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### 5. Build for Production
To create a production build:
```bash
npm run build
```
You can then preview the build using:
```bash
npm run preview
```
