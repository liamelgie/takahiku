require("babel-polyfill")
const puppeteer = require('puppeteer')
const delay = require('delay')
// const sqlite = require('sqlite')
const Database = require('better-sqlite3')
const readline = require('readline')

class Takahiku {
  constructor(options) {
    if (typeof options.headless !== 'undefined') this.headless = options.headless
    else this.headless = true
    if (typeof options.targetScore !== 'undefined') this.targetScore = options.targetScore ? options.targetScore : 9999999999
    else this.targetScore = 9999999999
    if (typeof options.verbose !== 'undefined') this.verbose = options.verbose
    else this.verbose = false
    if (typeof options.continuous !== 'undefined') this.continuous = options.continuous
    else this.continuous = false
    if (typeof options.closeOnGameOver !== 'undefined') this.closeOnGameOver = options.closeOnGameOver
    else this.closeOnGameOver = false
    if (typeof options.trainingMode !== 'undefined') this.trainingMode = options.trainingMode
    else this.trainingMode = false
    this.terms = []
  }

  async _connectToDatabase(database) {
    try {
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(`📖  Connecting to the database...`)
      this.db = new Database(`${__dirname}/db/${database}.db`)
    } catch (err) {
      console.error(`❌  Could not connect to the specified database (${database}). The following error was encountered:`)
      console.error(err)
      return false
    }
  }

  async _addTermToDatabase(term) {
    try {
      if (term.score === '0') {
        console.error(`❌  Refusing addition of ${keyword.keyword} to the database due to invalid score (score of 0)`)
        throw new Error('Term contains invalid score (0)')
      }
      let stmt = this.db.prepare('INSERT INTO dictionary VALUES (?, ?)').run(term.keyword, term.score)
      return true
    } catch (err) {
      console.log(`❌  Could not add ${term.keyword} to the database due to the following error:`)
      console.log(err)
      return false
    }
  }

  async _getTermFromDatabase(term) {
    try {
      // Ensure a connection to the database has been established
      if (!this.db) {
        throw new Error("No database connection could be established")
      }
      let retrievedTerm = this.db.prepare('SELECT * FROM dictionary WHERE keyword = ?').get(term.keyword)
      if (!retrievedTerm) {
        return false
      }
      return retrievedTerm
    } catch (err) {
      console.error(`❌  Could not get ${term.keyword} from the database because of the following error:`)
      console.error(err)
    }
  }

  _removeCommasFromScore(score) {
    return score.replace(/,/g, '')
  }

  _removeQuotesFromKeyword(keyword) {
    return keyword.slice(1, -1)
  }

