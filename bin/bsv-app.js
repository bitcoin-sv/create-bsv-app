#!/usr/bin/env node
const { Command } = require('commander')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs-extra')
const simpleGit = require('simple-git')
const figlet = require('figlet')

let inquirer
let chalk

// Gracefully handle SIGINT (CTRL+C) globally
process.on('SIGINT', () => {
  console.log('\n🚪 Exiting... Goodbye!')
  process.exit(0)
})

async function run() {
  chalk = (await import('chalk')).default
  inquirer = (await import('inquirer')).default

  const program = new Command()

  const templates = {
    'Meter - A feature-packed starting point': 'https://github.com/p2ppsr/meter.git',
    // 'Hello-World - Your first steps into BSV': 'https://github.com/p2ppsr/overlay-demo-ui.git',
  }

  async function checkGitInstalled() {
    try {
      execSync('git --version', { stdio: 'ignore' })
    } catch (error) {
      console.error(
        chalk.red('Git is not installed or not available in PATH. Please install Git and try again.')
      )
      process.exit(1)
    }
  }

  async function checkNpmInstalled() {
    try {
      execSync('npm --version', { stdio: 'ignore' })
    } catch (error) {
      console.error(
        chalk.red('npm is not installed or not available in PATH. Please install Node.js and try again.')
      )
      process.exit(1)
    }
  }

  async function cloneTemplate(templateUrl, projectDir) {
    try {
      const git = simpleGit()
      console.log(chalk.blue(`Cloning repository from ${templateUrl}...`))
      await git.clone(templateUrl, projectDir)
      console.log(chalk.green(`Repository cloned to ${projectDir}`))
    } catch (error) {
      console.error(chalk.red('Error cloning repository:'), error.message)
      process.exit(1)
    }
  }

  async function installDependencies(projectDir) {
    const installInDir = async (dir) => {
      const packageJsonPath = path.join(dir, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        try {
          console.log(chalk.blue(`Installing dependencies in ${dir}...`))
          execSync('npm install', { cwd: dir, stdio: 'inherit' })
          console.log(chalk.green(`Dependencies installed successfully in ${dir}.`))
        } catch (error) {
          console.error(chalk.red(`Error installing dependencies in ${dir}:`), error.message)
          process.exit(1)
        }
      } else {
        console.warn(chalk.yellow(`No package.json found in ${dir}. Skipping dependency installation.`))
      }
    }

    // Install root dependencies
    await installInDir(projectDir)

    // Check and install dependencies in frontend and backend directories if they exist
    const frontendDir = path.join(projectDir, 'frontend')
    const backendDir = path.join(projectDir, 'backend')

    if (fs.existsSync(frontendDir)) {
      await installInDir(frontendDir)
    }

    if (fs.existsSync(backendDir)) {
      await installInDir(backendDir)
    }
  }

  async function customizePackageJson(projectDir, customizations) {
    const packageJsonPath = path.join(projectDir, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath)
      for (const key of Object.keys(customizations)) {
        packageJson[key] = customizations[key]
      }
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 })
      console.log(`Modified package.json: ${JSON.stringify(packageJson, null, 2)}`)
    }
  }

  console.log(
    chalk.yellow(
      figlet.textSync('BSV', { horizontalLayout: 'full' })
    )
  )
  console.log(chalk.green.bold('Start building your BSV-powered app with ease! 🚀'))

  await checkGitInstalled()
  await checkNpmInstalled()

  program
    .option('-s, --skip-install', 'Skip npm install')
    .option('-g, --git-init', 'Initialize a new git repository')
    .option('-y, --yes', 'Use default options without prompting')
    .parse(process.argv)

  const options = program.opts()

  let template, projectName, authorName

  try {
    if (options.yes) {
      template = 'meter'
      projectName = 'bsv-app'
      authorName = ''
    } else {
      const { templateChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'templateChoice',
          message: 'Which template would you like to use?',
          choices: Object.keys(templates),
        },
      ])

      template = templateChoice

      const { projectNameInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectNameInput',
          message: 'Enter a name for your project:',
          default: 'bsv-app',
          validate: (input) => input.length > 0 || 'Project name cannot be empty.',
        },
      ])

      projectName = projectNameInput

      const { authorNameInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'authorNameInput',
          message: 'Enter the author name:',
          default: '',
        },
      ])

      authorName = authorNameInput
    }
  } catch (error) {
    if (error.isTtyError) {
      console.error(chalk.red('❌ Prompt could not be rendered in this environment.'))
    } else if (error.message.includes('User force closed the prompt')) {
      console.log(chalk.yellow('\n🚪 Goodbye!'))
    } else {
      console.error(chalk.red('❌ An unexpected error occurred:'), error.message)
    }
    process.exit(0)
  }

  const projectDir = path.resolve(process.cwd(), projectName)

  if (fs.existsSync(projectDir)) {
    console.error(chalk.red(`❌ Directory "${projectName}" already exists.`))
    process.exit(1)
  }

  await cloneTemplate(templates[template], projectDir)

  const gitDir = path.join(projectDir, '.git')
  if (fs.existsSync(gitDir)) {
    fs.removeSync(gitDir)
  }

  const customizations = {}
  if (projectName) customizations.name = projectName
  if (authorName) customizations.author = authorName

  await customizePackageJson(projectDir, customizations)

  if (!options.skipInstall) {
    await installDependencies(projectDir)
  }

  if (options.gitInit) {
    console.log(chalk.blue('Initializing new git repository...'))
    try {
      const git = simpleGit(projectDir)
      await git.init()
    } catch (error) {
      console.error(chalk.red('Error initializing git repository:'), error.message)
      process.exit(1)
    }
  }

  console.log(chalk.green('✅ All done! Start coding with:'))
  console.log(chalk.cyan(`cd ${projectName}`))
  console.log(chalk.cyan('npm start'))
}

run().catch((error) => {
  import('chalk').then(({ default: chalk }) => {
    console.error(chalk.red('❌ An error occurred:'), error)
    process.exit(1)
  })
})
