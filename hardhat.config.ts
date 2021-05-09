/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "dotenv/config"
import "@nomiclabs/hardhat-web3"
import { task } from 'hardhat/config';


task("accounts", "Prints accounts", async (_, { web3, network }) => {

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [process.env.PUBLIC_ADDRESS]
  }
  )

  console.log(await web3.eth.getAccounts())

  await web3.eth.sendTransaction({ from: process.env.PUBLIC_ADDRESS, to: process.env.PUBLIC_ADDRESS, value: 1000 })

});


const mnemonic = 'west cricket tenant memory offer burger crumble snow solid mushroom wish solid';

module.exports = {
  solidity: "0.7.3",
  mocha: {
    timeout: 5 * 20000,
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      chainId: 1,
      forking: {
        url: process.env.ETH_NODE_URL,
        blockNumber: 12367201,
      },
      blockGasLimit: 12000000,
    },
  },
};
