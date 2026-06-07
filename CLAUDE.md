# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 常用命令

```bash
# 后端（Spring Boot，端口 8080）—— 必须从 .env 读取 DB_PASSWORD
# 启动前先 source .env 或在命令中内联
cd backend && DB_PASSWORD=$(grep DB_PASSWORD ../.env | cut -d= -f2) mvn spring-boot:run

# 若遇到 ClassNotFoundException，先 clean 再启动
cd backend && mvn clean compile -q && DB_PASSWORD=$(grep DB_PASSWORD ../.env | cut -d= -f2) mvn spring-boot:run -q

# 前端（Vite + React，端口 5173）
cd frontend && npm run dev

# Docker 完整栈部署
docker-compose up -d
```

## 数据库连接

- **密码存放**：项目根目录 `.env` 文件中 `DB_PASSWORD=xxx`，不要硬编码到任何会进 git 的文件
- **后端配置**：`application.yml` 中为 `${DB_PASSWORD:}`，**必须通过环境变量传入**，否则 `Access denied for user 'root'@'localhost'`
- **MySQL 端口**：3306（本地直连），3307（Docker 映射）
- **数据库名**：`study_clock_in`
- **用户名**：`root`
- **连接命令**：`mysql -u root -p$(grep DB_PASSWORD .env | cut -d= -f2) -h localhost -P 3306 study_clock_in`
- **表名**：`check_in_records`（复数）、`task_instances`、`tasks`、`goals`、`users` 等

暂无测试。`mvn test` 和 `npm test` 在编写测试后将运行默认配置。项目使用 `ddl-auto: update`，Hibernate 自动管理表结构，无迁移脚本。

## 架构

```
User ─→ Goal ─←→─ Task（可复用的任务定义）
                    │
               TaskInstance（每日实例：TODO → IN_PROGRESS → COMPLETED）
                    │
               CheckInRecord（每次暂停/继续创建一条新记录，同一实例可有多条）
                    │
               CheckInImage（每条打卡记录可上传多张图片）
```

**核心设计决策：**

- **Task 与 TaskInstance 分离**：Task 是可复用的模板，TaskInstance 是每日实例化——每个任务每天最多一个实例。删除实例只影响当天，删除 Task 则移除整个定义。
- **CheckInRecord 与 TaskInstance 一对多**：一个 TaskInstance 可以有多个 CheckInRecord。暂停时通过 `start` 创建新记录，继续时累加历史时长。`endCheckIn` 的 `complete` 标志控制实例状态：`complete=true` 置为 COMPLETED，`complete=false`（暂停）保持 IN_PROGRESS。
- **FileStorageService 接口抽象**（策略模式）：当前只有 `LocalFileStorageService` 实现。扩展云存储只需实现该接口，通过 `file.storage.type` 配置切换。

### 后端约定

- 所有 Controller 返回 `ApiResponse<T>`（统一包装为 `{ code, message, data }`）。
- `GlobalExceptionHandler` 统一异常处理：`EntityNotFoundException` → 404，`IllegalArgumentException` → 400，校验异常 → 400 并附带字段级错误信息。
- `userId` 在所有 Controller 中硬编码为 `1L`——暂无认证系统。User 表和实体已预留，仅 `DataInitializer` 使用。
- 所有 Entity 继承 `BaseEntity`（id、createdAt、updatedAt）。JPA `ddl-auto: update` 管理建表。
- DTO 使用内部静态类作为请求对象（如 `CheckInDTO.StartRequest`）。

### 数据库操作红线

- **任何不可逆操作（UPDATE、DELETE、DROP、ALTER 等）必须先在终端展示影响范围，等用户确认后才能执行。**
- 只能直接执行完全可还原的操作。不确定是否可逆的，先问。
- 排查数据问题用 SELECT 展示，不要直接用 UPDATE/DELETE 修复。

### 前端约定

- `api/client.ts` 响应拦截器解包 `ApiResponse`：校验 `code === 200`，返回 `res.data`。所有 API 函数直接拿到解包后的数据。
- 打卡页（`CheckInPage.tsx`）是最复杂的组件。核心状态：`activeInstanceId`、`activeRecordId`、`elapsed`（当前 session 秒数）、`accumulatedElapsed`（历史记录秒数之和）。`timerDisplay = accumulatedElapsed + elapsed`。
- `end` 和 `manual` API 使用 multipart 格式：JSON `request` 部分 + 可选 `images` 文件部分。
- Ant Design 主题配置在 `ThemeProvider.tsx` 中，通过 `ConfigProvider` + 中文 locale。
- 除 `/` 外的所有路由均包裹在 `AppLayout` 中（侧边栏导航）。
