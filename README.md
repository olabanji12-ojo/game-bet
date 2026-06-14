# SIM_BET.ARCH - Sports Betting Simulator

A high-performance, full-stack prototype of a sports betting platform. It features a React frontend utilizing modern state-management patterns and an Express.js backend that simulates a continuous, live-ticking odds event bus.

## 🚀 Features

*   **Live Event Bus:** An Express server continuously generates and broadcasts simulated match data, score updates, and fluctuating odds.
*   **Modular Architecture:** The frontend is built using **TanStack Query** (React Query) for server-state synchronization (polling the event bus) and **Zustand** for hyper-fast client-state management.
*   **Bet Slip Engine:** Assemble betting tickets seamlessly. Supports both **Single** and **Accumulator** (Parlay) bets, with real-time combined odds and potential payout calculations.
*   **Playground Wallet:** A mock wallet system allowing you to deposit play credits and place wagers.
*   **Admin Settle Tool:** A manual control panel to finalize matches, trigger settlements, and automatically process winning/losing tickets across the system.

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Vite, TailwindCSS (Vanilla CSS styling), Lucide-React
*   **State Management:** TanStack Query v5, Zustand
*   **Backend:** Express.js, Node.js (with internal mocked database and event bus)

## 💻 Local Development

To run this simulator locally on your machine:

1.  **Install dependencies**
    ```bash
    npm install
    ```

2.  **Start the Full-Stack Dev Server**
    ```bash
    npm run dev
    ```
    *This will simultaneously start the Express API backend and the Vite frontend server.*

3.  Open `http://localhost:5173` in your browser.

## ☁️ Deployment (Render.com)

This application is configured as a unified full-stack build, meaning both the frontend and backend are served together in production. It is optimized for deployment on platforms that support persistent Node.js servers, like **Render.com**.

1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Set the **Build Command**:
   ```bash
   npm run build
   ```
3. Set the **Start Command**:
   ```bash
   npm run start
   ```

*(Render will automatically assign the `PORT` environment variable, which the Express server will securely bind to).*
