#!/usr/bin/env node
import { createCipheriv, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const KEY = Buffer.from("k!e@y#s$c%a^f&e*", "utf8");
const IV = Buffer.alloc(16);

function usage() {
  console.log(`Usage:
  node kcf-encode.mjs <input.json> [output.kcf] [--keep-sha] [--no-gson-escape]

Encodes a decrypted Samsung Keys Cafe KeyboardShareData JSON file back to .kcf.

Notes:
  - If "model" is an object, it is compacted into the string format Keys Cafe expects.
  - By default, "sha" is recalculated as Android Base64.DEFAULT(SHA-512(UTF-8(model))).

Options:
  --keep-sha        Do not recalculate the sha field.
  --no-gson-escape  Do not mimic Gson's default escaping for <, >, &, =, and '.
  -h, --help        Show this help.`);
}

function parseArgs(argv) {
  const options = { input: undefined, output: undefined, keepSha: false, gsonEscape: true };

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--keep-sha") {
      options.keepSha = true;
      continue;
    }
    if (arg === "--no-gson-escape") {
      options.gsonEscape = false;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    if (!options.input) {
      options.input = arg;
    } else if (!options.output) {
      options.output = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!options.input) throw new Error("Missing input JSON file");
  options.output ??= defaultOutputPath(options.input);
  return options;
}

function defaultOutputPath(inputPath) {
  const parsed = path.parse(inputPath);
  const name = parsed.ext.toLowerCase() === ".json" ? parsed.name : `${parsed.base}.encoded`;
  return path.join(parsed.dir, `${name}.kcf`);
}

function androidBase64Default(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/(.{76})/g, "$1\n").replace(/\n?$/, "\n");
}

function checksumForModel(model) {
  return androidBase64Default(createHash("sha512").update(model, "utf8").digest());
}

function encryptToKcf(plaintext) {
  const cipher = createCipheriv("aes-128-cbc", KEY, IV);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return androidBase64Default(ciphertext);
}

function gsonHtmlSafeEscape(jsonText) {
  return jsonText.replace(/[<>&=']/g, (char) => {
    switch (char) {
      case "<":
        return "\\u003c";
      case ">":
        return "\\u003e";
      case "&":
        return "\\u0026";
      case "=":
        return "\\u003d";
      case "'":
        return "\\u0027";
      default:
        return char;
    }
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const shareData = JSON.parse(await readFile(options.input, "utf8"));

  if (shareData.model && typeof shareData.model === "object" && !Array.isArray(shareData.model)) {
    shareData.model = JSON.stringify(shareData.model);
  }
  if (typeof shareData.model !== "string") {
    throw new Error('Expected top-level field "model" to be a JSON string or object');
  }

  JSON.parse(shareData.model);

  if (!options.keepSha) {
    shareData.sha = checksumForModel(shareData.model);
  }

  const plaintext = options.gsonEscape ? gsonHtmlSafeEscape(JSON.stringify(shareData)) : JSON.stringify(shareData);
  await writeFile(options.output, encryptToKcf(plaintext), "utf8");
  console.error(`encoded: ${options.output}`);
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exit(1);
});
