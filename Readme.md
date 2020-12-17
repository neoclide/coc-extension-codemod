# coc-extension-codemod

**Important** not published yet.

Modify the code of coc.nvim extension to satisfy the API of latest coc.nvim.

**Note** that only some kind of fixes are supported and the fix may cause
conflict.

## Install

in your (neo)vim:

    :CocInstall coc-tsserver coc-extension-codemod

## Usage

Install latest coc.nvim typings and typescript as dependence of your extension:

    yarn add coc.nvim@next typescript@latest @types/node@10.12.0 -D

Note that coc.nvim 0.0.80 requires typescript >= 4.0, so your local typescript
module may need upgrade.

Open your vim in the root folder of your coc.nvim extension, after tsserver
initialiazed, run command:

    :CocCommand codemode.update

the command will try to fix all typescript files in (neo)vim.

## Supported fixes

- Use `window` module for methods that moved from `workspace` module, including:

  - showMessage
  - runTerminalCommand
  - openTerminal
  - showQuickpick
  - menuPick
  - openLocalConfig
  - showPrompt
  - createStatusBarItem
  - createOutputChannel
  - showOutputChannel
  - requestInput
  - echoLines
  - getCursorPosition
  - moveTo
  - getOffset

- Make `new FloatFactory` only takes one argument.
- Make `FloatFactory.create` to `FloatFactory.show`, you may need to manually add more
  configuration for `show()`.
- Make `document.applyEdits()` only takes edits as arguments.
- Remove `logError()` of promises.

## Other possible issues

- `nvim.resumeNotification(false, true)` method returns `void` instead of `Promise`.
- `import` modules inside coc.nvim like `import {xx} from "coc.nvim/lib/util"` would
  fail, you have to import from coc.nvim or create the interface yourself.
- Internal APIs that should be used by coc.nvim only would be unavailable, avoid
  use them.

## LICENSE

Copyright 2020 chemzqm@gmail.com

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
