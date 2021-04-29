const { spawn } = require('child_process')

require('dotenv').config()

spawn('pulumi', ['up'], {
  stdio: 'inherit',
  shell: true
})
