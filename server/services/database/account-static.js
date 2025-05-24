const MongoDb = require("./mongodb");

const AccountStaticModel = {
  // Tìm theo ID
  findById: async (id) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      return await AccountStatic.findById(id);
    } catch (error) {
      console.error("Lỗi khi tìm theo ID:", error);
      throw error;
    }
  },
  findByAccounts: async (accounts, query = {}) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      return await AccountStatic.find({
        env: { $in: accounts },
        ...query,
      }).lean();
    } catch (error) {
      console.error("Lỗi khi tìm theo accounts:", error);
      throw error;
    }
  },
  // Tìm theo username và symbol
  findByUsernameAndSymbol: async (username, symbol) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      return await AccountStatic.find({
        username: username.toUpperCase(),
        symbol: symbol.toUpperCase(),
      }).sort({ openTime: -1 });
    } catch (error) {
      console.error("Lỗi khi tìm theo username và symbol:", error);
      throw error;
    }
  },

  // Tìm theo username
  findByUsername: async (username) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      return await AccountStatic.find({
        username: username.toUpperCase(),
      }).sort({ openTime: -1 });
    } catch (error) {
      console.error("Lỗi khi tìm theo username:", error);
      throw error;
    }
  },

  // Tạo mới
  create: async (data) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      const static = new AccountStatic({
        ...data,
        username: data.username.toUpperCase(),
        symbol: data.symbol.toUpperCase(),
        createdAt: new Date(),
      });
      return await static.save();
    } catch (error) {
      console.error("Lỗi khi tạo mới:", error);
      throw error;
    }
  },

  // Cập nhật
  update: async (id, updateData) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      if (updateData.username) {
        updateData.username = updateData.username.toUpperCase();
      }
      if (updateData.symbol) {
        updateData.symbol = updateData.symbol.toUpperCase();
      }
      updateData.updatedAt = new Date();

      return await AccountStatic.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      throw error;
    }
  },

  // Xóa
  delete: async (id) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      return await AccountStatic.findByIdAndDelete(id);
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      throw error;
    }
  },

  // Tìm tất cả
  findAll: async (query = {}) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      return await AccountStatic.find(query).sort({ openTime: -1 });
    } catch (error) {
      console.error("Lỗi khi tìm tất cả:", error);
      throw error;
    }
  },

  // Tìm kiếm nâng cao
  search: async (params) => {
    try {
      const AccountStatic = MongoDb.AccountStaticModel;
      const query = {
        username: params.username
          ? params.username.toUpperCase()
          : { $in: params.activeUsers },
        openTime: {
          $gt: new Date(params.startDate),
          ...(params.endDate && { $lt: new Date(params.endDate) }),
        },
        ...(params.isPaper && { isPaper: true }),
        ...(params.signal && {
          typeSignal: { $in: params.signal.split(",") },
        }),
        ...(params.symbol && { symbol: params.symbol.toUpperCase() }),
        ...(params.side && { side: params.side }),
        ...(params.status && { status: params.status }),
        ...(params.isCopy && { isCopy: true }),
        ...(params.isClosed && { isClosed: true }),
        ...(params.isOpen && { isClosed: false }),
      };

      return await AccountStatic.find(query).sort({ openTime: -1 }).lean();
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      throw error;
    }
  },
};

module.exports = AccountStaticModel;
