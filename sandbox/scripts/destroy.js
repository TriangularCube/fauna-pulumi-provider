const { spawn } = require('child_process')

require('dotenv').config()

spawn('pulumi', ['destroy', '-yf'], {
  stdio: 'inherit',
  shell: true
})