  async _createSession(headless = this.headless) {
    try {
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(`📡  Launching http://www.higherlowergame.com/...`)
      this.browser = await puppeteer.launch({
        headless: headless,  args: [`--window-size=800,720`]
      })
      this.page = await this.browser.newPage()
      await this.page.goto('http://www.higherlowergame.com/')
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _startClassicGame() {
    try {
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(`⏳  Starting game...`)
      await this.page.click('button.game-button:nth-child(1)')
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(`🍀  Ready to go. Good luck! \n`)
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _playAgain() {
    try {
      await this.page.click('#game-over-btn')
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _closeSession() {
    await this.browser.close()
    this.browser = false
    return this.browser
  }

  async _getFirstTerm() {
    try {
      let term = {
        keyword: '',
        score: ''
      }
      term.keyword = this._removeQuotesFromKeyword(await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(1) > div > div.term-keyword > p.term-keyword__keyword').innerText))
      term.score = this._removeCommasFromScore(await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(1) > div > div.term-volume > p.term-volume__volume').innerText))
      this.terms[0] = term
      return this.terms[0]
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _getSecondTerm() {
    let term = {
      keyword: '',
      score: 0
    }
    term.keyword = this._removeQuotesFromKeyword(await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(2) > div > div.term-keyword > p.term-keyword__keyword').innerText))
    term.score = await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(2) > div > div.term-volume > p.term-volume__volume').innerText)
    try {
      let retrievedTerm = await this._getTermFromDatabase(term)
      if (!retrievedTerm) {
        this.terms[1] = term
      } else {
        this.terms[1] = retrievedTerm
      }
      return this.terms[1]
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _getThirdTerm() {
    let term = {
      keyword: '',
      score: 0
    }
    term.keyword = this._removeQuotesFromKeyword(await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(3) > div > div.term-keyword > p.term-keyword__keyword').innerText))
    this.terms[2] = term
    return this.terms[2]
  }

  async _getTerms() {
    try {
      await this._getFirstTerm()
      await this._getSecondTerm()
      await this._getThirdTerm()
      return this.terms
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _pickHigher() {
    await this.page.click('#root > div > span > span > div > div.game > div.term-actions > button.game-button.term-actions__button.term-actions__button--higher')
    return true
  }

  async _pickLower() {
    await this.page.click('#root > div > span > span > div > div.game > div.term-actions > button.game-button.term-actions__button.term-actions__button--lower')
    return true
  }

  async _pickCorrectAnswer() {
    if (parseInt(this.terms[1].score) === 0) {
      if (this.verbose) console.error(`🤞🏼  Could not find term within the dictionary. Picking higher for luck...`)
      await this._pickHigher()
    } else {
      if (parseInt(this.terms[0].score) < parseInt(this.terms[1].score)) {
        if (this.verbose) console.log(`🔼  ${this.terms[0].keyword} has a lower score of ${this.terms[0].score} to ${this.terms[1].keyword}'s ${this.terms[1].score}. Picking higher!`)
        await this._pickHigher()
      } else {
        if (this.verbose) console.log(`🔽  ${this.terms[0].keyword} has a higher score of ${this.terms[0].score} to ${this.terms[1].keyword}'s ${this.terms[1].score}. Picking lower!`)
        await this._pickLower()
      }
    }
  }

  async _pickIncorrectAnswer() {
    if (parseInt(this.terms[1].score) === 0) {
      if (this.verbose) console.error(`🤞🏼 Could not find term within the dictionary. Picking higher in hope to fail...`)
      await this._pickHigher()
    } else {
      if (parseInt(this.terms[0].score) < parseInt(this.terms[1].score)) {
        if (this.verbose) console.log(`🔼  ${this.terms[0].keyword} has a lower score of ${this.terms[0].score} to ${this.terms[1].keyword}'s ${this.terms[1].score}. Picking lower to lose!`)
        await this._pickLower()
      } else {
        if (this.verbose) console.log(`🔽  ${this.terms[0].keyword} has a higher score of ${this.terms[0].score} to ${this.terms[1].keyword}'s ${this.terms[1].score}. Picking higher to lose!`)
        await this._pickHigher()
      }
    }
  }

  async _getScore(finalScore = false) {
    if (finalScore) return await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div > div.game-end-score-wrapper > p > span').innerText)
    let score = await this.page.evaluate(() => document.querySelector('html.wf-rooneysans-n7-active.wf-rooneysans-i7-active.wf-rooneysans-i4-active.wf-rooneysans-n4-active.wf-active body div#root div.pack-session span span div.game-container div.score-bar div.score-bar__score.score-bar__score--score span p').innerText)
    return score = parseInt(score.replace(/Score:/g, ''))
  }

  async _checkTargetScore() {
    if (!this.targetScore) return false
    if (await this._getScore() >= this.targetScore) return true
    return false
  }

  async _getPercentageTowardsTarget() {
    return await (await this._getScore() / this.targetScore) * 100
  }

  async _getProgressBar(progress) {
    return progress < 5 ? '[                    ]' :
    progress < 10 ? '[#                   ]' :
    progress < 15 ? '[##                  ]' :
    progress < 20 ? '[###                 ]' :
    progress < 25 ? '[####                ]' :
    progress < 30 ? '[#####               ]' :
    progress < 35 ? '[######              ]' :
    progress < 40 ? '[#######             ]' :
    progress < 45 ? '[########            ]' :
    progress < 50 ? '[#########           ]' :
    progress < 55 ? '[##########          ]' :
    progress < 60 ? '[###########         ]' :
    progress < 65 ? '[############        ]' :
    progress < 70 ? '[#############       ]' :
    progress < 75 ? '[##############      ]' :
    progress < 80 ? '[###############     ]' :
    progress < 85 ? '[################    ]' :
    progress < 90 ? '[#################   ]' :
    progress < 95 ? '[##################  ]' :
    progress < 100 ? '[################### ]' :
    '[####################]'
  }

  async _printProgress(gameOver = false) {
    try {
      if (gameOver) {
        if (await this._getScore(true) >= this.targetScore) {
          process.stdout.cursorTo(0)
          process.stdout.write(`🎊  Game over! You reached your target and finished with a score of ${await this._getScore(true)}`)
          process.stdout.write('\n')
          return true
        }
        process.stdout.cursorTo(0)
        process.stdout.write(`🎊  Game over! You finished with a score of ${await this._getScore(true)} `)
        process.stdout.write('\n')
        return true
      }
      process.stdout.cursorTo(0)
      process.stdout.write(`🤖  Playing... Progress: ${await this._getProgressBar(await this._getPercentageTowardsTarget())} Score: ${await this._getScore()} / ${this.targetScore}`)
      return true
    } catch (err) {
      console.error(err)
      return 0
    }
  }

  async _playRound() {
    try {
      if (!this.verbose) await this._printProgress()
      await this._getTerms()
      const doesTermExist = await this._getTermFromDatabase(this.terms[0])
      if (!doesTermExist) {
        if (this.verbose) console.log(`✏️  ${this.terms[0].keyword} is not present in the dictionary. Adding it...`)
        await this._addTermToDatabase(this.terms[0])
      }
      if (await this._checkTargetScore()) await this._pickIncorrectAnswer()
      else await this._pickCorrectAnswer()
      await delay(SECOND * 3)
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _checkForAd() {
    if (await this.page.evaluate(() => document.querySelector('#adContainer')) !== null) {
      process.stdout.write('\n')
      let timeRemaining = 14
      while (timeRemaining !== 0) {
        await delay(SECOND)
        readline.clearLine(process.stdout, 0)
        readline.cursorTo(process.stdout, 0)
        process.stdout.write(`💰  Ad detected. Waiting ${timeRemaining} seconds for it to expire...`)
        timeRemaining -= 1
      }
      readline.clearLine(process.stdout, 0)
      return true
    } else {
      return false
    }
  }

  async _checkForGameOver() {
    // Allow a second for the game over view to load
    await delay(SECOND * 1.5)
    // Since ads are only shown on a game over, return true
    if (await this._checkForAd()) {
      return true
    }
    if (await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div > div.game-end-score-wrapper > p')) !== null) return true
    else return false
  }

  _createExitPrompt() {
    console.log('👋  All done? Press Enter / Return to exit')
    process.stdin.on('data', process.exit.bind(process, 0))
  }

  async _playGame() {
    await this._playRound()
    if (await this._checkForGameOver()) {
      await delay(SECOND)
      if (this.continuous) {
        await this._printProgress(true)
        console.log('🔁  Continuous mode enabled. Next!')
        await this._playAgain()
        await delay(SECOND)
        await this._playGame()
        return false
      } else {
        await this._printProgress(true)
        if (this.closeOnGameOver) await this._closeSession()
        if (!this.trainingMode) this._createExitPrompt()
        return true
      }
      return false
    } else {
      await this._playGame()
    }
  }

  async _getTermCountFromDatabase() {
    try {
      let terms = this.db.prepare('SELECT * FROM dictionary').all()
      return terms.length
    } catch (err) {
      console.error(`❌  Could not get terms from the database because of the following error:`)
      console.error(err)
      return false
    }
  }

  async train() {
    while (true) {
      this.targetScore = 9999999999
      if (!this.browser) {
        await this._createSession()
        await delay(SECOND * 2)
        await this._startClassicGame()
        await delay(SECOND)
        console.log(`🏫  Attempting to learn new terms via trial and error. The current term count is ${await this._getTermCountFromDatabase()}`)
        await this._playGame()
      }
    }
  }

  async start() {
    if (this.trainingMode) {
      this.train()
    } else {
      await this._createSession()
      await delay(SECOND * 2)
      await this._startClassicGame()
      await delay(SECOND * 2)
      await this._playGame()
    }
  }
}

const SECOND = 1000

exports.default = Takahiku
