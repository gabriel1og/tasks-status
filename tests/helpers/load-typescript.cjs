const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "../..");
const loadedModules = new Map();

/** Loads the actual TypeScript modules without writing build files; loadTypeScript("lib/task-queries.ts"). */
function loadTypeScript(relativePath) {
  const filePath = path.resolve(projectRoot, relativePath);
  if (loadedModules.has(filePath)) return loadedModules.get(filePath).exports;
  const compiled = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
    },
    fileName: filePath,
  });
  const loadedModule = new Module(filePath, module);
  loadedModules.set(filePath, loadedModule);
  loadedModule.filename = filePath;
  loadedModule.paths = Module._nodeModulePaths(path.dirname(filePath));
  loadedModule.require = (specifier) =>
    specifier.startsWith("@/")
      ? loadTypeScript(`${specifier.slice(2)}.ts`)
      : require(specifier);
  loadedModule._compile(compiled.outputText, filePath);
  return loadedModule.exports;
}

module.exports = { loadTypeScript };
