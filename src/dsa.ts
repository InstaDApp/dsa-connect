import Web3 from 'web3'
import { TransactionConfig } from 'web3-core'
import { Abi } from './abi'
import { Accounts } from './accounts'
import { CastHelpers } from './cast-helpers'
import { Addresses } from './addresses'
import { Internal, Version } from './internal'
import { Spells } from './spells'
import { Transaction } from './transaction'
import { wrapIfSpells } from './utils'
import { Instapool_v2 } from './resolvers/instapool_v2'
import { Erc20 } from './utils/erc20'

type DSAConfig =
  | {
    web3: Web3
    mode: 'node'
    privateKey: string
  }
  | {
    web3: Web3
    mode: 'simulation'
    publicKey: string
  }
  | {
    web3: Web3
    mode?: 'browser'
  }


// ChainId 1 = mainnet, ChainId 137 = matic
type ChainId = 1 | 137;

interface Instance {
  id: number
  address: string
  version: Version
  chainId: ChainId
}

/**
 * @param _d.spells the spells instance
 * @param _d.origin (optional)
 * @param _d.to (optional)
 * @param _d.from (optional)
 * @param _d.value (optional)
 * @param _d.gasPrice (optional only for "browser" mode)
 * @param _d.gas (optional)
 * @param {number|string} _d.nonce (optional) txn nonce (mostly for node implementation)
 */
type CastParams = {
  spells: Spells
  origin?: string
} & Pick<TransactionConfig, 'from' | 'to' | 'value' | 'gas' | 'gasPrice' | 'nonce'>

/**
 * @param {address} _d.authority (optional)
 * @param {address} _d.origin (optional)
 * @param {address} _d.from (optional)
 * @param {number} _d.version (optional)
 * @param {number|string} _d.gasPrice (optional) not optional in "node"
 * @param {number|string} _d.gas (optional) not optional in "node"
 * @param {number|string} _d.nonce (optional) not optional in "node"
 */
type BuildParams = {
  authority?: string
  origin?: string
  version?: Instance['version']
} & Pick<TransactionConfig, 'from' | 'gas' | 'gasPrice' | 'nonce'>

export class DSA {
  readonly config: DSAConfig

  get web3() {
    return this.config.web3
  }
  get mode() {
    return this.config.mode
  }

  origin: string = Addresses.genesis

  /**
   * Sets the origin of interactions.
   *
   * @param origin The origin address for affiliation and on-chain analytics.
   */
  setOrigin(origin: string) {
    this.origin = origin
  }

  instance: Instance = {
    id: 0,
    address: Addresses.genesis,
    version: 1,
    chainId: 1
  }

  // value of uint(-1).
  public readonly maxValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  public readonly maxVal = () => '115792089237316195423570985008687907853269984665640564039457584007913129639935'

  // Extensions
  readonly erc20 = new Erc20(this)
  readonly internal = new Internal(this)
  readonly castHelpers = new CastHelpers(this)
  readonly transaction = new Transaction(this)
  readonly instapool_v2 = new Instapool_v2(this)
  readonly accounts = new Accounts(this)

  // Aliases
  public encodeSpells = (...args: Parameters<Internal['encodeSpells']>) => this.internal.encodeSpells(...args)
  public sendTransaction = (...args: Parameters<Transaction['send']>) => this.transaction.send(...args)
  public count = (...args: Parameters<Accounts['count']>) => this.accounts.count(...args)
  public getAccounts = (...args: Parameters<Accounts['getAccounts']>) => this.accounts.getAccounts(...args)
  public getAuthById = (...args: Parameters<Accounts['getAuthoritiesById']>) =>
    this.accounts.getAuthoritiesById(...args)
  public encodeCastABI = (...args: Parameters<CastHelpers['encodeABI']>) => this.castHelpers.encodeABI(...args)
  public estimateCastGas = (...args: Parameters<CastHelpers['estimateGas']>) => {
    return this.castHelpers.estimateGas(...args)
  }

  /**
   * @param config A `web3` instance or a DSAConfig
   */
  constructor(config: Web3 | DSAConfig) {
    this.config = getDSAConfig(config)
    this.web3.eth.getChainId().then(chainId => {
      if (!([1, 137]).includes(chainId)) {
        throw new Error(`chainId '${chainId}' is not supported.`)
      } else {
        this.instance.chainId = chainId as ChainId
      }
    });
  }

