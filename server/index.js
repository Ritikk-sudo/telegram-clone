import express from "express";
import "dotenv/config";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import userRouter from "./userRoutes.js";
import { Server } from "socket.io";
import { User } from "./userModel.js";
import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);
const { PORT } = process.env || "4000";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from server");
});

mongoose.connect(process.env.MONGO_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
  server.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
  });
});

const io = new Server(server, {
  cors: {
    origin: "https://telegram-client-omega.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("joined", () => {
    io.sockets.emit("new-user", "new user joined");
  });

  socket.on("private message", async (to, message, mySelf) => {
    const user = await User.find({ email: to });
    const decoded = jwt.verify(mySelf, process.env.ACCESS_TOKEN_SECRET);
    const sender = await User.findById(decoded);
    io.sockets.emit("refresh", "new Message");

    if (user) {
      user[0].messages.push({
        reciver: user[0].email,
        message,
        sender: sender?.email,
        time: new Date(),
      });
      sender?.messages.push({
        reciver: user[0].email,
        message,
        sender: sender?.email,
        time: new Date(),
      });
      await user[0].save();
      await sender?.save();
    }
  });
});

app.use("/", userRouter);
