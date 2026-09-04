import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { connectDatabase } from "./config/db.js";
import routes from "./routes/index.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.json({
    name: "ClosetAI API",
    status: "running",
    docs: "/api/health",
  });
});

connectDatabase().then(() => {
  app.listen(port, () => {
    console.log(`ClosetAI API listening on port ${port}`);
  });
});
