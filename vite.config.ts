import { resolve } from 'node:path'
import { defineConfig } from 'vite-plus'

// 见下面 test 块的注释：这个配置文件会被仓库根和 packages/* 两处读到
const atRepoRoot = process.cwd() === __dirname
const pkg = (name: string) => resolve(__dirname, 'packages', name)

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
    // 模板目录是「给脚手架项目的数据」，不是本仓库的源码，两条理由：
    //
    // 1. 它 import 的 `@tealina/client`、`server/api/v1` 要等脚手架里 pnpm install
    //    之后才解析得到，在仓库里做类型检查必然报 TS2307 —— 而这是结构性的，不是
    //    代码有问题。
    // 2. 更要紧的是 prefer-vite-plus-imports：它会把模板里的 `from 'vite'` 改成
    //    `from 'vite-plus'`，而脚手架项目的 web/package.json 只声明了 `vite`
    //    （13e523d 就是这么把模板改坏的，`--fix` 每次都会再改一遍）。
    //
    // 排除的只是 lint 与类型检查；fmt 有自己的 ignorePatterns，模板仍会被格式化。
    ignorePatterns: [
      'temp-*/**', // linter.includes: ["!temp-*"]
      'archive/**',
      'packages/create-tealina/template/**',
    ],
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
  // 测试项目：原来散在 vitest.workspace.ts，Vitest 4 已移除 workspace 文件，
  // 统一收进根配置的 test.projects。
  //
  // 两点必须知道：
  // 1. Vitest 会从子目录向上找到这个配置文件，但 root 仍是子目录 —— 也就是说
  //    在 packages/* 里跑 `vp test` 时读到的 test 块就是下面这个。所以 projects
  //    只在仓库根生效：否则 `pnpm test`（递归 8 个包）会把整套用例跑 8 遍。
  // 2. projects 里的路径用绝对路径，理由同上：相对路径是按 vitest 的 root（=cwd）
  //    解析的，从包内跑时会拼成 packages/x/packages/y。
  test: atRepoRoot
    ? {
        projects: [
          // 指向包目录的字符串条目：用包内自带的 vite.config.ts 当项目配置，
          // doc-ui-src 的 jsdom / setupFiles / monaco alias 就在那里。
          pkg('tealina-doc-ui-src'),
          // 其余包没有配置文件可继承，用内联对象带 testTimeout 这类项目级选项
          {
            root: pkg('create-tealina'),
            // 照搬包脚本的 `--dir test`：别把 temp/ 里的 e2e 产物扫进来
            test: {
              name: 'create-tealina',
              testTimeout: 0,
              include: ['test/**/*.test.ts'],
            },
          },
          {
            root: pkg('tealina'),
            test: {
              name: 'tealina',
              testTimeout: 20000,
              // 这个包的测试用 cwd 相对路径，根目录跑时要把 cwd 拨回包目录
              env: { VITEST_PROJECT_ROOT: pkg('tealina') },
              setupFiles: [resolve(__dirname, 'test-setup.chdir.ts')],
            },
          },
          { root: pkg('tealina-client'), test: { name: 'tealina-client' } },
          { root: pkg('tealina-doc-ui'), test: { name: 'tealina-doc-ui' } },
          { root: pkg('tealina-server'), test: { name: 'tealina-server' } },
          { root: pkg('utility-types'), test: { name: 'utility-types' } },
          // tealina-doc-types 没有测试文件，只有 `tsc --noEmit`，不做 project
        ],
      }
    : {},
  // 提交钩子：接手 lefthook.yml 的 pre-commit。
  // 原来的 glob 与命令原样搬过来，vp staged 会把暂存文件路径追加到命令后面，
  // 等价于 lefthook 的 `vp check --fix {staged_files}`。
  // 机制由 `vp hooks enable` 安装的 dispatcher 提供（core.hooksPath -> .vite-hooks）。
  staged: {
    '*.{js,ts,jsx,tsx}': 'vp check --fix',
  },
})
