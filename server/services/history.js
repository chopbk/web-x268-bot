const MongoDb = require("./database/mongodb");

const AccountStatic = require("./database/account-static");
const UserAccount = require("./database/user-account");
// Service methods

const AccountConfigService = {
  // Tìm tất cả configs theo danh sách users
  findByUsers: async (users, query = {}) => {
    try {
      let results = [];
      await Promise.all(
        users.map(async (user) => {
          const userAccount = await UserAccount.findByUsername(user);
          const accountStatics = await AccountStatic.findByAccounts(
            userAccount.accounts,
            query
          );
          accountStatics.forEach((result) => {
            result.user = user;
          });
          results.push(...accountStatics);
        })
      );

      return results;
    } catch (error) {
      console.error("Error finding configs by users:", error);
      throw error;
    }
  },
  findByUser: async (user, query = {}) => {
    try {
      const userAccount = await UserAccount.findByUsername(user);
      const accountStatics = await AccountStatic.findByAccounts(
        userAccount.accounts,
        query
      );
      return accountStatics.map((result) => {
        result.user = user;
        return result;
      });
    } catch (error) {
      console.error("Error finding configs by users:", error);
      throw error;
    }
  },
  findByAccount: async (account, query = {}) => {
    try {
      const userAccount = await UserAccount.findByUsername(user);
      const results = await AccountStatic.findByAccounts(account, query);

      return results.map((result) => {
        result.user = userAccount.username;
        return result;
      });
    } catch (error) {
      console.error("Error finding configs by users:", error);
      throw error;
    }
  },
};

module.exports = AccountConfigService;
