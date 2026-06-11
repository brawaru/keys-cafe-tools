# Keyboard Workspace Notes

This folder contains Samsung Keys Cafe exports, APK/decompiled app material, decoded layout work files, encoded output files, and helper scripts for inspecting/editing Keys Cafe share files.

## Folder Structure

- `bin/`: helper scripts. Prefer these for `.kcf` work instead of rewriting crypto logic.
- `sources/`: original source inputs. Treat as untouchable; only read from here to decode.
- `decoded/`: editable decoded layouts and working JSON files.
- `outputs/`: encoded `.kcf` outputs. Files here are safe to overwrite.
- `etc/`: reference material used to reverse engineer the format.
- `etc/keys_cafe.apk`: APK extracted from the user's phone.
- `etc/decompiled/`: JADX-decompiled APK tree.

## KCF File Format

Keys Cafe `.kcf` share files are not just raw JSON. The structure is:

```text
Base64 text
  -> AES/CBC/PKCS5Padding ciphertext
    -> UTF-8 JSON: KeyboardShareData
      -> field "model" is another JSON document stored as an escaped string
```

Crypto details recovered from the decompiled APK:

- Cipher: `AES/CBC/PKCS5Padding`
- AES key: `k!e@y#s$c%a^f&e*`
- IV: 16 zero bytes
- Outer text encoding: Android `Base64.DEFAULT`, so line wrapping is normal.

Relevant source locations in the JADX tree:

- Export filename pattern and share flow: `etc/decompiled/app/src/main/java/p221a5/C1612b.java`
- Encrypt/decrypt helper: `etc/decompiled/app/src/main/java/p164T5/AbstractC1111a.java`
- Native key provider: `etc/decompiled/app/src/main/java/com/samsung/android/keyscafe/milktea/key/KeyProvider.java`
- Native library containing the key pieces: `etc/decompiled/app/src/main/lib/arm64-v8a/libkeyscafe.so`
- Share data model: `etc/decompiled/app/src/main/java/com/samsung/android/keyscafe/latte/share/KeyboardShareData.java`

The JNI function `Java_com_samsung_android_keyscafe_milktea_key_KeyProvider_getSecretKey` appends four `.rodata` strings:

```text
k!e@
y#s$
c%a^
f&e*
```

## Decoding

Basic decode:

```powershell
node bin/kcf-decode.mjs sources/input.kcf decoded/layout.json
```

Decode with the nested `model` JSON expanded into an object for easier editing:

```powershell
node bin/kcf-decode.mjs sources/input.kcf decoded/layout.json --expand-model
```

Decode and also write the nested model to a separate file:

```powershell
node bin/kcf-decode.mjs sources/input.kcf decoded/layout.json --model-out decoded/model.json
```

Decode exactly as stored, without pretty formatting:

```powershell
node bin/kcf-decode.mjs sources/input.kcf decoded/layout.raw.json --raw
```

The decoder verifies `sha` when `model` and `sha` are present. `sha: ok` means the nested model matches the file's integrity field.

## Encoding

Encode a decoded JSON file back to `.kcf`:

```powershell
node bin/kcf-encode.mjs decoded/layout.json outputs/layout.kcf
```

The encoder accepts either:

- normal Keys Cafe shape, where top-level `model` is an escaped JSON string
- expanded shape, where top-level `model` is a JSON object

By default, the encoder recalculates `sha` as:

```text
Android Base64.DEFAULT(SHA-512(UTF-8(model)))
```

To preserve an existing `sha` instead:

```powershell
node bin/kcf-encode.mjs decoded/layout.json outputs/layout.kcf --keep-sha
```

The encoder mimics Gson's default HTML-safe JSON escaping for `<`, `>`, `&`, `=`, and `'`. This matters because the original APK uses Gson. With this behavior, the sample `Dvorako` file decodes and re-encodes byte-for-byte identically. To disable that escaping:

```powershell
node bin/kcf-encode.mjs decoded/layout.json outputs/layout.kcf --no-gson-escape
```

## Sample Findings

For the Dvorako sample layout:

- Base64-cleaned length: `60888`
- Decoded ciphertext length: `45664`
- Decrypted plaintext length: `45662`
- `keyboardName`: `Dvorako`
- `languageCode`: `en`
- `countryCode`: `US`
- `inputType`: `QWERTY_DEFAULT`
- `inputRange`: `INPUT_RANGE_TEXT`
- `viewType`: `VIEW_NORMAL`
- `deviceType`: `0`
- `applyType`: `1`
- `version`: `1`
- Nested model: one keyboard group, one `defaultKeyboard`, 5 row wrappers, 46 keys

## Agent Guidance

- Prefer the scripts in `bin/` for `.kcf` work instead of rewriting crypto logic.
- If editing layouts, decode from `sources/` into `decoded/` with `--expand-model`, edit JSON in `decoded/`, then encode to `outputs/` normally so the `model` field is compacted and `sha` is recalculated.
- Treat `sources/` and `etc/` as read-only reference material unless the user explicitly asks to update them.
- `outputs/` is intentionally disposable; generated `.kcf` files there are safe to overwrite.
- Keep unrelated scratch files outside this folder unless the user asks otherwise. In Codex projectless chats, use the thread `work/` folder for temporary analysis files.
- Do not assume Smart Switch backup files use the same format. The APK also has a separate encrypted ZIP flow using random IVs and optional PBKDF2 salt in `p095K5/C0618c.java`; that is not the `.kcf` share format.
