'use strict'
global.__base = __dirname + '' // Need for node modules paths

const Web3 = require('web3')
const express = require('express')
const fs = require('fs')
const app = express()
const bodyParser = require('body-parser')
const logger = require('./utils/logger.js')
const errorCodes = require('./utils/errorCodes.js')
const emailChecker = require('./utils/emailChecker.js')
const userRepository = require('./repositories/userRepository.js')
const branchClient = require('./clients/branchClient.js')
const config = require('config')
const helmet = require('helmet')

const web3 = new Web3(new Web3.providers.HttpProvider(config.get('Web3.Provider.uri')))

process.on('uncaughtException', function (err) {
  console.error(
    new Date().toUTCString() + ' uncaughtException: ' + err.message + err.stack + ' process exit 1'
  )
  logger.error(
    '19 uncaughtException: ' + err.message + err.stack + ' process exit 1'
  )
  // process.exit(1)
})

process.on('unhandledRejection', function(err) {
  console.error(
    new Date().toUTCString() + ' unhandledRejection: ' + err.message + err.stack + ' process exit 1'
  )
  logger.error(
    '25 unhandledRejection: ' + err.message + err.stack + ' process exit 1'
  )
})

app.use(logger.connectLogger())
app.use(helmet())
app.use(bodyParser.json()) // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })) // support encoded b
app.use(function (req, res, next) {
  res.setHeader('Content-Type', 'application/json')
  next()
})

var obj = JSON.parse(
  fs.readFileSync('./build/contracts/BatteryInsurancePolicy.json', 'utf8')
)
var abiArray = obj.abi

var contractAddress = config.get('Web3.Contracts.batteryV2')
var policyContract = web3.eth.contract(abiArray).at(contractAddress)

var adminAccount = config.get('Web3.Provider.adminAccount')
var adminPass = config.get('Web3.Provider.adminPass')
var apiKey = config.get('App.apiKey')

app.get('/favicon.ico', function (req, res) {
  res.status(204)
})

app.get('/time', function (req, res) {
  var currentDate = new Date()
  var result = {
    now: currentDate.toISOString(),
    tamezoneOffset: currentDate.getTimezoneOffset()
  }

  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(result))
})

app.get('/test/:email', async function (req, res) {
  let result = await emailChecker.checkEmail(req.params.email)
  result = await userRepository.getUserAccountAddress('matiaslahore@gmail.com')
  result = await userRepository.saveAccount('0x01f81cda7e08353ca6a31bbfaaa862c96d2e4b69', 'matiaslahore2@gmail.com', '12345678', result)
  result = await branchClient.getBranchIdentity('')
  res.send(result)
})

app.get('/balance/:email', async function (req, res) {
  let account = await userRepository.getUserAccountAddress(req.params.email)
  var balance = web3.eth.getBalance(account).toNumber()
  var balanceInEth = balance / 1000000000000000000
  res.send('' + balanceInEth)
})

app.post('/sendTestnetEthers/:account', async function (req, res) {
  let accountOrigin = req.params.account
  let accountDestination = await userRepository.getUserAccountAddress(req.body.emailDestination)
  let passwordDestination = req.body.password
  var receivedApiKey = req.body.apiKey

  if (receivedApiKey !== apiKey) {
    res.status(401)
    res.send()
    return
  }

  web3.personal.unlockAccount(accountDestination, passwordDestination, 4, function (
    err,
    adminAccResult
  ) {
    web3.eth.sendTransaction(
      {
        value: 10000000000000000000,
        gas: 2000000,
        from: accountOrigin,
        to: accountDestination
      },
      function (err, result) {
        if (err) {
          logger.error('87 ' + err)
          res.send({ error: '87' })
        } else {
          var txId = result
          res.send('' + txId)
        }
      }
    )
  })
})

