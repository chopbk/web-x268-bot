const events = require("events");
class Emitter {
  constructor() {
    events.EventEmitter.defaultMaxListeners = 100;
    this.eventEmitter = new events.EventEmitter();
  }
  getEventEmitter = () => {
    return this.eventEmitter;
  };
}
module.exports = new Emitter();
