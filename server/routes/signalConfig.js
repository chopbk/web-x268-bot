const express = require("express");
const router = express.Router();
const AccountConfigService = require("../services/account-config");

// GET all signal configs
router.get("/", async (req, res) => {
  try {
    console.log("fetching signal configs for users:", req.activeUsers);

    const configs = await AccountConfigService.findByUsers(req.activeUsers);
    res.json(configs);
  } catch (error) {
    console.error("Error fetching signal configs:", error);
    res.status(500).json({ error: "Failed to fetch signal configs" });
  }
});

// GET signal configs by user
router.get("/user/:user", async (req, res) => {
  try {
    const { user } = req.params;
    // Kiểm tra xem user có trong danh sách active users không
    if (!req.activeUsers.includes(user.toUpperCase())) {
      return res.status(403).json({ error: "User not authorized" });
    }
    const configs = await AccountConfigService.findByUser(user);
    res.json(configs);
  } catch (error) {
    console.error("Error fetching signal configs by user:", error);
    res.status(500).json({ error: "Failed to fetch signal configs" });
  }
});

// GET signal configs by accountSignal
router.get("/account/:accountSignal", async (req, res) => {
  try {
    const { accountSignal } = req.params;
    const configs = await AccountConfigService.findByAccountSignalAndUsers(
      accountSignal,
      req.activeUsers
    );
    res.json(configs);
  } catch (error) {
    console.error("Error fetching signal configs by account:", error);
    res.status(500).json({ error: "Failed to fetch signal configs" });
  }
});

// POST create new signal config
router.post("/", async (req, res) => {
  try {
    return "Chưa code xong";
    // Kiểm tra xem user có trong danh sách active users không
    if (!req.activeUsers.includes(req.body.user.toUpperCase())) {
      return res.status(403).json({ error: "User not authorized" });
    }
    const config = await AccountConfigService.create(req.body);
    res.status(201).json(config);
  } catch (error) {
    console.error("Error creating signal config:", error);
    res.status(500).json({ error: "Failed to create signal config" });
  }
});

// PUT update signal config
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Kiểm tra xem user có trong danh sách active users không
    if (
      req.body.user &&
      !req.activeUsers.includes(req.body.user.toUpperCase())
    ) {
      return res.status(403).json({ error: "User not authorized" });
    }
    return "Chưa code xong";
    const config = await AccountConfigService.update(id, req.body);

    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }

    res.json(config);
  } catch (error) {
    console.error("Error updating signal config:", error);
    res.status(500).json({ error: "Failed to update signal config" });
  }
});

// DELETE signal config
router.delete("/:id", async (req, res) => {
  try {
    return "Chưa code xong";
    const { id } = req.params;
    // Lấy config trước khi xóa để kiểm tra user
    const config = await AccountConfigService.findById(id);
    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }
    // Kiểm tra xem user có trong danh sách active users không
    if (!req.activeUsers.includes(config.user.toUpperCase())) {
      return res.status(403).json({ error: "User not authorized" });
    }
    await AccountConfigService.delete(id);
    res.json({ message: "Config deleted successfully" });
  } catch (error) {
    console.error("Error deleting signal config:", error);
    res.status(500).json({ error: "Failed to delete signal config" });
  }
});

// GET search signal configs
router.get("/search", async (req, res) => {
  try {
    return "Chưa code xong";
    const configs = await AccountConfigService.search({
      ...req.query,
      users: req.activeUsers,
    });
    res.json(configs);
  } catch (error) {
    console.error("Error searching signal configs:", error);
    res.status(500).json({ error: "Failed to search signal configs" });
  }
});

module.exports = router;
