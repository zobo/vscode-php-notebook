# PHP Notebook

Write, run and debug PHP in notebooks inside Visual Studio Code.

PHP Notebook adds a notebook type for PHP (`.phpnb` files). Mix Markdown notes and PHP code cells, run each cell on its own, and step through it with a debugger when something doesn't behave.

## Features

- **PHP notebooks:** create a `.phpnb` file or run **PHP Notebook: New PHP Notebook** from the Command Palette.
- **Run cells:** run a cell with your local PHP. stdout and stderr appear below the cell as the script produces them, and you can interrupt a running cell.
- **Debug cells:** the **Debug Cell** button next to Run starts the cell under Xdebug and attaches the [PHP Debug](https://marketplace.visualstudio.com/items?itemName=xdebug.php-debug) extension. Breakpoints set in the cell editor work, and you can step, inspect variables and view the call stack.
- **Markdown cells:** document your experiments alongside the code.
- **New cells start with `<?php`:** empty PHP cells get the opening tag, so syntax highlighting and language tooling work as in a normal PHP file.
- **Language features:** completion, diagnostics and other editor features come from the PHP language extension you already use, such as Phpactor or Intelephense. This extension doesn't provide them.
- **Diff-friendly file format:** notebooks are stored as plain JSON text. Outputs are not saved.

## Requirements

- PHP installed and available on your `PATH`, or configured with `php-notebook.phpPath`.
- To debug cells:
  - The [PHP Debug](https://marketplace.visualstudio.com/items?itemName=xdebug.php-debug) extension.
  - [Xdebug](https://xdebug.org/docs/install) enabled in your PHP installation.

## Usage

1. Create a file ending in `.phpnb` and open it, or run **PHP Notebook: New PHP Notebook**.
2. Select the **PHP** kernel if VS Code asks for one.
3. Write PHP code in a cell, starting with `<?php`, and press **Run** (`Ctrl+Enter` / `Shift+Enter`).
4. To debug, set a breakpoint in the cell and press **Debug Cell**, or run **PHP Notebook: Debug Cell** from the Command Palette.

The cell's working directory is the folder that contains the notebook.

## Current limitations

- **Cells are isolated.** Each cell runs as its own PHP script, so variables, functions and classes defined in one cell are not available in the next.
- **Language servers analyze cells separately,** so symbols defined in other cells are not resolved.
- **Outputs are plain text** (stdout and stderr). Rich output such as HTML or tables is not supported yet.

## Extension Settings

| Setting | Default | Description |
| --- | --- | --- |
| `php-notebook.phpPath` | `php` | Path to the PHP executable used to run cells. |

## Commands

| Command | Description |
| --- | --- |
| `PHP Notebook: New PHP Notebook` | Create and open an empty PHP notebook. |
| `PHP Notebook: Debug Cell` | Run the selected cell under the debugger. |

## Feedback

Found a bug or have an idea? Please open an issue on [GitHub](https://github.com/zobo/vscode-php-notebook/issues).
