#!/usr/bin/env node
const figlet = require("figlet")
const prog = require('caporal')
const Takahiku = require('../lib/takahiku.js').default

printLogo = () => {
  console.log()
  console.log(figlet.textSync('Takahiku', {
    font: 'Sub-Zero',
    horizontalLayout: 'fitted',
    verticalLayout: 'default'
  }))
  console.log('高低 - Developed by Liam Elgie 2018')
}

prog
  .version('1.0.0')
  .option('--verbose', 'Log all actions made during gameplay')
  .option('--target <score>', 'Target score to reach before causing a game over', prog.INT)
  .option('--train', `Sets target score to 9999999999 and starts a new game upon game over`)
  .option('--db <year>', 'Sets the database to use when retrieving results (currently, only 2017 is supported)', /^2017$/)
  .option('--headless', 'Runs Chromium in headless mode')
  .option('--continuous', 'Starts a new game upon game over')
  .option('--share', 'Keeps the window open upon game over so the share functions can be used')
  .option('--emojiless', 'Removes the use of emojis when logging to the console')
  .action(function(args, options, logger) {
    let launch = async () => {
      let taka = new Takahiku({
        headless: options.headless ? true : false,
        targetScore: options.target ? options.target : false,
        verbose: options.verbose ? true : false,
        continuous: options.continuous ? true : false,
        closeOnGameOver: options.share ? false : true,
        trainingMode: options.train ? true : false,
        emojiless: options.emojiless ? true : false
      })
      printLogo()
      taka._connectToDatabase(options.db ? options.db : '2017').then(async () => {
        taka.start()
      })
    }
    launch()
  });

prog.parse(process.argv)
