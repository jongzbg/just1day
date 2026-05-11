# Next.js + NestJS Reference Patterns

## 1. Authentication Flow

```
Client                          Server
  │                               │
  │  POST /auth/login             │
  │  { email, password } ────────►│
  │                               │  Validate → bcrypt.compare
  │                               │  → jwtService.sign()
  │  ◄────────────────────────── │  { access_token }
  │  { access_token }            │
  │                               │
  │  GET /users (Bearer token)   │
  │  Authorization: Bearer xxx───►│
  │                               │  JwtAuthGuard → req.user
  │  ◄────────────────────────── │  { users }
```

### NestJS Auth Setup

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
npm install -D @types/passport-jwt @types/bcrypt
```

### Next.js Auth Helper

```typescript
// lib/auth.ts
import { cookies } from 'next/headers'

export async function getSession() {
  const token = cookies().get('access_token')?.value
  if (!token) return null
  try {
    return await api<AuthResponse>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch {
    return null
  }
}
```

---

## 2. API Design Patterns

### RESTful Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users | List users |
| GET | /users/:id | Get user by ID |
| POST | /users | Create user |
| PATCH | /users/:id | Update user |
| DELETE | /users/:id | Delete user |

### NestJS Controller Example

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll()
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id)
  }
}
```

---

## 3. State Management

### Zustand (Recommended for Next.js)

```typescript
// store/useAuthStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
)

// Usage in component
'use client'
function LoginButton() {
  const { user, login } = useAuthStore()
  if (user) return <span>Hi {user.name}</span>
  return <button onClick={() => login('token', { name: 'Jong' })}>Login</button>
}
```

---

## 4. Error Handling

### NestJS Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse()
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500

    res.status(status).json({
      statusCode: status,
      message: exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error',
      timestamp: new Date().toISOString(),
    })
  }
}

// main.ts
app.useGlobalFilters(new HttpExceptionFilter())
```

### Next.js API Error Handling

```typescript
// lib/api.ts
export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(JSON.stringify(body))
  }
}

async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body)
  }
  return res.json()
}

// Usage in Server Component
async function Page() {
  try {
    const data = await api<Data>('/api/data')
    return <div>{data.content}</div>
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return <div>Not found</div>
    }
    return <div>Something went wrong</div>
  }
}
```

---

## 5. Database Design with Prisma

### Schema Best Practices

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  todos     Todo[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Todo {
  id        String   @id @default(uuid())
  title     String
  completed Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

### Service Pattern

```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
    })
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const hashed = await bcrypt.hash(data.password, 10)
    return this.prisma.user.create({
      data: { ...data, password: hashed },
    })
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }
}
```

---

## 6. Form Validation

### Zod (Next.js / React)

```typescript
// lib/validations.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Usage in form
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  })

  return (
    <form onSubmit={handleSubmit((d) => api('/auth/register', { body: d }))}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      <button>Register</button>
    </form>
  )
}
```

---

## 7. Docker Compose (Dev Setup)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: myapp
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  server:
    build: ./server
    ports:
      - '3001:3001'
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/myapp
      JWT_SECRET: dev-secret-change-in-prod
    depends_on:
      - db

  client:
    build: ./client
    ports:
      - '3000:3000'
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      - server

volumes:
  postgres_data:
```

---

## 8. CORS Configuration

```typescript
// server/src/main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  
  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  await app.listen(3001)
}
bootstrap()
```

```typescript
// client/lib/api.ts
async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',  // Send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res.json()
}
```

---

## 9. Environment Variables

### Server (.env)
```
DATABASE_URL=postgresql://dev:dev@localhost:5432/myapp
JWT_SECRET=super-secret-jwt-key
CLIENT_URL=http://localhost:3000
PORT=3001
```

### Client (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