  /**
   * Sets the current DSA instance.
   */
  public async setInstance(id: number) {
    if (!id) throw new Error('`id` of DSA is not defined.')

    if (!isFinite(id)) throw new Error(`Invaild id '${id}' for DSA.`)

    const accountDetails = await this.getAccountIdDetails(id)

    this.instance = accountDetails

    return this.instance
  }

  /**
   * Refreshes the chain Id and sets it on the instance 
   */
  public async refreshChainId() {
    const chainId = await this.web3.eth.getChainId() as ChainId;
    this.instance.chainId = chainId;
  }

  public async getAccountIdDetails(instanceId: Instance['id']) {
    try {
      const contract = new this.web3.eth.Contract(Abi.core.read, Addresses.core[this.instance.chainId].read)
      const [id, address, version] = await contract.methods.getAccountIdDetails(instanceId).call()
      const chainId = await this.web3.eth.getChainId();

      return {
        id,
        address,
        version: parseInt(version) as Version,
        chainId: chainId as ChainId
      }
    } catch (err) {
      const count = await this.accounts.count()
      if (count < instanceId) {
        throw new Error('dsaId does not exist. Run `dsa.build()` to create a new DSA.')
      }

      throw err
    }
  }

  /**
   * Sets the current DSA ID instance.
   *
   * @param id DSA ID
   */
  async setAccount(id: number) {
    return await this.setInstance(id)
  }

  /**
   * Build a new DSA.
   */
  async build(params: BuildParams) {
    const defaultAddress = await this.internal.getAddress()

    const defaults = {
      from: defaultAddress,
      authority: defaultAddress,
      origin: Addresses.genesis,
      version: this.instance.chainId != 1 ? 2 : 1,
    }

    const mergedParams = Object.assign(defaults, params) as BuildParams

    const to = Addresses.core[this.instance.chainId].index
    const contract = new this.web3.eth.Contract(Abi.core.index, Addresses.core[this.instance.chainId].index)
    const data = contract.methods.build(mergedParams.authority, mergedParams.version, mergedParams.origin).encodeABI()

    if (!mergedParams.from) throw new Error("Parameter 'from' is not defined.")

    const transactionConfig = await this.internal.getTransactionConfig({
      from: mergedParams.from,
      to,
      data,
      gas: mergedParams.gas,
      gasPrice: mergedParams.gasPrice,
      nonce: mergedParams.nonce,
    })

    const transaction = await this.transaction.send(transactionConfig)

    return transaction
  }

  /**
   * Build new DSA txObj
   */
  async buildTxObj(params: BuildParams) {
    if (!params.authority) throw new Error("Parameter 'authority' is not defined.")
    if (!params.from) throw new Error("Parameter 'from' is not defined.")

    const to = Addresses.core[this.instance.chainId].index
    const contract = new this.web3.eth.Contract(Abi.core.index, Addresses.core[this.instance.chainId].index)
    const data = contract.methods.build(
      params.authority,
      params.version || (this.instance.chainId != 1 ? 2 : 1),
      params.origin || Addresses.genesis,
    ).encodeABI()

    return this.internal.getTransactionConfig({
      from: params.from,
      to,
      data,
      gas: params.gas,
      gasPrice: params.gasPrice,
      nonce: params.nonce,
    })
  }

  /**
   * Build new DSA transactionConfiguration.
   *
   * @param {address} _d.authority (optional)
   * @param {address} _d.origin (optional)
   * @param {number|string} _d.gasPrice (optional) not optional in "node"
   * @param {number|string} _d.gas (optional) not optional in "node"
   * @param {number|string} _d.nonce (optional) not optional in "node"
   */
  async buildTransactionConfig(
    params: {
      authority?: string
      origin?: string
    } & Pick<TransactionConfig, 'from' | 'gasPrice' | 'gas' | 'nonce'>
  ) {
    const defaultAddress = await this.internal.getAddress()

    const defaults = {
      version: 1,
      origin: this.origin,
      authority: defaultAddress,
    }

    const mergedParams = Object.assign(defaults, params)

    if (!mergedParams.from) throw new Error(`Parameter 'from' is not defined.`)

    const to = Addresses.core[this.instance.chainId].index

    const contracts = new this.web3.eth.Contract(Abi.core.index, Addresses.core[this.instance.chainId].index)
    const data = contracts.methods.build(mergedParams.authority, mergedParams.version, mergedParams.origin).encodeABI()

    const transactionConfig = await this.internal.getTransactionConfig({
      from: mergedParams.from,
      to,
      data,
      gas: mergedParams.gas,
      gasPrice: mergedParams.gasPrice,
      nonce: mergedParams.nonce,
    })

    return transactionConfig
  }

