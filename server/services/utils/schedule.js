const schedule = require("node-schedule");
/**
 * Lên lịch chạy một công việc theo định kỳ
 * @param {string} cronExpression Biểu thức cron để xác định thời gian chạy
 * @param {Function} callback Hàm callback sẽ được gọi khi đến thời gian
 * @returns {schedule.Job} Job đã được lên lịch
 */
const scheduleJob = (cronExpression, callback) => {
  return schedule.scheduleJob(cronExpression, callback);
};

module.exports = {
  scheduleJob,
};
