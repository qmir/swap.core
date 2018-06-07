import constants from './constants'
import StorageFactory from './StorageFactory'


class SwapApp {

  /**
   *
   * @param {object}  options
   * @param {string}  options.network
   * @param {object}  options.env
   * @param {array}   options.services
   * @param {array}   options.swaps
   */
  setup(options) {
    this.network    = options.network || constants.NETWORKS.TESTNET
    this.env        = {}
    this.swaps      = {}
    this.services   = {}

    this._addEnv(options.env || {})
    this._addServices(options.services || {})
    this._addSwaps(options.swaps || {})
  }

  // Configure -------------------------------------------------------- /

  _addEnv(env) {
    Object.keys(env).forEach((name) => {
      if (constants.ENV.indexOf(name) < 0) {
        const list  = JSON.stringify(constants.ENV).replace(/"/g, '\'')
        const error = `SwapApp.addEnv(): Only ${list} available`

        throw new Error(error)
      }
    })

    this.env = env
    this.env.storage = new StorageFactory(env.storage)
  }

  _addService(service) {
    if (!service._serviceName) {
      throw new Error('SwapApp service should contain "_serviceName" property')
    }

    if (constants.SERVICES.indexOf(service._serviceName) < 0) {
      const list  = JSON.stringify(constants.SERVICES).replace(/"/g, '\'')
      const error = `SwapApp.addServices(): Only ${list} available`

      throw new Error(error)
    }

    this.services[service._serviceName] = service

    // TODO add topological sorting
    if (typeof service._initService === 'function') {
      service._initService()
    }
  }

  _addServices(services) {
    services.forEach((service) => {
      this._addService(service)
    })
  }

  _addSwap(swap) {
    if (!swap._swapName) {
      throw new Error('SwapApp swap should contain "_swapName" property')
    }

    if (constants.SWAPS.indexOf(swap._swapName) < 0) {
      const list  = JSON.stringify(constants.SWAPS).replace(/"/g, '\'')
      const error = `SwapApp.addSwaps(): Only ${list} available`

      throw new Error(error)
    }

    this.swaps[swap._swapName] = swap

    // TODO add topological sorting
    if (typeof swap._initSwap === 'function') {
      swap._initSwap()
    }
  }

  _addSwaps(swaps) {
    swaps.forEach((swap) => {
      this._addSwap(swap)
    })
  }

  // Public methods --------------------------------------------------- /

  isMainNet() {
    return this.network.toLowerCase() === constants.NETWORKS.MAINNET
  }

  isTestNet() {
    return this.network.toLowerCase() === constants.NETWORKS.TESTNET
  }
}


export default new SwapApp()