  /**
   * Creates a Spells instance.
   *
   * Example usage:
   *
   * ```
   * dsa.Spell()
   *  .add(...)
   *  .add(...)
   *  .cast(...)
   * ```
   */
  public Spell() {
    const vm = this

    // Add cast functionality for fluid API through anonymous class.
    return new (class extends Spells {
      constructor() {
        super()
      }

      cast = async (params?: Omit<CastParams, 'spells'>) => {
        if (!this.data.length) {
          console.log('No spells casted. Add spells with `.add(...)`.')
          return
        }
        return await vm.cast(!!params ? { ...params, spells: this } : this)
      }

      estimateCastGas = async (params?: Omit<CastHelpers['estimateGas'], 'spells'>) => {
        if (!this.data.length) {
          console.log('No spells casted. Add spells with `.add(...)`.')
          return
        }
        return await vm.castHelpers.estimateGas({ spells: this, ...params })
      }

      encodeCastABI = async (params?: Omit<CastHelpers['encodeABI'], 'spells'>) => {
        if (!this.data.length) {
          console.log('No spells casted. Add spells with `.add(...)`.')
          return
        }
        return await vm.encodeCastABI({ spells: this, ...params })
      }

      encodeSpells = async (params?: Omit<Internal['encodeSpells'], 'spells'>) => {
        if (!this.data.length) {
          console.log('No spells casted. Add spells with `.add(...)`.')
          return
        }
        return await vm.encodeSpells({ spells: this, ...params })
      }
    })()
  }

  async cast(params: Spells | CastParams) {
    const defaults = {
      to: this.instance.address,
      from: await this.internal.getAddress(),
      origin: this.origin,
    }

    const mergedParams = Object.assign(defaults, wrapIfSpells(params)) as CastParams

    if (!mergedParams.from) throw new Error(`Parameter 'from' is not defined.`)
    if (!mergedParams.to) throw new Error(`Parameter 'to' is not defined.`)

    const data = await this.getData(mergedParams)

    const transactionConfig = await this.internal.getTransactionConfig({
      from: mergedParams.from,
      to: mergedParams.to,
      gas: mergedParams.gas,
      gasPrice: mergedParams.gasPrice,
      nonce: mergedParams.nonce,
      value: mergedParams.value,
      data: data,
    })

    console.log(`DSA config:\n version: ${this.instance.version}\n chainId: ${this.instance.chainId}`)
    console.log(`Casting spells to DSA(#${this.instance.id})...`)

    const transaction = await this.transaction.send(transactionConfig)

    return transaction
  }

  private async getData(params: { spells: Spells; origin?: string }) {
    const encodedSpells = await this.internal.encodeSpells(params)

    const contract = new this.web3.eth.Contract(Abi.core.versions[this.instance.version].account, this.instance.address)
    const data = contract.methods
      .cast(encodedSpells.targets, encodedSpells.spells, params.origin || Addresses.genesis)
      .encodeABI()

    return data
  }
}

// Used defined Typeguard
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
function isWeb3(config: Web3 | DSAConfig): config is Web3 {
  return !!(config as Web3).version
}

function getDSAConfig(config: Web3 | DSAConfig): DSAConfig {
  if (!config) throw new Error('Invalid config. Pass web3 instance or DSAConfig.')

  if (isWeb3(config)) return { web3: config, mode: 'browser' }

  if (!config.web3) throw new Error('Invalid config. Pass web3 instance or DSAConfig.')

  if (config.mode === 'node') {
    if (!config.privateKey) throw new Error(`Property 'privateKey' is not defined in config.`)

    const privateKey = config.privateKey.slice(0, 2) != '0x' ? '0x' + config.privateKey : config.privateKey

    return {
      web3: config.web3,
      mode: config.mode,
      privateKey,
    }
  } else if (config.mode === 'simulation') {
    if (!config.publicKey) throw new Error(`Property 'publicKey' is not defined in config.`)
    if (!config.web3.utils.isAddress(config.publicKey.toLowerCase())) throw new Error(`Property 'publicKey' is not a address.`)

    const publicKey = config.web3.utils.toChecksumAddress(config.publicKey.toLowerCase())
    return {
      web3: config.web3,
      mode: 'simulation',
      publicKey: publicKey
    }
  } else if (!config.mode || config.mode === 'browser') {
    return {
      web3: config.web3,
      mode: 'browser',
    }
  } else {
    throw new Error(`Mode '${config.mode}' not recognized. Use 'node' or 'browser' as mode.`)
  }
}
