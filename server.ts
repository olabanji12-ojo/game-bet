import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { db } from "./src/server/db";
import { workerService } from "./src/server/workers";
import { eventBus } from "./src/server/eventBus";
import { BetCalculationFactory } from "./src/server/factory";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Initialize Background Worker Service
  workerService.initialize();

  // Unified State API (Perfect for polling, guarantees front-to-back synchronization)
  app.get("/api/state", (req, res) => {
    try {
      res.json({
        wallet: db.getWallet(),
        matches: db.getMatches(),
        bets: db.getBets(),
        events: eventBus.getHistory().slice(-30).reverse() // Return latest 30 system events
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Wallet API
  app.get("/api/wallet", (req, res) => {
    res.json(db.getWallet());
  });

  app.post("/api/wallet/reset", (req, res) => {
    const updatedWallet = db.resetWalletBalance();
    res.json({ success: true, wallet: updatedWallet });
  });

  app.post("/api/wallet/deposit", (req, res) => {
    const { amount } = req.body;
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, error: "Deposit amount must be a positive number." });
    }
    try {
      const updatedWallet = db.depositWalletCustom(numericAmount);
      res.json({ success: true, wallet: updatedWallet });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  });

  // Matches API
  app.get("/api/matches", (req, res) => {
    res.json(db.getMatches());
  });

  // Bets API
  app.get("/api/bets", (req, res) => {
    res.json(db.getBets());
  });

  // Placed Bet Transaction Engine
  app.post("/api/bets/place", (req, res) => {
    const { type, selections, stake } = req.body;

    if (!type || !selections || !Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid selections or bet type configuration." });
    }

    const numericalStake = parseFloat(stake);
    if (isNaN(numericalStake) || numericalStake <= 0) {
      return res.status(400).json({ success: false, error: "Stake must be a valid positive number." });
    }

    try {
      // 1. Calculate and validation outcome using Creational Factory pattern
      const calcResult = BetCalculationFactory.run(type, selections, numericalStake);
      
      if (!calcResult.isValid) {
        return res.status(400).json({ success: false, error: calcResult.errorMessage || "Calculation validation failed." });
      }

      // 2. Perform safe, atomic placement (All-or-Nothing database transaction)
      const bet = db.placeBetTx(type, selections, numericalStake, calcResult.potentialPayout);

      res.status(201).json({ success: true, bet });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  });

  // Admin Control Panel endpoint for Settle Match manually
  app.post("/api/admin/settle", (req, res) => {
    const { matchId, result, overUnderResult, score } = req.body;

    if (!matchId || !result || !overUnderResult || !score) {
      return res.status(400).json({ success: false, error: "Missing required admin fields for settlement processing." });
    }

    try {
      const match = db.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ success: false, error: "Target match structure could not be located." });
      }

      if (match.status === "Settled") {
        return res.status(400).json({ success: false, error: "This match is already finalized and settled." });
      }

      const success = db.settleMatch(matchId, result, overUnderResult, score);
      
      if (success) {
        res.json({ success: true, message: `Match ${matchId} settled successfully.` });
      } else {
        res.status(500).json({ success: false, error: "Encountered a database error when settling match." });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // Setup Vite Dev Middleware or Serve Static Files for Production
  if (process.env.NODE_ENV !== "production") {
    console.log("[Express] Development mode: Injecting Vite Dev Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Express] Production mode: Serving compiled client static build directory...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // PORT 3000 is externally bound and required
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Core full-stack sports betting server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[Express] Critical failure during server startup:", error);
  process.exit(1);
});
