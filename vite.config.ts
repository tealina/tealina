import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    // ——— 对应 biome.json 的 formatter.* ———
    printWidth: 80, // lineWidth
    useTabs: false, // indentStyle: "space"
    tabWidth: 2, // indentWidth
    endOfLine: 'lf', // lineEnding
    singleAttributePerLine: false, // attributePosition: "auto"

    // ——— 对应 biome.json 的 javascript.formatter.* ———
    singleQuote: true, // quoteStyle: "single"
    jsxSingleQuote: false, // jsxQuoteStyle: "double" -> JS 单引号、JSX 双引号
    semi: false, // semicolons: "asNeeded"
    arrowParens: 'avoid', // arrowParentheses: "asNeeded"
    trailingComma: 'all', // trailingCommas: "all"
    bracketSpacing: true, // bracketSpacing: true
    bracketSameLine: false, // bracketSameLine: false
    quoteProps: 'as-needed', // quoteProperties: "asNeeded"

    // ——— biome.json 里没有、但不显式关掉就不等价 ———
    sortImports: false, // assist.organizeImports: "off"
    sortPackageJson: false, // Oxfmt 默认开启；Biome 从不格式化 json

    // ——— 对应 biome.json 的 files.includes + formatter.includes ———
    // dist / temp / node_modules / coverage 已在 .gitignore 里，不必重复
    ignorePatterns: [
      'archive/**', // files.includes: "!**/archive"
      '**/build/**', // "!**/build"
      '**/assets/**', // formatter.includes: "!**/assets"
      '**/static/**', // "!**/static"
      '**/src/api-*/index.ts', // 生成物
      '**/src/api-*/index.js',
      '**/*.json', // formatter.includes: "!**/*.json"
      '**/*.yaml', // formatter.includes: "!**/*.yaml"
      '**/*.yml', // biome.json 只写了 .yaml，但它根本不能格式化 yaml
      '**/*.md', // Biome 不支持 markdown，Oxfmt 支持
      '**/*.html', // Biome 不格式化 html，Oxfmt 支持
    ],
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    ignorePatterns: ['temp-*/**', 'archive/**'], // linter.includes: ["!temp-*"]
    plugins: ['react', 'jsx-a11y'], // oxlint 默认关闭这两个插件
    options: { typeAware: true, typeCheck: true },
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',

      // ——— 对应 biome.json 的 linter.rules ———
      // suspicious
      'typescript/no-explicit-any': 'warn', // noExplicitAny: "info"
      'typescript/no-invalid-void-type': 'warn', // noConfusingVoidType: "info"
      'react/no-array-index-key': 'warn', // noArrayIndexKey: "info"
      // correctness
      'react/exhaustive-deps': 'warn', // useExhaustiveDependencies: "info"
      // complexity
      'unicorn/no-array-for-each': 'warn', // noForEach: "info"
      // style —— 原本就是 off，显式关掉
      'typescript/no-non-null-assertion': 'off', // noNonNullAssertion: "off"
      // a11y —— 原本就是 off
      'jsx-a11y/click-events-have-key-events': 'off', // useKeyWithClickEvents: "off"
      'jsx-a11y/prefer-tag-over-role': 'off', // useSemanticElements: "off"
    },
  },
  // 提交钩子：接手 lefthook.yml 的 pre-commit。
  // 原来的 glob 与命令原样搬过来，vp staged 会把暂存文件路径追加到命令后面，
  // 等价于 lefthook 的 `vp check --fix {staged_files}`。
  // 机制由 `vp hooks enable` 安装的 dispatcher 提供（core.hooksPath -> .vite-hooks）。
  staged: {
    '*.{js,ts,jsx,tsx}': 'vp check --fix',
  },
})
