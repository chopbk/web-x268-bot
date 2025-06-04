const MongoDb = require("./mongodb");

const AccountConfigModel = {
  // Tìm config theo username
  findByAccount: async (account) => {
    try {
      const AccountConfig = MongoDb.AccountConfigModel;
      return await AccountConfig.findOne({ env: account.toUpperCase() });
    } catch (error) {
      console.error("Lỗi khi tìm config theo account:", error);
      throw error;
    }
  },

  findByAccounts: async (accounts) => {
    try {
      const AccountConfig = MongoDb.AccountConfigModel;
      return await AccountConfig.find({ env: { $in: accounts } });
    } catch (error) {
      console.error("Lỗi khi tìm config theo account:", error);
      throw error;
    }
  },
  // Tạo config mới
  create: async (configData) => {
    try {
      const AccountConfig = MongoDb.AccountConfigModel;
      const config = new AccountConfig({
        ...configData,
        env: configData.account.toUpperCase(),
        createdAt: new Date(),
      });
      return await config.save();
    } catch (error) {
      console.error("Lỗi khi tạo config:", error);
      throw error;
    }
  },

  // Cập nhật config
  update: async (account, updateData) => {
    try {
      const AccountConfig = MongoDb.AccountConfigModel;
      if (updateData.account) {
        updateData.env = updateData.account.toUpperCase();
      }

      return await AccountConfig.findOneAndUpdate(
        { env: account.toUpperCase() },
        updateData,
        { new: true }
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật config:", error);
      throw error;
    }
  },

  // Xóa config
  delete: async (account) => {
    try {
      const AccountConfig = MongoDb.AccountConfigModel;
      return await AccountConfig.findOneAndDelete({
        env: account.toUpperCase(),
      });
    } catch (error) {
      console.error("Lỗi khi xóa config:", error);
      throw error;
    }
  },

  // Tìm tất cả config
  findAll: async () => {
    try {
      const AccountConfig = MongoDb.AccountConfigModel;
      return await AccountConfig.find().sort({ createdAt: -1 });
    } catch (error) {
      console.error("Lỗi khi tìm tất cả config:", error);
      throw error;
    }
  },
};

module.exports = AccountConfigModel;
