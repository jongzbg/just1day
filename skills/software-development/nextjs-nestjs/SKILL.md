---
name: nextjs-nestjs
description: Full-stack web development with Next.js (frontend) and NestJS (backend). Covers project setup, folder structure, patterns, API integration, authentication, state management, and deployment.
category: software-development
tags: [nextjs, nestjs, typescript, fullstack, react, api]
triggers:
  - "สร้าง full stack"
  - "สร้าง web"
  - "Next.js"
  - "NestJS"
  - "เว็บ"
  - "frontend"
  - "backend"
---

# Next.js + NestJS Full-Stack Development

## Project Structure

```
/workspace/workspace/
├── client/                    ← Next.js (Frontend)
│   ├── src/
│   │   ├── app/              ← App Router (Next.js 13+)
│   │   │   ├── (auth)/       ← Auth pages (login, register)
│   │   │   ├── (dashboard)/  ← Protected pages
│   │   │   ├── api/          ← API routes (optional)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/       ← Shared components
│   │   │   ├── ui/          ← Base components (button, input, card)
│   │   │   └── features/    ← Feature-specific components
│   │   ├── lib/              ← Utilities, API client, constants
│   │   ├── hooks/           ← Custom React hooks
│   │   ├── services/        ← API service layer
│   │   ├── types/           ← Shared TypeScript types
│   │   └── store/           ← State management (Zustand/Redux)
│   ├── public/
│   ├── .env.local
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── server/                   ← NestJS (Backend)
│   ├── src/
│   │   ├── modules/         ← Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   └── register.dto.ts
│   │   │   │   └── strategies/
│   │   │   │       └── jwt.strategy.ts
│   │   │   ├── users/
│   │   │   ├── products/
│   │   │   └── ...
│   │   ├── common/           ← Shared decorators, guards, pipes, filters
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   └── pipes/
│   │   ├── config/           ← Configuration (config.service.ts)
│   │   ├── database/         ← Database connection, migrations
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma     ← Database schema
│   ├── .env
│   ├── nest-cli.json
│   └── package.json
│
└── docker-compose.yml        ← Dev environment
```

---

## Next.js Best Practices

### App Router Patterns

```typescript
// app/(dashboard)/layout.tsx — Protected layout with auth check
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  return <>{children}</>
}
```

```typescript
// lib/api.ts — Typed API client
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new ApiError(res.status, await res.json())
  return res.json()
}

// Usage: const users = await api<User[]>('/users')
```

### Server Components + Client Components

- **Server Component** (default): async, no hooks, no state — use for data fetching
- **Client Component**: `'use client'` directive — use for interactivity

```typescript
// ✅ Server Component — fetch data directly
async function UserList() {
  const users = await api<User[]>('/users')
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  )
}

// ✅ Client Component — interactive
'use client'
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Data Fetching Pattern

```typescript
// In Server Component — parallel fetch with Promise.all
async function DashboardPage() {
  const [users, products, stats] = await Promise.all([
    api<User[]>('/users'),
    api<Product[]>('/products'),
    api<Stats>('/stats'),
  ])
  return <Dashboard users={users} products={products} stats={stats} />
}
```

---

## NestJS Best Practices

### Module Structure

```typescript
// modules/users/users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### DTO with Validation

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  name: string
}

// controller with validation
@Post()
async create(@Body(new ValidationPipe({ transform: true })) dto: CreateUserDto) {
  return this.usersService.create(dto)
}
```

### Auth with JWT

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email)
    if (!await bcrypt.compare(dto.password, user.password)) {
      throw new UnauthorizedException()
    }
    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
    }
  }
}
```

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// Usage in controller
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user
}
```

### Prisma Integration

```typescript
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }
}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async create(data: Prisma.UserCreateInput) {
    const hashed = await bcrypt.hash(data.password, 10)
    return this.prisma.user.create({
      data: { ...data, password: hashed },
    })
  }
}
```

---

## Shared Types

```typescript
// client/src/types/index.ts — สร้าง types ที่ import จาก server
export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
}
```

---

## Workflow: สร้าง Feature ใหม่

1. **Plan ก่อน** — วาง API design, database schema, component structure
2. **Backend ก่อน** — NestJS: module → controller → service → DTO → test
3. **Frontend ต่อ** — Next.js: types → API client → components → pages
4. **Integrate** — ต่อ API จริง, handle error states

### Step-by-Step Example: "Todo Feature"

**1. Server — Prisma Schema**
```prisma
model Todo {
  id        String   @id @default(uuid())
  title     String
  completed Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

**2. Server — NestJS Module**
```
src/modules/todos/
├── todos.controller.ts
├── todos.service.ts
├── todos.module.ts
├── dto/
│   ├── create-todo.dto.ts
│   └── update-todo.dto.ts
└── todos.service.spec.ts
```

**3. Client — API Service**
```typescript
// services/todo.service.ts
export const todoService = {
  list: () => api<Todo[]>('/todos'),
  create: (data: CreateTodoDto) => api<Todo>('/todos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTodoDto) => api<Todo>(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api<void>(`/todos/${id}`, { method: 'DELETE' }),
}
```

**4. Client — Component**
```typescript
// components/features/todos/todo-list.tsx
'use client'
export function TodoList() {
  const { data: todos, mutate } = useSWR<Todo[]>('/todos', api)
  const [newTodo, setNewTodo] = useState('')

  const addTodo = async () => {
    await todoService.create({ title: newTodo })
    setNewTodo('')
    mutate()
  }

  return (
    <div>
      <input value={newTodo} onChange={e => setNewTodo(e.target.value)} />
      <button onClick={addTodo}>Add</button>
      {todos?.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  )
}
```

---

## Deployment

| Layer | Option | Command |
|-------|--------|---------|
| **Next.js** | Vercel | `vercel deploy` |
| **Next.js** | Docker | `docker build -t client .` |
| **NestJS** | Railway/Render | Git push auto-deploy |
| **NestJS** | Docker | `docker build -t server .` |
| **DB** | Supabase/PlanetScale | Managed PostgreSQL |
| **Both** | Docker Compose | `docker compose up` (dev) |

---

## Key Commands

### Client (Next.js)
```bash
cd /workspace/workspace/client
npm install
npm run dev          # Development
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Jest
npx prisma generate  # Generate Prisma client
```

### Server (NestJS)
```bash
cd /workspace/workspace/server
npm install
npm run start:dev    # Development with hot reload
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Jest unit tests
npm run test:e2e     # E2E tests
npx prisma migrate dev # Run migrations
npx prisma studio     # DB GUI
```

---

## Pitfalls

- ❌ **Don't** put business logic in controllers — keep in services
- ❌ **Don't** use `any` — always type DTOs and responses
- ❌ **Don't** expose database models directly to client — use DTOs
- ❌ **Don't** mix Server/Client components unnecessarily
- ✅ **Always** validate input with class-validator (NestJS) / Zod (Next.js)
- ✅ **Always** handle loading and error states in UI
- ✅ **Always** use environment variables for secrets
- ✅ **Always** write tests for services (not controllers)
