const { DbService } = require("./db");

module.exports = async () => {
  // Checking environment variables

  if (!process.env.AA_ADDRESS) {
    throw Error(
      "Please specify the agent's address in the environment variables"
    );
  }
  
  await DbService.create();
};
