const MongoDb = require("./mongodb");

// Model methods
const UserAccountModel = {
  // Tìm tài khoản theo username
  findByUsername: async (username) => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      return await UserAccount.findOne({ username: username.toUpperCase() });
    } catch (error) {
      console.error("Lỗi khi tìm tài khoản theo username:", error);
      throw error;
    }
  },
  findByAccount: async (account) => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      return await UserAccount.findOne({ accounts: account });
    } catch (error) {
      console.error("Lỗi khi tìm tài khoản theo username:", error);
      throw error;
    }
  },
  findByUsers: async (username) => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      return await UserAccount.findOne({ username: username.toUpperCase() });
    } catch (error) {
      console.error("Lỗi khi tìm tài khoản theo username:", error);
      throw error;
    }
  },
  find: async (query) => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      return await UserAccount.find(query);
    } catch (error) {
      console.error("Lỗi khi tìm tài khoản:", error);
      throw error;
    }
  },
  // Tạo tài khoản mới
  create: async (accountData) => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      const account = new UserAccount({
        ...accountData,
        username: accountData.username.toUpperCase(),
        updatedAt: new Date(),
      });
      return await account.save();
    } catch (error) {
      console.error("Lỗi khi tạo tài khoản:", error);
      throw error;
    }
  },

  // Cập nhật tài khoản
  update: async (username, updateData) => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      if (updateData.username) {
        updateData.username = updateData.username.toUpperCase();
      }
      updateData.updatedAt = new Date();

      return await UserAccount.findOneAndUpdate(
        { username: username.toUpperCase() },
        updateData,
        { new: true }
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật tài khoản:", error);
      throw error;
    }
  },

  // Xóa tài khoản
  delete: async (username) => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      return await UserAccount.findOneAndDelete({
        username: username.toUpperCase(),
      });
    } catch (error) {
      console.error("Lỗi khi xóa tài khoản:", error);
      throw error;
    }
  },

  // Tìm tất cả tài khoản
  findAll: async () => {
    try {
      const UserAccount = MongoDb.UserAccountModel;
      return await UserAccount.find().sort({ createdAt: -1 });
    } catch (error) {
      console.error("Lỗi khi tìm tất cả tài khoản:", error);
      throw error;
    }
  },
};

module.exports = UserAccountModel;
