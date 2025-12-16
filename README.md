# Study Helper
This is a Chrome Extension that detects questions in webpages and returns an AI generated answer using Google's Gemini
## What it does
When you press the *Read Questions* button, it will give a list of questions detected on your page. 
<!--Put gif of working button here-->

## Features
- Detects questions on webpages
- Clean popup GUI
- AI-generated answers
- Stealth-mode (WIP)

## Usage
1. Open any webpage
2. Click the extension icon
    1. If you're not signed in, do so
3. Click *Generate Questions*
4. Click the question you want the answer of
5. The answer of the question will appear underneath

## Stealth Mode!
1. Open the extension as normal (make sure you're signed in)
2. Click the eyeball in the top right to enable stealth mode
3. Alt + Click any text on the avaliable websites (see below) to get the answer right next to it
4. When you want to quickly hide everything, you can press ESC to delete all the answers
5. To disable, press the now ninja button in the extension page

## Installation
1. Download the newest extension file from the [releases page](https://github.com/TheNooby28/StudyHelper/releases)
2. The extension should have been imported into Google Chrome
3. Pin the extension
4. Open the extension on any webpage and enjoy!

## Error codes (What they mean)
- 400 - Lack of parameters
    - Missing question
    - Missing username/password
    - Too short of password
- 401 - Not signed in/Invalid credentials
- 409 - Username taken
- 429 - Daily limit reached
- 500 - API error

## What's used
* Frontend
    * HTML
    * JavaScript
    * CSS
* Backend
    * JavaScript
    * NodeJS
    * Google Gemini API

## Roadmap (future plans)
- Adding answer history
- Polishing *stealth mode*

## License
MIT License