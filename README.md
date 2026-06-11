# Keys Cafe KCF Tools

[Keys Cafe](https://galaxystore.samsung.com/detail/com.samsung.android.keyscafe)
is a very cool Good Lock module for customizing Samsung Keyboard. It lets you
reshape keys, move things around, and make the keyboard feel much more like
yours.

This repo grew out of a very practical need: make a custom keyboard layout,
inspect what Keys Cafe exported, tweak it carefully, and re-export it. The
tricky bit is that Keys Cafe share files are not easy to edit by hand: a `.kcf`
file is encrypted text with a nested JSON model inside.

These scripts decode that model into editable JSON and pack it back up into a
file that Keys Cafe can import again. It exists because Keys Cafe makes
keyboard tinkering fun, and editable exports make that even better.

## What is here

- `bin/kcf-decode.mjs` decodes a Keys Cafe `.kcf` share file into JSON.
- `bin/kcf-encode.mjs` encodes edited JSON back into `.kcf`.
- `examples/Gboard_Dvorak.kcf` is a small example export you can try.
- `sources/`, `decoded/`, `outputs/`, and `etc/` are kept as empty working
  folders with `.gitkeep` files. Their contents are ignored on purpose.

## What is not here

The repository intentionally does not track APKs, decompiled code, local source
exports, decoded layouts, or generated output files. Those can contain private
keyboard layouts or bulky reverse-engineering material, so they stay local.

## Requirements

- Node.js 18 or newer should be plenty.
- PowerShell examples are shown below, but the scripts are plain Node.js and
  also work from other shells.

## Decode a `.kcf` file

Put your exported Keys Cafe file in `sources/`, then run:

```powershell
node bin/kcf-decode.mjs sources/input.kcf decoded/layout.json --expand-model
```

`--expand-model` turns the nested layout model into normal JSON, which is much
easier to read and edit.

If you want the nested model in its own file:

```powershell
node bin/kcf-decode.mjs sources/input.kcf decoded/layout.json --model-out decoded/model.json
```

The decoder will print `sha: ok` when the nested model matches the integrity
field stored in the file.

## Encode it again

After editing the JSON in `decoded/`, write a new share file to `outputs/`:

```powershell
node bin/kcf-encode.mjs decoded/layout.json outputs/layout.kcf
```

The encoder accepts either the original shape, where `model` is a JSON string,
or the friendlier expanded shape, where `model` is an object. By default it also
recalculates the `sha` field for you.

## Try the example

```powershell
node bin/kcf-decode.mjs examples/Gboard_Dvorak.kcf decoded/Gboard_Dvorak.json --expand-model
node bin/kcf-encode.mjs decoded/Gboard_Dvorak.json outputs/Gboard_Dvorak.kcf
```

That gives you a quick end-to-end check without using one of your own layouts.

## For agents

Agents: read `AGENTS.md` before changing files in this repository.

## License

Created with 💜 by Brawaru and Codex. Licensed under MIT. See `LICENSE`.
