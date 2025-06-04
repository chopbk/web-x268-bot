const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  try {
    const users = process.env.USERS.toUpperCase().split(",") || ["V"];
    res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

module.exports = router;