app.post('/sendTestnetEthers', async function (req, res) {
  let passwordOrigin = req.body.passwordOrigin
  let passwordDestination = req.body.password
  let accountOrigin = await userRepository.getUserAccountAddress(req.body.emailOrigin)
  let accountDestination = await userRepository.getUserAccountAddress(req.body.emailDestination)
  var receivedApiKey = req.body.apiKey

  if (receivedApiKey !== apiKey) {
    res.status(401)
    res.send()
    return
  }

  web3.personal.unlockAccount(accountOrigin, passwordOrigin, 4, function (
    err,
    accResult
  ) {
    if (accResult) {
      // unlocking admin account for ethers sending
      web3.personal.unlockAccount(accountDestination, passwordDestination, 4, function (
        err,
        adminAccResult
      ) {
        web3.eth.sendTransaction(
          {
            value: 10000000000000000000,
            gas: 2000000,
            from: accountOrigin,
            to: accountDestination
          },
          function (err, result) {
            if (err) {
              logger.error('87 ' + err)
              res.send({ error: '87' })
            } else {
              var txId = result
              res.send('' + txId)
            }
          }
        )
      })
    } else {
      logger.error('107 ' + err)
      res.send({ code: '107', error: err })
    }
  })
})

// referralEmail - user email who invited
// todo refactor password
app.post('/register', async function(req, res) {
  if (!req.body.password || !req.body.email || req.body.apiKey !== apiKey) {
    logger.warning(
      'Request not valid: psw: ' + req.body.password + ' email: ' + req.body.email + ' api: ' + req.body.apiKey
    )
    res.status(400)
    res.send(JSON.stringify({ errorCode: errorCodes.inputParamsNotValid }))
    return
  }

  let emailIsValid = await emailChecker.checkEmail(req.body.email)
  if (!emailIsValid) {
    logger.warning('Email is not Valid: email: ' + req.body.email)
    res.status(400)
    res.send(JSON.stringify({ errorCode: errorCodes.emailIsNotValid }))
    return
  }
  let email = req.body.email.toLowerCase()

  try {
    let userAccount = await userRepository.getUserAccountAddress(email)

    if (userAccount) {
      if (userAccount === 'empty') {
        userAccount = await web3.personal.newAccount(req.body.password)
        await userRepository.updateAccount(userAccount, email, req.body.password)
        res.send(userAccount)
      } else {
        res.send(userAccount)
      }
    } else {
      userAccount = await web3.personal.newAccount(req.body.password);
      await userRepository.saveAccount(userAccount, email, req.body.password);

      res.send(userAccount)
    }
  } catch (error) {
    logger.error('156 ' + error)
    res.status(500)
    res.send('' + error)
  }
})

// checkReferral(apiKey, email, referralIdentity)
app.post('/checkReferral', async function (req, res) {
  res.send('OK')
})

app.post('/insurancePrice', function (req, res) {
  var b = req.body
  var result = policyContract.policyPrice(b.deviceBrand, b.deviceYear, b.wearLevel, b.region)
  var priceInEth = result / 1000000000000000000
  res.send('' + priceInEth)
})

app.get('/maxPayout', function (req, res) {
  var result = policyContract.maxPayout.call()
  var payoutInEth = result / 1000000000000000000
  res.send('' + payoutInEth)
})

