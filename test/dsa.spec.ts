import { config } from 'dotenv'
// import "@nomiclabs/hardhat-ethers"
// import '@nomiclabs/hardhat-web3'
import hre from 'hardhat'
import DSA from '../src'
const { expect } = require("chai");

config()

let dsa: DSA
let account: string

const ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const usdcAddr = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const daiAddr = '0x6B175474E89094C44Da98b954EedeAC495271d0F'

const { web3 } = hre;
dsa = new DSA(web3)

describe('Basic', function () {
  it('initalization of DSA', () => {
    expect(dsa).to.exist
  })

  it('get web3 accounts', async () => {
    const [accountOne, accountTwo] = await web3.eth.getAccounts()

    expect(accountOne).to.exist
    expect(accountTwo).to.exist

    account = accountOne
  })
})

describe('DSA v1', function () {

  it('create new dsa v1', async () => {
    let dsaAccounts = await dsa.accounts.getAccounts(account)
    const accountCount = dsaAccounts.length

    console.log(dsaAccounts)

    await dsa.build({})

    dsaAccounts = await dsa.accounts.getAccounts(account)
    expect(dsaAccounts.length).to.eq(accountCount + 1)

    const createdDSA = dsaAccounts[dsaAccounts.length - 1]

    await dsa.setAccount(createdDSA.id)
    expect(dsa.instance.id).to.eq(createdDSA.id)
    expect(dsa.instance.version).to.eq(1)
  })

  it('Cast with flashloan', async () => {
    const usdc_address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'withdraw',
      args: [usdc_address, 0, account, 0, 0],
    })

    spells.add({
      connector: 'instapool_v2',
      method: 'flashBorrow',
      args: [usdc_address, "10000000", 0],
    })

    spells.add({
      connector: "instapool_v2",
      method: "flashPayback",
      args: [usdc_address, "10000000", 0, 0]
    })

    const calldata = await dsa.encodeCastABI(spells)
    expect(calldata).to.exist

    const txHash = await dsa.cast({ spells: spells, from: account })
    expect(txHash).to.exist
  })

  it('Cast with flashloan with multiple', async () => {
    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'withdraw',
      args: [usdcAddr, 0, account, 0, 0],
    })

    spells.add({
      connector: 'instapool_v2',
      method: 'flashBorrow',
      args: [usdcAddr, "10000000", 0],
    })


    spells.add({
      connector: 'compound',
      method: 'withdraw',
      args: [ethAddr, "100000000000", 0, 0],
    })

    spells.add({
      connector: 'instapool_v2',
      method: 'flashBorrow',
      args: [daiAddr, "1000000000000000", 0],
    })

    spells.add({
      connector: 'aave',
      method: 'borrow',
      args: [daiAddr, "1000000000000000", 0, 0],
    })

    spells.add({
      connector: "instapool_v2",
      method: "flashPayback",
      args: [daiAddr, "1000000000000000", 0, 0]
    })

    spells.add({
      connector: "instapool_v2",
      method: "flashPayback",
      args: [usdcAddr, "10000000", 0, 0]
    })

    const calldata = await dsa.encodeCastABI(spells)
    expect(calldata).to.exist

    // const txHash = await dsa.cast({ spells: spells, from: process.env.PUBLIC_ADDRESS }) // Throws error due to connector

  })

  it('Deposit 10 ETH to DSA', async () => {
    const amt = web3.utils.toWei("10", "ether")
    const data = {
      token: ethAddr,
      amount: amt,
      to: dsa.instance.address,
      from: account
    }
    await dsa.erc20.transfer(data)

    const balance = await web3.eth.getBalance(dsa.instance.address)
    expect(balance).to.eq(amt.toString())
  })

  it('Swap 1 ETH to USDC', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Withdraw USDC from DSA', async () => {
    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'withdraw',
      args: [usdcAddr, dsa.maxValue, account, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Give USDC allowance', async () => {
    var data = {
      token: usdcAddr,
      amount: "1000000000000",
      to: dsa.instance.address
    }
    await dsa.erc20.approve(data)

    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'deposit',
      args: [usdcAddr, dsa.maxValue, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Swap 1 ETH to USDC #2', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Deposit ETH to Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'compound',
      method: 'deposit',
      args: ['ETH-A', amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Borrow DAI from Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("10", "ether")
    spells.add({
      connector: 'compound',
      method: 'borrow',
      args: ["DAI-A", amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Payback DAI to Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("10", "ether")
    spells.add({
      connector: 'compound',
      method: 'payback',
      args: ["DAI-A", amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Withdraw ETH from Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("0.9", "ether")
    spells.add({
      connector: 'compound',
      method: 'withdraw',
      args: ["ETH-A", amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Swap 1 ETH to DAI', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [daiAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Deposit ETH, Borrow DAI, Payback DAI, Withdraw ETH', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    const amt2 = web3.utils.toWei("100", "ether")
    spells.add({
      connector: 'compound',
      method: 'deposit',
      args: ["ETH-A", amt, 0, 0],
    })
    spells.add({
      connector: 'compound',
      method: 'borrow',
      args: ["DAI-A", amt2, 0, 0],
    })
    spells.add({
      connector: 'compound',
      method: 'payback',
      args: ["DAI-A", dsa.maxValue, 0, 0],
    })
    spells.add({
      connector: 'compound',
      method: 'withdraw',
      args: ["ETH-A", dsa.maxValue, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Object-oriented Spells', async () => {
    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'withdraw',
      args: [daiAddr, dsa.maxValue, account, 0, 0],
    })

    const calldata = await dsa.encodeCastABI(spells)
    expect(calldata).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist
  })

  it('Swap 1 ETH to USDC #3', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Cast with fluid api', async () => {
    const txHash = await dsa
      .Spell()
      .add({
        connector: 'basic',
        method: 'withdraw',
        args: [usdcAddr, dsa.maxVal(), account, 0, 0],
      })
      .cast({ from: account })

    expect(txHash).to.exist
  })

  it('get transaction count', async () => {
    const nonce = await dsa.transaction.getTransactionCount(account as string)

    expect(nonce).to.exist
  })

  it('Swap 1 ETH to USDC #4', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Transfer -1 USDC from DSA', async () => {
    var data = {
      token: usdcAddr,
      amount: dsa.maxValue,
      to: account,
    }
    await dsa.erc20.transfer(data)
  })

  it('Transfer -1 USDC to DSA', async () => {
    var data = {
      token: usdcAddr,
      amount: dsa.maxValue,
      to: dsa.instance.address,
    }
    await dsa.erc20.transfer(data)
  })

  it('Give -1 DAI allowance', async () => {
    var data = {
      token: daiAddr,
      amount: dsa.maxValue,
      to: dsa.instance.address
    }
    await dsa.erc20.approve(data)
  })
})

describe('DSA v2', function () {
  it('create new dsa v2', async () => {
    let dsaAccounts = await dsa.accounts.getAccounts(account)
    const accountCount = dsaAccounts.length

    console.log(dsaAccounts)

    await dsa.build({ version: 2 })

    dsaAccounts = await dsa.accounts.getAccounts(account)
    expect(dsaAccounts.length).to.eq(accountCount + 1)

    const createdDSA = dsaAccounts[dsaAccounts.length - 1]

    await dsa.setAccount(createdDSA.id)
    expect(dsa.instance.id).to.eq(createdDSA.id)
    expect(dsa.instance.version).to.eq(2)
  })

  it('Deposit 10 ETH to DSA', async () => {
    const amt = web3.utils.toWei("10", "ether")
    const data = {
      token: ethAddr,
      amount: amt,
      to: dsa.instance.address,
      from: account
    }
    await dsa.erc20.transfer(data)

    const balance = await web3.eth.getBalance(dsa.instance.address)
    expect(balance).to.eq(amt.toString())
  })

  it('Swap 1 ETH to USDC', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Swap 1 ETH to USDC (Spell: "1INCH-A")', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: '1INCH-A',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, "0x90411a32000000000000000000000000b3c9669a5706477a2b237d98edb9b57678926f04000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000b3c9669a5706477a2b237d98edb9b57678926f04000000000000000000000000a8abe411d1a3f524a2ab9c54f8427066a1f9f2660000000000000000000000000000000000000000000000000d7c73f8d3422bde000000000000000000000000000000000000000000000000000000007809e3510000000000000000000000000000000000000000000000000000000079404a770000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b1dc62ec38e6e3857a887210c38418e4a17da5b200000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000006e0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d7c73f8d3422bde00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000b4e16d0168e52d35cacd2c6185b44281ec28c9dc0000000000000000000000000000000000000000000000000d7c73f8d3422bde00000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a4c9f12e9d000000000000000000000000b4e16d0168e52d35cacd2c6185b44281ec28c9dc000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000003b3c9669a5706477a2b237d98edb9b57678926f04000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000002647f8fe7a000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000b3c9669a5706477a2b237d98edb9b57678926f0400000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a405971224000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000b1dc62ec38e6e3857a887210c38418e4a17da5b20000000000000000000000000000000000000000000000000000000000000001000000000000000002c43fc1fd44678100000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000004c1f1500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004470bdb947000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000079404a77000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000184b3af37c000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000024000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000100000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000a8abe411d1a3f524a2ab9c54f8427066a1f9f26600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", 0],
    })


    try {
      await spells.estimateCastGas({ from: account })
    } catch (e) {
      expect(e.message).to.eq("VM Exception while processing transaction: revert 1Inch-swap-failed");
    }

    try {
      const txHash = await spells.cast({ from: account })
    } catch (e) {
      expect(e.message).to.eq("VM Exception while processing transaction: revert 1Inch-swap-failed");
    }
  })

  it('Swap 1 ETH to USDC (Spell: "1INCH-A")', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'oneInch',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, "0x90411a32000000000000000000000000b3c9669a5706477a2b237d98edb9b57678926f04000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000b3c9669a5706477a2b237d98edb9b57678926f04000000000000000000000000a8abe411d1a3f524a2ab9c54f8427066a1f9f2660000000000000000000000000000000000000000000000000d7c73f8d3422bde000000000000000000000000000000000000000000000000000000007809e3510000000000000000000000000000000000000000000000000000000079404a770000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b1dc62ec38e6e3857a887210c38418e4a17da5b200000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000006e0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d7c73f8d3422bde00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000b4e16d0168e52d35cacd2c6185b44281ec28c9dc0000000000000000000000000000000000000000000000000d7c73f8d3422bde00000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a4c9f12e9d000000000000000000000000b4e16d0168e52d35cacd2c6185b44281ec28c9dc000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000003b3c9669a5706477a2b237d98edb9b57678926f04000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000002647f8fe7a000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000b3c9669a5706477a2b237d98edb9b57678926f0400000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a405971224000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000b1dc62ec38e6e3857a887210c38418e4a17da5b20000000000000000000000000000000000000000000000000000000000000001000000000000000002c43fc1fd44678100000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000004c1f1500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004470bdb947000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000079404a77000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000184b3af37c000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000024000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000100000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000a8abe411d1a3f524a2ab9c54f8427066a1f9f26600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", 0],
    })

    try {
      await spells.estimateCastGas({ from: account })
    } catch (e) {
      expect(e.message).to.eq("VM Exception while processing transaction: revert 1Inch-swap-failed");
    }

    try {
      const txHash = await spells.cast({ from: account })
    } catch (e) {
      console.log("EADD", e.message)
      expect(e.message).to.eq("VM Exception while processing transaction: revert 1Inch-swap-failed");
    }
  })

  it('Withdraw USDC from DSA', async () => {
    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'withdraw',
      args: [usdcAddr, dsa.maxValue, account, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Give USDC allowance', async () => {
    var data = {
      token: usdcAddr,
      amount: "1000000000000",
      to: dsa.instance.address
    }
    await dsa.erc20.approve(data)

    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'deposit',
      args: [usdcAddr, dsa.maxValue, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Swap 1 ETH to USDC #2', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Deposit ETH to Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'COMPOUND-A',
      method: 'deposit',
      args: ['ETH-A', amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Borrow DAI from Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("10", "ether")
    spells.add({
      connector: 'compound',
      method: 'borrow',
      args: ["DAI-A", amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Payback DAI to Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("10", "ether")
    spells.add({
      connector: 'compound',
      method: 'payback',
      args: ["DAI-A", amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Withdraw ETH from Compound', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("0.9", "ether")
    spells.add({
      connector: 'compound',
      method: 'withdraw',
      args: ["ETH-A", amt, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Swap 1 ETH to DAI', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [daiAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Deposit ETH, Borrow DAI, Payback DAI, Withdraw ETH', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    const amt2 = web3.utils.toWei("100", "ether")
    spells.add({
      connector: 'compound',
      method: 'deposit',
      args: ["ETH-A", amt, 0, 0],
    })
    spells.add({
      connector: 'COMPOUND-A',
      method: 'borrow',
      args: ["DAI-A", amt2, 0, 0],
    })
    spells.add({
      connector: 'COMPOUND-A',
      method: 'payback',
      args: ["DAI-A", dsa.maxValue, 0, 0],
    })
    spells.add({
      connector: 'compound',
      method: 'withdraw',
      args: ["ETH-A", dsa.maxValue, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Object-oriented Spells', async () => {
    const spells = dsa.Spell()

    spells.add({
      connector: 'basic',
      method: 'withdraw',
      args: [daiAddr, dsa.maxValue, account, 0, 0],
    })

    const calldata = await dsa.encodeCastABI(spells)
    expect(calldata).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist
  })

  it('Swap 1 ETH to USDC #3', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Cast with fluid api', async () => {
    const txHash = await dsa
      .Spell()
      .add({
        connector: 'basic',
        method: 'withdraw',
        args: [usdcAddr, dsa.maxVal(), account, 0, 0],
      })
      .cast({ from: account })

    expect(txHash).to.exist
  })

  it('get transaction count', async () => {
    const nonce = await dsa.transaction.getTransactionCount(account as string)

    expect(nonce).to.exist
  })

  it('Swap 1 ETH to USDC #4', async () => {
    const spells = dsa.Spell()
    const amt = web3.utils.toWei("1", "ether")
    spells.add({
      connector: 'uniswap',
      method: 'sell',
      args: [usdcAddr, ethAddr, amt, 0, 0, 0],
    })

    const gas = await spells.estimateCastGas({ from: account })
    expect(gas).to.exist

    const txHash = await spells.cast({ from: account })
    expect(txHash).to.exist
  })

  it('Transfer -1 USDC from DSA', async () => {
    var data = {
      token: usdcAddr,
      amount: dsa.maxValue,
      to: account,
    }
    await dsa.erc20.transfer(data)
  })

  it('Transfer -1 USDC to DSA', async () => {
    var data = {
      token: usdcAddr,
      amount: dsa.maxValue,
      to: dsa.instance.address,
    }
    await dsa.erc20.transfer(data)
  })

  it('Give -1 DAI allowance', async () => {
    var data = {
      token: daiAddr,
      amount: dsa.maxValue,
      to: dsa.instance.address
    }
    await dsa.erc20.approve(data)
  })
})

