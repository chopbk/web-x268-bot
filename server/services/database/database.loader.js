const MongoDb = require("./mongodb");

module.exports = async function () {
    await MongoDb.init();
};
