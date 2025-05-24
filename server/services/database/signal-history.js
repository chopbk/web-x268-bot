const MongoDb = require("./mongodb");

const SignalHistoryModel = {
  // Tìm lịch sử theo ID
  findById: async (id) => {
    try {
      const SignalHistory = MongoDb.SignalHistoryModel;
      return await SignalHistory.findById(id);
    } catch (error) {
      console.error("Lỗi khi tìm lịch sử theo ID:", error);
      throw error;
    }
  },

  // Tìm lịch sử theo signal
  findBySignal: async (signal) => {
    try {
      const SignalHistory = MongoDb.SignalHistoryModel;
      return await SignalHistory.find({ signal: signal.toUpperCase() }).sort({
        createdAt: -1,
      });
    } catch (error) {
      console.error("Lỗi khi tìm lịch sử theo signal:", error);
      throw error;
    }
  },

  // Tạo lịch sử mới
  create: async (historyData) => {
    try {
      const SignalHistory = MongoDb.SignalHistoryModel;
      const history = new SignalHistory({
        ...historyData,
        signal: historyData.signal.toUpperCase(),
        createdAt: new Date(),
      });
      return await history.save();
    } catch (error) {
      console.error("Lỗi khi tạo lịch sử:", error);
      throw error;
    }
  },

  // Cập nhật lịch sử
  update: async (id, updateData) => {
    try {
      const SignalHistory = MongoDb.SignalHistoryModel;
      if (updateData.signal) {
        updateData.signal = updateData.signal.toUpperCase();
      }
      updateData.updatedAt = new Date();

      return await SignalHistory.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật lịch sử:", error);
      throw error;
    }
  },

  // Xóa lịch sử
  delete: async (id) => {
    try {
      const SignalHistory = MongoDb.SignalHistoryModel;
      return await SignalHistory.findByIdAndDelete(id);
    } catch (error) {
      console.error("Lỗi khi xóa lịch sử:", error);
      throw error;
    }
  },

  // Tìm tất cả lịch sử
  findAll: async (query = {}) => {
    try {
      const SignalHistory = MongoDb.SignalHistoryModel;
      return await SignalHistory.find(query).sort({ createdAt: -1 });
    } catch (error) {
      console.error("Lỗi khi tìm tất cả lịch sử:", error);
      throw error;
    }
  },
};

module.exports = SignalHistoryModel;
