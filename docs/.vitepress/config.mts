import { defineConfig } from 'vitepress'

const repository = 'https://github.com/tealina/tealina'

const socialLinks = [{ icon: 'github', link: repository }]

const englishNav = [
  { text: 'Guide', link: '/guide/getting-started' },
  { text: 'Reference', link: '/reference/cli' },
  { text: 'v1 Docs', link: 'https://v1.tealina.dev' },
]

const englishSidebar = {
  '/guide/': [
    {
      text: 'Getting Started',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Project Structure', link: '/guide/project-structure' },
        {
          text: 'Integrating into an Existing Project',
          link: '/guide/integration',
        },
      ],
    },
    {
      text: 'Conventions',
      items: [
        { text: 'File-based Routing', link: '/guide/routing' },
        { text: 'Handler Contract', link: '/guide/handler-contract' },
        {
          text: 'JavaScript Handlers',
          link: '/guide/javascript-handlers',
        },
        { text: 'Authentication', link: '/guide/authentication' },
      ],
    },
    {
      text: 'Outputs',
      items: [
        { text: 'API Documentation', link: '/guide/api-doc' },
        { text: 'Frontend Client', link: '/guide/frontend' },
        { text: 'AI Assistants', link: '/guide/ai-agents' },
      ],
    },
  ],
  '/reference/': [
    {
      text: 'Command Line',
      items: [
        { text: 'tealina CLI', link: '/reference/cli' },
        { text: 'create-tealina', link: '/reference/create-tealina' },
      ],
    },
    {
      text: 'Runtime and Client',
      items: [
        { text: '@tealina/server', link: '/reference/server' },
        { text: '@tealina/client', link: '/reference/client' },
        {
          text: '@tealina/utility-types',
          link: '/reference/utility-types',
        },
      ],
    },
    {
      text: 'Documentation Tools',
      items: [
        { text: '@tealina/doc-types', link: '/reference/doc-types' },
        { text: '@tealina/doc-ui', link: '/reference/doc-ui' },
      ],
    },
  ],
}

const chineseNav = [
  { text: '指南', link: '/zh/guide/getting-started' },
  { text: '参考', link: '/zh/reference/cli' },
  { text: '旧版文档', link: 'https://v1-cn.tealina.dev' },
]

const chineseSidebar = {
  '/zh/guide/': [
    {
      text: '开始',
      items: [
        { text: '快速开始', link: '/zh/guide/getting-started' },
        { text: '项目结构', link: '/zh/guide/project-structure' },
        { text: '整合到现有项目', link: '/zh/guide/integration' },
      ],
    },
    {
      text: '约定',
      items: [
        { text: '文件即路由', link: '/zh/guide/routing' },
        { text: '处理函数契约', link: '/zh/guide/handler-contract' },
        {
          text: 'JavaScript 处理函数',
          link: '/zh/guide/javascript-handlers',
        },
        { text: '鉴权', link: '/zh/guide/authentication' },
      ],
    },
    {
      text: '产出',
      items: [
        { text: 'API 文档', link: '/zh/guide/api-doc' },
        { text: '前端客户端', link: '/zh/guide/frontend' },
        { text: 'AI 助手', link: '/zh/guide/ai-agents' },
      ],
    },
  ],
  '/zh/reference/': [
    {
      text: '命令行',
      items: [
        { text: 'tealina CLI', link: '/zh/reference/cli' },
        { text: 'create-tealina', link: '/zh/reference/create-tealina' },
      ],
    },
    {
      text: '运行时与客户端',
      items: [
        { text: '@tealina/server', link: '/zh/reference/server' },
        { text: '@tealina/client', link: '/zh/reference/client' },
        {
          text: '@tealina/utility-types',
          link: '/zh/reference/utility-types',
        },
      ],
    },
    {
      text: '文档工具',
      items: [
        { text: '@tealina/doc-types', link: '/zh/reference/doc-types' },
        { text: '@tealina/doc-ui', link: '/zh/reference/doc-ui' },
      ],
    },
  ],
}

export default defineConfig({
  lang: 'en-US',
  title: 'Tealina',
  description:
    'File-based routing, with the handler type annotation as the single source of truth: routes, client types and API documentation are all derived from it.',
  base: '/',
  head: [['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }]],
  cleanUrls: true,
  lastUpdated: true,
  // The maintainer documents stay in this directory but are not part of the site.
  srcExclude: ['architecture.md', 'architecture-notes.md', 'history.md'],
  vite: {
    // VitePress brings its own Vite. Loading the repository root config would pull in
    // Vite+ and its lint rules.
    configFile: false,
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      link: '/',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      description:
        '文件即路由，处理函数的类型注解即唯一事实来源：路由、客户端类型和 API 文档都由它派生。',
      themeConfig: {
        nav: chineseNav,
        sidebar: chineseSidebar,
        socialLinks,
        editLink: {
          pattern: `${repository}/edit/main/docs/:path`,
          text: '在 GitHub 上编辑此页',
        },
        outline: { level: [2, 3], label: '本页目录' },
        docFooter: { prev: '上一页', next: '下一页' },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchLabel: '浅色',
        langMenuLabel: '切换语言',
        lastUpdated: { text: '最后更新于' },
        search: {
          provider: 'local',
          options: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '清除查询',
                backButtonTitle: '返回',
                noResultsText: '没有结果',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
  },
  themeConfig: {
    nav: englishNav,
    sidebar: englishSidebar,
    socialLinks,
    editLink: {
      pattern: `${repository}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous page', next: 'Next page' },
    returnToTopLabel: 'Return to top',
    sidebarMenuLabel: 'Menu',
    darkModeSwitchLabel: 'Appearance',
    lightModeSwitchLabel: 'Light',
    langMenuLabel: 'Change language',
    lastUpdated: { text: 'Last updated' },
    search: { provider: 'local' },
  },
})
