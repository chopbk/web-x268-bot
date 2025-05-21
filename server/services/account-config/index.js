const MongoDb = require("../database/mongodb");

// Log để debug
console.log("MongoDb:", MongoDb);
console.log("AccountConfigModel:", MongoDb.AccountConfigModel);
console.log("UserAccountModel:", MongoDb.UserAccountModel);
const formatResponse = (configs, user) => {
  return configs.map((config) => {
    return {
      id: config._id,
      user: user.toUpperCase(),
      accountSignal: config.env.toUpperCase(),

      signal: config.signals,
      on: config.trade_config.ON,
      openType: config.trade_config.OPEN.TYPE,
      volume:
        config.trade_config.FIX_COST_AMOUNT * config.trade_config.FIX_LEVERAGE,
      blacklist: config.blacklist,
      trade_config: config.trade_config,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  });
};
// Service methods
const AccountConfigService = {
  // Tìm tất cả configs theo danh sách users
  findByUsers: async (users) => {
    try {
      let results = [];
      const AccountConfig = MongoDb.AccountConfigModel;
      const UserAccount = MongoDb.UserAccountModel;
      console.log("Finding configs for users:", users);
      console.log("UserAccount model:", UserAccount);
      await Promise.all(
        users.map(async (user) => {
          let userAccount = await UserAccount.findOne({
            username: user.toUpperCase(),
          });
          let accountConfigs = await AccountConfig.find({
            env: { $in: userAccount.accounts },
          })
            .sort({ createdAt: -1 })
            .lean();

          results.push(...formatResponse(accountConfigs, user));
        })
      );

      return results;
    } catch (error) {
      console.error("Error finding configs by users:", error);
      throw error;
    }
  },

  // Tìm config theo ID
  findById: async (id) => {
    try {
      return await AccountConfig.findById(id);
    } catch (error) {
      console.error("Error finding config by id:", error);
      throw error;
    }
  },

  // Tìm config theo user
  findByUser: async (user) => {
    try {
      return await AccountConfig.find({ user: user.toUpperCase() });
    } catch (error) {
      console.error("Error finding configs by user:", error);
      throw error;
    }
  },

  // Tìm config theo accountSignal và users
  findByAccountSignalAndUsers: async (accountSignal, users) => {
    try {
      return await AccountConfig.find({
        accountSignal,
        user: { $in: users.map((user) => user.toUpperCase()) },
      });
    } catch (error) {
      console.error("Error finding configs by accountSignal and users:", error);
      throw error;
    }
  },

  // Tạo config mới
  create: async (configData) => {
    try {
      const config = new AccountConfig({
        ...configData,
        user: configData.user.toUpperCase(),
        updatedAt: new Date(),
      });
      return await config.save();
    } catch (error) {
      console.error("Error creating config:", error);
      throw error;
    }
  },

  // Cập nhật config
  update: async (id, updateData) => {
    try {
      if (updateData.user) {
        updateData.user = updateData.user.toUpperCase();
      }
      updateData.updatedAt = new Date();

      return await AccountConfig.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    } catch (error) {
      console.error("Error updating config:", error);
      throw error;
    }
  },

  // Xóa config
  delete: async (id) => {
    try {
      return await AccountConfig.findByIdAndDelete(id);
    } catch (error) {
      console.error("Error deleting config:", error);
      throw error;
    }
  },

  // Tìm kiếm configs với nhiều điều kiện
  search: async (query) => {
    try {
      const { user, accountSignal, signal, on, openType, users } = query;
      const searchQuery = {};

      if (users) {
        searchQuery.user = { $in: users.map((user) => user.toUpperCase()) };
      } else if (user) {
        searchQuery.user = user.toUpperCase();
      }
      if (accountSignal) searchQuery.accountSignal = accountSignal;
      if (signal) searchQuery.signal = signal;
      if (on !== undefined) searchQuery.on = on;
      if (openType) searchQuery.openType = openType;

      return await AccountConfig.find(searchQuery).sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error searching configs:", error);
      throw error;
    }
  },

  // Khởi tạo dữ liệu mẫu
  init: async (users) => {
    try {
      // Xóa tất cả configs cũ
      await AccountConfig.deleteMany({});

      // Tạo configs mẫu cho mỗi user
      const configs = [];
      for (const user of users) {
        configs.push({
          user: user.toUpperCase(),
          accountSignal: "DEFAULT",
          signal: "DEFAULT",
          blacklist: "",
          on: true,
          volume: 0,
          openType: "MARKET",
        });
      }

      await AccountConfig.insertMany(configs);
      console.log("Account configs initialized");
    } catch (error) {
      console.error("Error initializing account configs:", error);
      throw error;
    }
  },
};

module.exports = AccountConfigService;