app.post('/insure', async function (req, res) {
  var b = req.body
  let account = await userRepository.getUserAccountAddress(b.email)

  if (b.apiKey !== apiKey) {
    logger.warning('Provided apiKey = ' + b.receivedApiKey + ' is not valid. Return 401')
    res.status(401)
    res.send()
    return
  }

  logger.infoInsure('address: ' + account + ', request: ' + JSON.stringify(b))

  var policyMonthlyPayment = Math.round(
    policyContract.policyPrice(b.deviceBrand, b.deviceYear, b.wearLevel, b.region) / 12
  )

  web3.personal.unlockAccount(account, b.password, 20, function (
    err,
    result
  ) {
    if (err) {
      logger.error('323 ' + err)
      res.status(400)
      res.send('1' + err)
      return
    }

    if (result) {
      policyContract.insure(b.itemId, b.deviceBrand, b.deviceYear, b.wearLevel, b.region,
        {
          value: policyMonthlyPayment,
          gas: 300000,
          gasPrice: 30000000000,
          from: account
        },
        function (err, result) {
          if (err) {
            logger.error('294 ' + err)
            res.status(400)
            res.send('1' + err)
          } else {
            var txIdinsure = result
            res.send(txIdinsure)

            let filter = web3.eth.filter('latest')
            filter.watch(function (error, result) {
              if (error) {
                logger.error('316 error in filter watch ' + error)
                res.status(400)
                res.send('1' + error)
                return
              }

              let confirmedBlock = web3.eth.getBlock(web3.eth.blockNumber - 3)
              if (confirmedBlock.transactions.length > 0) {
                let transaction = web3.eth.getTransaction(txIdinsure)

                if (transaction && transaction.from === account) {
                  // ---- confirmation transaction is needed from OWNER , TODO: refactor it and move to other file

                  web3.personal.unlockAccount(
                    adminAccount,
                    adminPass,
                    2,
                    function (err, result) {
                      if (result) {
                        policyContract.confirmPolicy(
                          account,
                          {
                            gas: 200000,
                            gasPrice: 15000000000,
                            from: adminAccount
                          },
                          function (err, result) {
                            if (err) {
                              logger.error('328 ' + err)
                              res.status(400)
                              res.send('2' + err)
                            } else {
                              // res.send(txIdinsure);
                              logger.info('success confirmation')
                            }
                          }
                        )
                      } else {
                        logger.error('338 ' + err)
                      }
                    }
                  )
                } else {
                  logger.warning('353 return 400: transaction.from != account')
                  res.status(400)
                  res.send('4' + 'ransaction.from != account')
                }
                filter.stopWatching()
              }
            })
          }
        }
      )
    } else {
      logger.warning('364 return 400 result: ' + result)
      res.status(400)
      res.send('5' + result)
    }
  })
})

app.get('/policyEndDate/:email', async function (req, res) {
  let account = await userRepository.getUserAccountAddress(req.params.email)
  var result = policyContract.getPolicyEndDateTimestamp({ from: account })
  res.send('' + result)
})

app.get('/nextPayment/:email', async function (req, res) {
  let account = await userRepository.getUserAccountAddress(req.params.email)
  var result = policyContract.getPolicyNextPayment({ from: account })
  res.send('' + result)
})

app.get('/claimed/:email', async function (req, res) {
  let account = await userRepository.getUserAccountAddress(req.params.email)
  var result = policyContract.claimed({ from: account })
  res.send('' + result)
})

// Not secure, it should come trusted authority, probably as an Oracle directly to smart contract
app.post('/claim/:email', async function (req, res) {
  let account = await userRepository.getUserAccountAddress(req.params.email)
  var b = req.body

  if (b.apiKey !== apiKey) {
    logger.error('437 not valid ' + b.api)
    res.status(401)
    res.send()

    return
  }

  logger.infoClaim('address: ' + account + ', request: ' + JSON.stringify(req.body))

  web3.personal.unlockAccount(account, b.password, 2, function (err, result) {
    if (err) {
      logger.error('421 ' + err)
      res.status(400)
      res.send('' + false)
      return
    }

    if (result) {
      policyContract.claim(b.wearLevel, { gas: 400000, from: account }, function (
        err,
        result
      ) {
        if (err) {
          logger.error('407' + err)
          res.status(400)
          res.send('' + false)
        } else {
          console.log('result' + result)
          var txId = result
          res.send(txId)
        }
      })
    } else {
      logger.error('444 result is undefined ' + result)
      res.status(400)
      res.send('' + false)
    }
  })
})

app.get('/', function (req, res) {
  res.send('Welcome to API. Specs can be found: ')
})

app.listen(process.env.PORT || 3000, function () {
  logger.info(
    'Example app listening on port 3000 and https or process.env.PORT: ' + process.env.PORT
  )
})
