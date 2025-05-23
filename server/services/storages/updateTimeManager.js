class UpdateTimeManager {
  constructor() {
    this.lastUpdateTimes = {};
    this.UPDATE_INTERVAL = 60000; // 1 phút
  }

  shouldUpdate(service, key) {
    if (!this.lastUpdateTimes[service]) {
      this.lastUpdateTimes[service] = {};
    }

    const lastUpdate = this.lastUpdateTimes[service][key];
    if (lastUpdate) {
      const timeSinceLastUpdate = Date.now() - lastUpdate;
      if (timeSinceLastUpdate < this.UPDATE_INTERVAL) {
        return false;
      }
    }

    // Cập nhật thời gian update mới nhất
    this.lastUpdateTimes[service][key] = Date.now();
    return true;
  }

  getLastUpdateTime(service, key) {
    return this.lastUpdateTimes[service]?.[key] || null;
  }
}

module.exports = new UpdateTimeManager();
