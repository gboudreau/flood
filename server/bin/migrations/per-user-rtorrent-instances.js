const chalk = require('chalk');
const config = require('../../../config');
const Users = require('../../models/Users');

const log = (data) => {
  if (process.env.DEBUG) {
    console.log(data);
  }
};

const migrate = () => {
  log(chalk.green('Migrating data: moving rTorrent connection information to users database'));

  return new Promise((migrateResolve, migrateReject) => {
    Users.listUsers((users, listUsersError) => {
      if (listUsersError) return migrateReject(listUsersError);
      const {scgi = {}} = config;
      const existingConfig = {
        host: scgi.host,
        port: scgi.port,
        socketPath: scgi.socketPath,
      };

      migrateResolve(
        Promise.all(
          users.map((user) => {
            let userPatch = null;

            // A bug in this script caused all of these xmlrpc values to be defined in the user db.
            // If they are all defined, set all to null to prompt the user to provide new connection
            // details.
            if (user.host != null && user.port != null && user.socketPath != null) {
              userPatch = {
                host: null,
                port: null,
                socketPath: null,
              };
            }

            // If none of the xmlrpc fields are on the user object, try to infer this from the legacy
            // configuration file.
            if (user.host == null && user.port == null && user.socketPath == null) {
              userPatch = {isAdmin: true};

              if (existingConfig.socketPath && existingConfig.socketPath.trim().length > 0) {
                userPatch.socketPath = existingConfig.socketPath;
              } else {
                userPatch.host = existingConfig.host;
                userPatch.port = existingConfig.port;
              }
            }

            if (userPatch != null) {
              log(chalk.yellow(`Migrating user ${user.username}`));

              return new Promise((updateUserResolve, updateUserReject) => {
                Users.updateUser(user.username, userPatch, (response, updateUserError) => {
                  if (updateUserError) {
                    updateUserReject(updateUserError);
                    return;
                  }

                  updateUserResolve(response);
                });
              });
            }

            return Promise.resolve();
          }),
        ),
      );
    });
  });
};

module.exports = migrate;
