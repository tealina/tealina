import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Tealina',
  description:
    '文件即路由，处理函数的类型注解即唯一事实来源：路由、客户端类型和 API 文档都由它派生。',
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
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '参考', link: '/reference/cli' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '项目结构', link: '/guide/project-structure' },
            { text: '整合到现有项目', link: '/guide/integration' },
          ],
        },
        {
          text: '约定',
          items: [
            { text: '文件即路由', link: '/guide/routing' },
            { text: '处理函数契约', link: '/guide/handler-contract' },
            {
              text: 'JavaScript 处理函数',
              link: '/guide/javascript-handlers',
            },
            { text: '鉴权', link: '/guide/authentication' },
          ],
        },
        {
          text: '产出',
          items: [
            { text: 'API 文档', link: '/guide/api-doc' },
            { text: '前端客户端', link: '/guide/frontend' },
            { text: 'AI 助手', link: '/guide/ai-agents' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '命令行',
          items: [
            { text: 'tealina CLI', link: '/reference/cli' },
            { text: 'create-tealina', link: '/reference/create-tealina' },
          ],
        },
        {
          text: '运行时与客户端',
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
          text: '文档工具',
          items: [
            { text: '@tealina/doc-types', link: '/reference/doc-types' },
            { text: '@tealina/doc-ui', link: '/reference/doc-ui' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/tealina/tealina' },
    ],
    editLink: {
      pattern: 'https://github.com/tealina/tealina/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchLabel: '浅色',
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
})
