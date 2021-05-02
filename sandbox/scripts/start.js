const { spawn } = require('child_process')

require('dotenv').config()

spawn('pulumi', ['up', '-yf'], {
  stdio: 'inherit',
  shell: true
})
