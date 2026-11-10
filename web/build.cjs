const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const rootDir = __dirname;
const distDir = path.join(rootDir, "dist");

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function build() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const jsxSource = fs.readFileSync(path.join(rootDir, "app.jsx"), "utf8");
  const jsResult = await esbuild.transform(jsxSource, {
    loader: "jsx",
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    target: ["es2018"],
    minify: true,
    legalComments: "none"
  });
  fs.writeFileSync(path.join(distDir, "app.js"), jsResult.code, "utf8");

  const cssSource = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
  const cssResult = await esbuild.transform(cssSource, {
    loader: "css",
    minify: true
  });
  fs.writeFileSync(path.join(distDir, "styles.css"), cssResult.code, "utf8");

  copyDirSync(path.join(rootDir, "assets"), path.join(distDir, "assets"));

  let html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  html = html
    .replace(/\s*<!-- Babel Standalone.*?-->\s*/gs, "\n")
    .replace(/\s*<script[^>]*babel\.min\.js[^>]*><\/script>\s*/gi, "\n")
    .replace(/<script\s+type=["']text\/babel["']\s+src=["']app\.jsx["']><\/script>/gi, '<script src="app.js"></script>');
  fs.writeFileSync(path.join(distDir, "index.html"), html, "utf8");

  console.log("Build complete: web/dist generated successfully.");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

