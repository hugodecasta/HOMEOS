const fs = require('fs')

if (fs.existsSync('index.js')) {
    console.log('index.js already exists, remove it before setting up !')
    process.exit(1)
}

fs.copyFileSync('example.js', 'index.js')