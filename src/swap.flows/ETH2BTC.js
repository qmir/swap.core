import SwapApp from '../swap.app'
import { Flow } from '../swap.swap'


class ETH2BTC extends Flow {

  constructor() {
    super()

    try {
      this.ethSwap = SwapApp.swaps.ethSwap
      this.btcSwap = SwapApp.swaps.btcSwap
    }
    catch (err) {
      throw new Error(`BTC2ETH: ${err}`)
    }

    if (!this.ethSwap) {
      throw new Error('BTC2ETH: "ethSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('BTC2ETH: "btcSwap" of type object required')
    }

    this.state = {
      step: 0,

      signTransactionUrl: null,
      isSignFetching: false,
      isMeSigned: false,

      secretHash: null,
      btcScriptValues: null,

      btcScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      ethSwapCreationTransactionUrl: null,
      isEthContractFunded: false,

      isEthWithdrawn: false,
      isBtcWithdrawn: false,
    }

    super._persistSteps()
    this._persistState()
  }

  _persistState() {
    super._persistState()
  }

  _getSteps() {
    const flow = this

    return [

      // 1. Sign swap to start

      () => {
        // this.sign()
      },

      // 2. Wait participant create, fund BTC Script

      () => {
        flow.swap.room.once('create btc script', ({ scriptValues }) => {
          flow.finishStep({
            secretHash: scriptValues.secretHash,
            btcScriptValues: scriptValues,
          })
        })
      },

      // 3. Verify BTC Script

      () => {
        // this.verifyBtcScript()
      },

      // 4. Check balance

      () => {
        this.syncBalance()
      },

      // 5. Create ETH Contract

      async () => {
        const { participant, sellAmount } = flow.swap

        const swapData = {
          myAddress:            SwapApp.services.auth.eth.address,
          participantAddress:   participant.eth.address,
          secretHash:           flow.state.secretHash,
          amount:               sellAmount,
        }

        await this.ethSwap.create(swapData, (transactionUrl) => {
          flow.setState({
            ethSwapCreationTransactionUrl: transactionUrl,
          })
        })

        flow.swap.room.sendMessage('create eth contract', {
          ethSwapCreationTransactionUrl: flow.state.ethSwapCreationTransactionUrl,
        })

        flow.finishStep({
          isEthContractFunded: true,
        })
      },

      // 6. Wait participant withdraw

      () => {
        flow.swap.room.once('finish eth withdraw', () => {
          flow.finishStep({
            isEthWithdrawn: true,
          })
        })
      },

      // 7. Withdraw

      async () => {
        const { participant } = flow.swap

        const myAndParticipantData = {
          myAddress: SwapApp.services.auth.eth.address,
          participantAddress: participant.eth.address,
        }

        const secret = await flow.ethSwap.getSecret(myAndParticipantData)

        await flow.ethSwap.close(myAndParticipantData)

        const { script } = flow.btcSwap.createScript(flow.state.btcScriptValues)

        await flow.btcSwap.withdraw({
          // TODO here is the problem... now in `btcData` stored bitcoinjs-lib instance with additional functionality
          // TODO need to rewrite this - check instances/bitcoin.js and core/swaps/btcSwap.js:185
          btcData: storage.me.btcData,
          script,
          secret,
        }, (transactionUrl) => {
          flow.setState({
            btcSwapWithdrawTransactionUrl: transactionUrl,
          })
        })

        flow.finishStep({
          isBtcWithdrawn: true,
        })
      },

      // 8. Finish

      () => {

      },
    ]
  }

  async sign() {
    const { participant } = this.swap

    this.setState({
      isSignFetching: true,
    })

    await this.ethSwap.sign(
      {
        myAddress: SwapApp.services.auth.eth.address,
        participantAddress: participant.eth.address,
      },
      (signTransactionUrl) => {
        this.setState({
          signTransactionUrl,
        })
      }
    )

    this.swap.room.sendMessage('swap sign')

    this.finishStep({
      isMeSigned: true,
    })
  }

  verifyBtcScript() {
    this.finishStep({
      btcScriptVerified: true,
    })
  }

  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    const balance = await this.ethSwap.fetchBalance(SwapApp.services.auth.eth.address)
    const isEnoughMoney = sellAmount <= balance

    if (isEnoughMoney) {
      this.finishStep({
        balance,
        isBalanceFetching: false,
        isBalanceEnough: true,
      })
    }
    else {
      this.setState({
        balance,
        isBalanceFetching: false,
        isBalanceEnough: false,
      })
    }
  }
}


export default ETH2BTC