require("./index")

module.exports = {
  solidity: {
    compilers: ["0.4.26", "0.5.15", "0.6.12", "0.7.6", "0.8.14"].map(version => ({
        version,
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ))
  }
}
