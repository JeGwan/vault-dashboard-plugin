import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prod = process.argv[2] === "production";

function autoDeploy() {
  return {
    name: "auto-deploy",
    setup(build) {
      build.onEnd(() => {
        const dest = join(__dirname, "..", "..", ".obsidian", "plugins", "vault-dashboard");
        if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
        for (const f of ["main.js", "manifest.json", "styles.css"]) {
          const src = join(__dirname, f);
          if (existsSync(src)) copyFileSync(src, join(dest, f));
        }
        console.log("→ Deployed to .obsidian/plugins/vault-dashboard/");
      });
    },
  };
}

const context = await esbuild.context({
  banner: { js: "/* Vault Dashboard — bundled by esbuild */" },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  define: {
    "process.env.NODE_ENV": prod ? '"production"' : '"development"',
  },
  plugins: [autoDeploy()],
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
