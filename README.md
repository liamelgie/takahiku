# Takahiku

Automated bot for the browser-based version of ["The Higher Lower Game"](http://www.higherlowergame.com)

## Installation

Install [Takahiku](https://www.npmjs.com/package/takahiku) via npm by doing the following:

````
npm i -g takahiku --unsafe-perm=true
````

Note: Takahiku is dependent on Puppeteer which will download a version of Chromium for your platform upon installation (~170Mb Mac, ~282Mb Linux, ~280Mb Win). Takahiku is also dependent on sqlite3 which can be installed via your package manager.

Don't have node/npm installed? Get it [here](https://nodejs.org/en/)

## Usage

To start Takahiku, simply run the following:

````
takahiku
````

### Options

`--target <score>`:

Specifies the target score to reach before deliberately causing a game over. Useful when attempting to share a screenshot of a specific score.

If absent, the target score will default to `9999999999`.

`--headless`:

Runs Chromium in headless mode

`--db <year>`:

Specifies the database to use when retrieving scores. `2017` is currently the only database available and contains the data used by The Higher Lower Game as of 27/07/2018.

If absent, the database will default to `2017`.

`--verbose`:

Runs Takahiku in verbose mode.

`--continuous`:

Runs Takahiku in continuous mode. Upon game over, a new game will be started **immediately**.

`--share`:

Upon game over, the Chromium window will be kept open until closed by the user. This allows the use of the share buttons on the game over screen.

`--emojiless`:

Disables the use of emojis when outputting to the console. This prevents � symbols on systems/terminals that lack emoji support.

I personally recommend and use [Hyper](https://hyper.is).

`--train`:

Starts Takahiku in training mode. This mode sets the target score to `9999999999` and enables continuous mode.
