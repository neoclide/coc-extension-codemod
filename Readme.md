# coc-extension-codemod

Modify the code of coc.nvim extension to satisfy the API of latest coc.nvim.

## Install

in your (neo)vim:

    :CocInstall coc-tsserver coc-extension-codemod

## Usage

Install latest coc.nvim typings as dependence of your extension:

    yarn add coc.nvim@latest

Open your vim in the root folder of your coc.nvim extension, after plugin
initialiazed, run command:

    :CocCommand codemode.
