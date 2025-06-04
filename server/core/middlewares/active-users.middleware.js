const activeUsersMiddleware = (req, res, next) => {
  req.activeUsers = process.env.USERS.toUpperCase().split(",") || ["V"];
  next();
};

module.exports = activeUsersMiddleware;
