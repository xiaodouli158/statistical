import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const wranglerBin = resolve(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
const wranglerShim = resolve(rootDir, "scripts", "wrangler-ipv4.cjs");
const workerConfigPath = resolve(rootDir, "apps", "worker", "wrangler.jsonc");
const pagesConfigPath = resolve(rootDir, "apps", "web", "wrangler.jsonc");

function printHelp() {
  console.log(`Usage:
  npm run cf:deploy
  npm run cf:worker:deploy
  npm run cf:worker:deploy:dry-run
  npm run cf:pages:deploy -- --api-base-url https://<worker>.workers.dev
  npm run cf:pages:create

Commands:
  deploy        Deploy Worker, rebuild web with the deployed API URL, then deploy Pages
  worker        Deploy Worker only
  pages         Deploy Pages only
  pages:create  Create the Cloudflare Pages project

Options:
  --dry-run                     Only supported with the worker command
  --api-base-url <url>          Override the API base URL used for the web build
  --branch <name>               Pages branch metadata. Defaults to main
  --project-name <name>         Override the Pages project name
  --worker-name <name>          Override the Worker name
`);
}

function stripJsonComments(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function readJsonc(path) {
  return JSON.parse(stripJsonComments(readFileSync(path, "utf8")));
}

function parseArgs(argv) {
  const options = {
    command: "deploy",
    dryRun: false,
    apiBaseUrl: process.env.VITE_API_BASE_URL ?? "",
    branch: "main",
    projectName: "",
    workerName: "",
  };

  const args = [...argv];
  if (args.length > 0 && !args[0].startsWith("--")) {
    options.command = args.shift();
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.command = "help";
      continue;
    }

    const next = args[i + 1];
    if (!next) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--api-base-url") {
      options.apiBaseUrl = next;
      i += 1;
      continue;
    }

    if (arg === "--branch") {
      options.branch = next;
      i += 1;
      continue;
    }

    if (arg === "--project-name") {
      options.projectName = next;
      i += 1;
      continue;
    }

    if (arg === "--worker-name") {
      options.workerName = next;
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function logStep(message) {
  console.log(`\n==> ${message}`);
}

function buildNodeOptions(extraOption) {
  const values = (process.env.NODE_OPTIONS ?? "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!values.includes(extraOption)) {
    values.push(extraOption);
  }

  return values.join(" ");
}

function run(command, args, { env = process.env, capture = false, echo = capture } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env,
      stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";

    if (capture) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        if (echo) {
          process.stdout.write(chunk);
        }
      });

      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (echo) {
          process.stderr.write(chunk);
        }
      });
    }

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function runNpm(args, env = {}) {
  const mergedEnv = {
    ...process.env,
    ...env,
  };

  if (process.platform === "win32") {
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm.cmd", ...args], {
      env: mergedEnv,
    });
  }

  return run("npm", args, { env: mergedEnv });
}

function runWrangler(args, { capture = false } = {}) {
  return run(
    process.execPath,
    ["-r", wranglerShim, wranglerBin, ...args],
    {
      capture,
      env: {
        ...process.env,
        NODE_OPTIONS: buildNodeOptions("--dns-result-order=ipv4first"),
      },
    },
  );
}

