# react-cli-quick-starter

一个面向生产实践的 **React Ink CLI 模板**，重点提供可维护的工程结构、质量门禁和完整文档架构。

[English Documentation](./README.md)

## 模板内置能力

- React Ink CLI 基础能力（`ink` + `meow`）
- TypeScript 编译体系
- 格式与 lint 质量门禁（`prettier` + `xo`）
- GitHub Actions CI 工作流（`.github/workflows/ci.yml`）
- 面向长期维护的文档架构

## 适用场景

适合以下类型项目：

- 需要终端 UI（TUI）的命令行工具
- 希望快速搭建命令式开发框架
- 希望模板自带贡献规范、测试规范、发布规范

## 前置要求

- Node.js 20+
- pnpm 8+（建议 10+）

如未安装 pnpm：

```bash
npm install -g pnpm
```

## 快速开始

```bash
pnpm install
pnpm build
node dist/cli.js --name=Jane
```

预期输出：

```text
Hello, Jane
```

## CLI 使用

### 基础调用

```bash
node dist/cli.js
```

### 带参数调用

```bash
node dist/cli.js --name=Jane
```

### 参数说明

| 参数     | 类型     | 默认值     | 说明                 |
| -------- | -------- | ---------- | -------------------- |
| `--name` | `string` | `Stranger` | 用于输出问候语的人名 |

## 开发流程

1. 安装依赖：`pnpm install`
2. 开发时监听编译：`pnpm dev`
3. 执行仓库质量检查：`pnpm test`
4. 执行文档链路验证：`pnpm test:docs && pnpm docs:check`
5. 执行编译验证：`pnpm build`
6. 运行编译产物烟测：`node dist/cli.js --name=Jane`

## 脚本说明

| 脚本                      | 用途                                    |
| ------------------------- | --------------------------------------- |
| `pnpm dev`                | TypeScript 监听编译                     |
| `pnpm build`              | 编译到 `dist/`                          |
| `pnpm docs:generate`      | 重新生成 `docs/reference/` 下的参考文档 |
| `pnpm docs:check`         | 检查生成文档是否与当前源码一致          |
| `pnpm lint`               | 运行 XO lint 检查                       |
| `pnpm format`             | 使用 Prettier 自动格式化                |
| `pnpm format:check`       | 检查格式，不改文件                      |
| `pnpm test`               | 执行格式检查 + lint 检查                |
| `pnpm test:docs`          | 执行文档流水线与 Ink 输出测试           |
| `pnpm test:docs:coverage` | 执行带覆盖率门禁的文档测试              |

## 项目结构

```text
react-cli-quick-starter/
├── source/
│   ├── app.tsx                  # Ink UI 组件
│   ├── cli-metadata.ts          # 运行时与文档共享的 CLI 合同
│   └── cli.tsx                  # CLI 入口与参数解析
├── tests/
│   ├── cli/
│   └── docs/
├── tools/
│   └── docs/                    # 文档生成与校验脚本
├── docs/
│   ├── README.md                # 文档导航入口
│   ├── project-structure.md
│   ├── development-workflow.md
│   ├── cli-design.md
│   ├── quality-gates.md
│   ├── troubleshooting.md
│   ├── reference/
│   │   ├── README.md
│   │   ├── cli.md
│   │   ├── tooling-baseline.md
│   │   └── api/
│   └── release-process.md
├── .github/
│   ├── workflows/ci.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
├── CONTRIBUTING.md
├── TESTING.md
├── CI_CD.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```

## 文档架构入口

- 文档导航： [docs/README.md](./docs/README.md)
- 项目结构： [docs/project-structure.md](./docs/project-structure.md)
- 开发流程： [docs/development-workflow.md](./docs/development-workflow.md)
- CLI 设计： [docs/cli-design.md](./docs/cli-design.md)
- 质量门禁： [docs/quality-gates.md](./docs/quality-gates.md)
- 故障排查： [docs/troubleshooting.md](./docs/troubleshooting.md)
- 参考文档： [docs/reference/README.md](./docs/reference/README.md)
- 发布流程： [docs/release-process.md](./docs/release-process.md)

## 治理文档

- 贡献规范： [CONTRIBUTING.md](./CONTRIBUTING.md)
- 测试策略： [TESTING.md](./TESTING.md)
- CI/CD 规范： [CI_CD.md](./CI_CD.md)
- 变更历史： [CHANGELOG.md](./CHANGELOG.md)

## 许可证

MIT，见 [LICENSE](./LICENSE)。
