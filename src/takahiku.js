const puppeteer = require('puppeteer')
const delay = require('delay')
const sqlite3 = require('sqlite3').verbose()
const sqlite = require('sqlite')

class Takahiku {
  constructor(options) {
    if (typeof options.headless !== 'undefined') this.headless = options.headless
    else this.headless = true
    this.terms = [

    ]
  }

  async _connectToDatabase(database) {
    try {
      this.db = await sqlite.open(`${__dirname}/db/${database}.db`, { Promise })
    } catch (err) {
      console.error(`Could not connect to the specified database (${database}). The following error was encountered:`)
      console.error(err)
      return false
    }
  }

  async _addTermToDatabase(term) {
    try {
      if (term.score === '0') {
        console.error(`Refusing addition of ${keyword.keyword} to the database due to invalid score (score of 0)`)
        throw new Error('Term contains invalid score (0)')
      }
      const sql = 'INSERT INTO dictionary VALUES ($keyword, $score)'
      await this.db.run(sql, {
        $keyword: term.keyword,
        $score: term.score
      })
      return true
    } catch (err) {
      console.log(`Could not add ${term.keyword} to the database due to the following error:`)
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
      const sql = 'SELECT * FROM dictionary WHERE keyword = $keyword'
      let retrievedTerm = await this.db.get(sql, { $keyword: term.keyword })
      if (!retrievedTerm) {
        return false
      }
      return retrievedTerm
    } catch (err) {
      console.error(`Could not get ${term.keyword} from the database because of the following error:`)
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
      this.browser = await puppeteer.launch({headless: headless})
      this.page = await this.browser.newPage()
      await this.page.goto('http://www.higherlowergame.com/')
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _startClassicGame() {
    try {
      await this.page.click('button.game-button:nth-child(1)')
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

  async _getVersusBlock() {
    if (await this.page.evaluate(() => document.querySelector('html.wf-rooneysans-n7-active.wf-rooneysans-i7-active.wf-rooneysans-i4-active.wf-rooneysans-n4-active.wf-active body div#root div.pack-session span span div.game-container div.game div.versus-block-wrapper div.versus-block.versus-block--loss') !== null)) {
      return "loss"
    } else if (await this.page.evaluate(() => document.querySelector('html.wf-rooneysans-n7-active.wf-rooneysans-i7-active.wf-rooneysans-i4-active.wf-rooneysans-n4-active.wf-active body div#root div.pack-session span span div.game-container div.game div.versus-block-wrapper div.versus-block.versus-block--win') !== null)) {
      return "win"
    } else {
      return false
    }
  }

  async _getScore(finalScore = false) {
    if (finalScore) return await this.page.evaluate(() => document.querySelector('html.wf-rooneysans-n7-active.wf-rooneysans-i7-active.wf-rooneysans-i4-active.wf-rooneysans-n4-active.wf-active body div#root div.pack-session span span div.game-end div.game-end__wrapper div.game-end-score-wrapper p.game-end-score span.game-end-score__score').innerText)
    let score = await this.page.evaluate(() => document.querySelector('html.wf-rooneysans-n7-active.wf-rooneysans-i7-active.wf-rooneysans-i4-active.wf-rooneysans-n4-active.wf-active body div#root div.pack-session span span div.game-container div.score-bar div.score-bar__score.score-bar__score--score span p').innerText)
    return score = score.replace(/Score:/g, '')
  }

  async _printProgress(gameOver = false) {
    try {
      if (gameOver) {
        process.stdout.cursorTo(0)
        process.stdout.write(`Game over! Final score: ${await this._getScore(true)}`)
        process.stdout.write('\n')
        return true
      }
      process.stdout.cursorTo(0)
      process.stdout.write(`Current score: ${await this._getScore()}`)
      return true
    } catch (err) {
      console.error(err)
      return 0
    }
  }

  async _playRound(verbose=false) {
    try {
      if (!verbose) await this._printProgress()
      await this._getTerms()
      const doesTermExist = await this._getTermFromDatabase(this.terms[0])
      if (!doesTermExist) {
        if (verbose) console.log(`${this.terms[0].keyword} is not present in the dictionary. Adding it...`)
        await this._addTermToDatabase(this.terms[0])
      }
      if (parseInt(this.terms[1].score) === 0) {
        if (verbose) console.error(`Could not find term within the dictionary. Picking lower for luck...`)
        await this._pickLower()
      } else {
        if (parseInt(this.terms[0].score) < parseInt(this.terms[1].score)) {
          if (verbose) console.log(`${this.terms[1].keyword} has a lower score of ${this.terms[1].score} to ${this.terms[0].keyword}'s ${this.terms[0].score}. Picking higher!`)
          await this._pickHigher()
        } else {
          if (verbose) console.log(`${this.terms[1].keyword} has a higher score of ${this.terms[1].score} to ${this.terms[0].keyword}'s ${this.terms[0].score}. Picking lower!`)
          await this._pickLower()
        }
      }
      await delay(SECOND * 3.5)
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async _checkForAd() {
    if (await this.page.evaluate(() => document.querySelector('#adContainer')) !== null) return true
    else return false
  }

  async _checkForGameOver() {
    // Since ads are only shown on a game over, return true
    if (await this._checkForAd()) {
      return true
    }
    if (await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div > div.game-end-score-wrapper > p')) !== null) return true
    else return false
  }

  async _playGame(verbose = false, playAgain = false) {
    await this._playRound(verbose)
    if (await this._checkForGameOver()) {
      await this._printProgress(true)
      console.error('Uwu we made a fucky wucky. Trying again!')
      if (playAgain && !await this._checkForAd()) {
        await this._playAgain()
        await delay(SECOND)
        await this._playGame(verbose, playAgain)
        return false
      }
      await this._closeSession()
      return false
    } else {
      await this._playGame(verbose, playAgain)
    }


    // this._playRound().then(async () => {
    //   if (await this._checkForGameOver()) {
    //     console.log("Uwu We made a fucky wucky")
    //     this._closeSession().then(() => {
    //       return false
    //     })
    //   } else {
    //     await this._playGame()
    //   }
    // })
  }

  _getTermCountFromDatabase() {
    let termCount = 0
    const sql = 'SELECT * FROM dictionary'
    this.db.each(sql, (err, row) => {
      if (err) {
        console.error(`Could not get terms from the database because of the following error:`)
        console.error(err)
        return false
      }
      if (!err && !row) {
        return false
      }
      termCount += 1
    })
    return termCount
  }

  async learn() {
    const termCount = await this._getTermCountFromDatabase()
    console.log(`Learning new terms via trial and error. The current term count is ${termCount}`)
    console.log('Good luck!')
    // Register exit handler
    process.on('SIGINT', async () => {
      const newTermCount = await this._getTermCountFromDatabase()
      const termCountDifference = newTermCount - termCount
      console.log(`Ending learning session...`)
      await this._closeSession()
      console.log(`The dictionary has gained a total of ${termCountDifference} from this session. Well done!`)
    })
    while (true) {
      if (!this.browser) {
        await this._createSession()
        await delay(SECOND * 2)
        await this._startClassicGame()
        await delay(SECOND)
        await this._playGame(false, true)
      }
    }
  }

}

const SECOND = 1000


// taka.learn()
let term = {
  keyword: "Beer",
  score: 0
}
let test = async () => {
  let taka = new Takahiku({
    headless: false
  })
  taka._connectToDatabase('2017').then(async () => {
    taka.learn()
    // await taka._createSession()
    // await delay(SECOND * 2)
    // await taka._startClassicGame()
    // await delay(SECOND)
    // await taka._playGame()
  })
}

test()
