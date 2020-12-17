import fs from 'fs'
import readline from 'readline'
import path from 'path'
import { window, Uri, workspace, ExtensionContext, services, commands, TextEdit, wait } from 'coc.nvim'
import { CancellationTokenSource, Position, Range } from 'vscode-languageserver-protocol'
import glob from 'glob'

const movedPropreties = [
  'showMessage',
  'runTerminalCommand',
  'openTerminal',
  'showQuickpick',
  'menuPick',
  'openLocalConfig',
  'showPrompt',
  'createStatusBarItem',
  'createOutputChannel',
  'showOutputChannel',
  'requestInput',
  'echoLines',
  'getCursorPosition',
  'moveTo',
  'getOffset'
]

async function validFile(filepath: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filepath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
    terminal: false
  } as any)
  return new Promise(resolve => {
    rl.on('line', line => {
      if (line.includes(`from 'coc.nvim'`) || line.includes('from "coc.nvim"')) {
        resolve(true)
        rl.close()
      }
    })
    rl.on('close', () => {
      resolve(false)
    })
    rl.on('error', () => {
      resolve(false)
    })
  })

}

export async function activate(_context: ExtensionContext): Promise<void> {
  let output = window.createOutputChannel('codemod')
  let fixCodes = async (): Promise<void> => {
    await workspace.nvim.command('edit output:///codemod')
    output.appendLine(`Note that the fix may not fix all issues, use ':CocList diagnostics' to see all remaining diagnostics.`)
    // output.show()
    workspace.nvim.command('set hidden', true)
    let files = glob.sync('**/*.ts', {
      ignore: ['node_modules/**'],
      nodir: true,
      cwd: workspace.cwd
    })
    let arr = await Promise.all(files.map(file => {
      let filepath = path.join(workspace.cwd, file)
      return validFile(filepath).then(valid => {
        return valid ? filepath : null
      })
    })) as string[]
    arr = arr.filter(o => o != null)
    let uris = arr.map(s => Uri.file(s).toString())
    for (let uri of uris) {
      await workspace.loadFile(uri)
    }
    output.appendLine(JSON.stringify(uris, null, 2))
    if (!arr.length) {
      output.appendLine('no typescript file need fix.')
      return
    }
    let service = services.getService('tsserver') as any
    if (!service) {
      output.appendLine(`tsserver service not found, please make sure coc-tsserver extension installed!.`)
      return
    }
    let host = await service.getClientHost()
    let client = host.serviceClient
    let tokenSource = new CancellationTokenSource()
    for (let file of arr) {
      output.appendLine(`Fixing file ${file}.`)
      let doc = workspace.getDocument(Uri.file(file).toString())
      if (doc) {
        let res = await client.execute('semanticDiagnosticsSync', { file: file, includeLinePosition: true }, tokenSource.token)
        if (res && res.body && res.body.length) {
          output.appendLine(`Semantic diagnostics length: ${res.body.length}`)
          let diagnostics = res.body
          let edits: TextEdit[] = []
          let addWindow = false
          for (let diagnostic of diagnostics) {
            let { message, startLocation } = diagnostic
            let line = doc.getline(startLocation.line - 1)
            let lnum = startLocation.line - 1
            let pre = byteSlice(line, 0, startLocation.offset - 1)
            // check if window needed.
            let ms = message.match(/Property '(\w+)' does not exist on type 'typeof workspace'/)
            if (ms && movedPropreties.includes(ms[1])) {
              addWindow = true
              let range = doc.getWordRangeAtPosition(Position.create(startLocation.line - 1, pre.length - 2))
              edits.push({ range, newText: 'window' })
            }
            // fix arguments of FloatFactory
            if (message.startsWith('Expected 1 arguments,') && line.includes('new FloatFactory')) {
              let newLine = line.replace(/new FloatFactory\((\w+),.+?\)/, 'new FloatFactory($1)')
              let start = 0
              for (let i = 0; i < line.length; i++) {
                if (line[i] != newLine[i]) {
                  start = i
                  break
                }
              }
              if (newLine != line) {
                edits.push({
                  range: Range.create(lnum, start, lnum, start + line.length - newLine.length),
                  newText: ''
                })
              }
            }
            // fix floatFactory.show
            if (message == `Property 'create' does not exist on type 'FloatFactory'.`) {
              let newLine = line.replace(/create\((\w+),.+?\)/, 'show($1)')
              if (newLine != line) {
                edits.push({
                  range: Range.create(lnum, 0, lnum, line.length),
                  newText: newLine
                })
              }
            }
            // fix document.applyEdits
            if (message.startsWith('Expected 1 arguments,') && line.includes('applyEdits')) {
              let character = line.indexOf('applyEdits') - 2
              if (character > 0) {
                let res = await client.execute('quickinfo', {
                  file,
                  line: lnum + 1,
                  offset: Buffer.from(line.slice(0, character), 'utf8').length
                }, tokenSource.token)
                if (res && res.body && res.body.displayString.endsWith('Document')) {
                  let newLine = line.replace(/applyEdits\(.*?,\s*/, 'applyEdits(')
                  edits.push({
                    range: Range.create(lnum, 0, lnum, line.length),
                    newText: newLine
                  })
                }
              }
            }
            // remove .logError() from Promise
            if (message.startsWith(`Property 'logError' does not exist on type 'Promise`)) {
              let newLine = line.replace(/\.logError\(\)/, '')
              if (line != newLine) {
                edits.push({
                  range: Range.create(lnum, 0, lnum, line.length),
                  newText: newLine
                })
              }
            }
            // remove await for resumeNotification(cancel: boolean, notify: true)
          }
          if (edits.length) {
            if (addWindow) {
              edits.unshift({
                range: Range.create(0, 0, 0, 0),
                newText: `import {window} from 'coc.nvim'\n`
              })
            }
            await doc.applyEdits(edits)
          }
          await wait(30)
          await commands.executeCommand('tsserver.organizeImports', doc.textDocument)
          // fix methods mvoe from workspace to window
        }
      }
      output.appendLine(`Fixed.`)
    }
  }

  commands.registerCommand('codemod.update', fixCodes)
}


function byteSlice(content: string, start: number, end?: number): string {
  let buf = Buffer.from(content, 'utf8')
  return buf.slice(start, end).toString('utf8')
}
