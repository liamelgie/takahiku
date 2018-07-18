const puppeteer = require('puppeteer')
const delay = require('delay')
const sqlite3 = require('sqlite3').verbose()

class Takahiku {
  constructor(options) {
    this.terms = [

    ]
    this.db = this._connectToDatabase()
  }

  _connectToDatabase() {
    return new sqlite3.Database(__dirname + '/db/2017.db', (err) => {
      if (err) {
        console.error(err.message)
        return false
      }
      console.log('Connected to the 2017 database.');
    });
  }

  _addTermToDatabase(term) {
    if (term.score === '0') {
      console.error(`Refusing addition of ${keyword.keyword} to the database due to invalid score (score of 0)`)
      return false
    }
    const sql = 'INSERT INTO dictionary VALUES ($keyword, $score)'
    this.db.run(sql, {
      $keyword: term.keyword,
      $score: term.score
    }, (err) => {
      if (err) {
        console.error(`Could not add ${term.keyword} to the database because of the following error:`)
        console.error(err)
        return false
      }
      return true
    })
  }

  _getTermFromDatabase(term) {
    const sql = 'SELECT * FROM dictionary WHERE keyword = $keyword'
    this.db.get(sql, {
      $keyword: term.keyword
    }, (err, row) => {
      if (err) {
        console.error(`Could not get ${term.keyword} from the database because of the following error:`)
        console.error(err)
        return false
      }
      if (!err && !row) {
        return false
      }
      return row
    })
  }

  __removeCommasFromScore(score) {
    return score.replace(/,/g, '')
  }

  async _createSession() {
    this.browser = await puppeteer.launch({headless: false})
    this.page = await this.browser.newPage()
    await this.page.goto('http://www.higherlowergame.com/')
    return this
  }

  async _startClassicGame() {
    await this.page.click('button.game-button:nth-child(1)')
    return this
  }

  async _closeSession() {
    await this.browser.close()
    return this
  }

  async _getFirstTerm() {
    let term = {
      keyword: '',
      score: ''
    }
    term.keyword = await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(1) > div > div.term-keyword > p.term-keyword__keyword').innerText)
    term.score = await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(1) > div > div.term-volume > p.term-volume__volume').innerText)
    term.score = this.__removeCommasFromScore(term.score)
    this.terms[0] = term
    return term
  }

  async _getSecondTerm() {
    let term = {
      keyword: ''
    }
    term.keyword = await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(2) > div > div.term-keyword > p.term-keyword__keyword').innerText)
    term.score = await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(2) > div > div.term-volume > p.term-volume__volume').innerText)
    this.terms[1] = term
    return term
  }

  async _getThirdTerm() {
    let term = {
      keyword: ''
    }
    term.keyword = await this.page.evaluate(() => document.querySelector('#root > div > span > span > div > div.game > div.game-scroller.game-scroller--new > div:nth-child(3) > div > div.term-keyword > p.term-keyword__keyword').innerText)
    this.terms[2] = term
    return term
  }

  async _getTerms() {
    await this._getFirstTerm()
    await this._getSecondTerm()
    await this._getThirdTerm()
    return this.terms
  }

  async _pickHigher() {
    await this.page.click('#root > div > span > span > div > div.game > div.term-actions > button.game-button.term-actions__button.term-actions__button--higher')
    return true
  }

  async _pickLower() {
    await this.page.click('#root > div > span > span > div > div.game > div.term-actions > button.game-button.term-actions__button.term-actions__button--lower')
    return true
  }

  async _playRound() {
    await this._getTerms()
    let retrievedFirstTerm = await this._getTermFromDatabase(this.terms[0])
    if (!retrievedFirstTerm) {
      console.log(`${this.terms[0].keyword} is not present in the dictionary. Adding it...`)
      this._addTermToDatabase(this.terms[0])
    }
    let retrievedSecondTerm = await this._getTermFromDatabase(this.terms[1])
    if (!retrievedSecondTerm) {
      console.error(`Could not find term within the dictionary. Picking lower for luck...`)
      this._pickLower()
    } else {
      if (parseInt(this.terms[0].score) > parseInt(retrievedSecondTerm.score)) {
        await this._pickHigher()
      } else {
        await this._pickLower()
      }
    }
    await delay(SECOND * 5).then(() => {
      return true
    })
    // if (await this._checkForGameOver()) {
    //   console.log("Uwu We made a fucky wucky")
    //   return false
    // } else {
    //   console.log("We did it, Reddit!")
    //   if (!retrievedSecondTerm) {
    //     await this._getTerms()
    //     this._addTermToDatabase(this.terms[0])
    //   }
    //   return true
    // }
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

  async _playGame() {
    while (!this._checkForGameOver()) {
      await this._playRound()
    }
    this._closeSession()
  }

}

const SECOND = 1000

let meme = async () => {
  let taka = new Takahiku()
  await taka._createSession()
  await delay(SECOND * 2)
  await taka._startClassicGame()
  await delay(SECOND)
  await taka._playRound()
  if (await taka._checkForGameOver()) await taka._closeSession()
  else await taka._playRound()
}

meme()