async function getGitValue(args) {
  try {
    const { stdout } = await run("git", args, { capture: true, echo: false });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function getGitMetadata(branchOverride) {
  const currentBranch = await getGitValue(["rev-parse", "--abbrev-ref", "HEAD"]);
  const commitHash = await getGitValue(["rev-parse", "HEAD"]);
  const commitMessage = await getGitValue(["log", "-1", "--pretty=%s"]);
  const dirty = (await getGitValue(["status", "--porcelain"])) !== "";

  return {
    branch: branchOverride || currentBranch || "main",
    commitHash,
    commitMessage,
    dirty,
  };
}

function extractWorkerUrl(output) {
  const matches = output.match(/https:\/\/[^\s]+\.workers\.dev\b/g);
  return matches?.at(-1) ?? null;
}

async function buildWorkerArtifacts() {
  logStep("Building shared and parser packages");
  await runNpm(["run", "build", "-w", "@statisticalsystem/shared"]);
  await runNpm(["run", "build", "-w", "@statisticalsystem/parser"]);

  logStep("Type-checking worker");
  await runNpm(["run", "build", "-w", "@statisticalsystem/worker"]);
}

async function buildWeb(apiBaseUrl) {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is required for the web build.");
  }

  logStep(`Building web with API base URL: ${apiBaseUrl}`);
  await runNpm(["run", "build", "-w", "@statisticalsystem/web"], {
    VITE_API_BASE_URL: apiBaseUrl,
  });
}

async function deployWorker(workerConfig, workerName, dryRun) {
  logStep(dryRun ? "Dry-running Worker deploy" : `Deploying Worker: ${workerName}`);

  const args = ["deploy", "--config", workerConfigPath];
  if (workerName && workerName !== workerConfig.name) {
    args.push("--name", workerName);
  }
  if (dryRun) {
    args.push("--dry-run");
  }

  const { stdout } = await runWrangler(args, { capture: true });
  if (dryRun) {
    return "";
  }

  const workerUrl = extractWorkerUrl(stdout);
  if (!workerUrl) {
    throw new Error("Worker deployed successfully, but no workers.dev URL was found in the output.");
  }

  return workerUrl;
}

async function deployPages(pagesConfig, projectName, branch, apiBaseUrl) {
  await buildWeb(apiBaseUrl);

  const git = await getGitMetadata(branch);
  const outputDir = resolve(dirname(pagesConfigPath), pagesConfig.pages_build_output_dir ?? "./dist");

  logStep(`Deploying Pages: ${projectName}`);
  const args = [
    "pages",
    "deploy",
    outputDir,
    "--project-name",
    projectName,
    "--branch",
    git.branch,
    "--commit-dirty",
    String(git.dirty),
    "--skip-caching",
  ];

  if (git.commitHash) {
    args.push("--commit-hash", git.commitHash);
  }

  if (git.commitMessage) {
    args.push("--commit-message", git.commitMessage);
  }

  await runWrangler(args);
}

async function createPagesProject(projectName) {
  logStep(`Creating Pages project: ${projectName}`);
  await runWrangler(["pages", "project", "create", projectName]);
}

async function main() {
  if (!existsSync(wranglerBin)) {
    throw new Error("Wrangler was not found. Run `npm install` first.");
  }

  const options = parseArgs(process.argv.slice(2));
  if (options.command === "help") {
    printHelp();
    return;
  }

  const workerConfig = readJsonc(workerConfigPath);
  const pagesConfig = readJsonc(pagesConfigPath);
  const workerName = options.workerName || workerConfig.name;
  const projectName = options.projectName || pagesConfig.name;

  switch (options.command) {
    case "deploy": {
      if (options.dryRun) {
        throw new Error("`--dry-run` is only supported with the worker command.");
      }

      await buildWorkerArtifacts();
      const workerUrl = await deployWorker(workerConfig, workerName, false);
      await deployPages(pagesConfig, projectName, options.branch, workerUrl);
      console.log(`\nDone. Worker: ${workerUrl}`);
      console.log(`Pages project: https://${projectName}.pages.dev`);
      return;
    }

    case "worker": {
      await buildWorkerArtifacts();
      const workerUrl = await deployWorker(workerConfig, workerName, options.dryRun);
      if (!options.dryRun) {
        console.log(`\nDone. Worker: ${workerUrl}`);
      }
      return;
    }

    case "pages": {
      const apiBaseUrl = options.apiBaseUrl || process.env.VITE_API_BASE_URL || "";
      if (!apiBaseUrl) {
        throw new Error("Pages deploy requires `--api-base-url` or VITE_API_BASE_URL. You can also run `npm run cf:deploy`.");
      }

      await deployPages(pagesConfig, projectName, options.branch, apiBaseUrl);
      console.log(`\nDone. Pages project: https://${projectName}.pages.dev`);
      return;
    }

    case "pages:create": {
      if (options.dryRun) {
        throw new Error("`--dry-run` is not supported for pages:create.");
      }

      await createPagesProject(projectName);
      return;
    }

    default:
      throw new Error(`Unknown command: ${options.command}`);
  }
}

main().catch((error) => {
  console.error(`\nDeployment failed: ${error.message}`);
  process.exit(1);
});
