#!/usr/bin/env node
import { createDecipheriv, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const KEY = Buffer.from("k!e@y#s$c%a^f&e*", "utf8");
const IV = Buffer.alloc(16);

function usage() {
  console.log(`Usage:
  node kcf-decode.mjs <input.kcf> [output.json] [--model-out model.json] [--expand-model] [--raw]

Decodes a Samsung Keys Cafe .kcf share file.

Options:
  --model-out <path>  Also write the nested KeyboardShareData.model JSON.
  --expand-model      Write model as a nested object in output.json for easier editing.
  --raw               Write the decrypted JSON exactly as stored, without pretty formatting.
  -h, --help          Show this help.`);
}

function parseArgs(argv) {
  const options = { input: undefined, output: undefined, modelOut: undefined, expandModel: false, raw: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--raw") {
      options.raw = true;
      continue;
    }
    if (arg === "--expand-model") {
      options.expandModel = true;
      continue;
    }
    if (arg === "--model-out") {
      const value = argv[++i];
      if (!value) throw new Error("--model-out needs a file path");
      options.modelOut = value;
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

  if (!options.input) throw new Error("Missing input .kcf file");
  if (options.raw && options.expandModel) throw new Error("--raw and --expand-model cannot be used together");
  options.output ??= defaultOutputPath(options.input);
  return options;
}

function defaultOutputPath(inputPath) {
  const parsed = path.parse(inputPath);
  const ext = parsed.ext.toLowerCase() === ".kcf" ? ".json" : `${parsed.ext}.json`;
  return path.join(parsed.dir, `${parsed.name}${ext}`);
}

function decryptKcf(bytes) {
  const cleanBase64 = bytes.toString("utf8").replace(/\s+/g, "");
  const ciphertext = Buffer.from(cleanBase64, "base64");
  const decipher = createDecipheriv("aes-128-cbc", KEY, IV);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function androidBase64Default(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/(.{76})/g, "$1\n").replace(/\n?$/, "\n");
}

function checksumForModel(model) {
  return androidBase64Default(createHash("sha512").update(model, "utf8").digest());
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const decrypted = decryptKcf(await readFile(options.input));
  const rawText = decrypted.toString("utf8");
  const shareData = JSON.parse(rawText);

  if (typeof shareData.model === "string" && typeof shareData.sha === "string") {
    const expected = checksumForModel(shareData.model).replace(/\s+/g, "");
    const actual = shareData.sha.replace(/\s+/g, "");
    console.error(actual === expected ? "sha: ok" : "sha: mismatch");
  } else {
    console.error("sha: skipped (missing model or sha field)");
  }

  if (options.expandModel) {
    if (typeof shareData.model !== "string") {
      throw new Error("Cannot use --expand-model because model is not a string");
    }
    shareData.model = JSON.parse(shareData.model);
  }

  const outputText = options.raw ? rawText : `${JSON.stringify(shareData, null, 2)}\n`;
  await writeFile(options.output, outputText, "utf8");
  console.error(`decoded: ${options.output}`);

  if (options.modelOut) {
    if (typeof shareData.model !== "string") {
      throw new Error("Cannot write --model-out because model is not a string");
    }
    const model = JSON.parse(shareData.model);
    await writeFile(options.modelOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
    console.error(`model: ${options.modelOut}`);
  }
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exit(1);
});
