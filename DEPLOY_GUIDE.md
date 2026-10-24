# Guia de Deploy: Tetr.io Adriano (Next.js + Neon DB + Vercel + GitHub)

Este guia documenta o passo a passo completo para auditar, versionar e realizar o deploy em produção da aplicação **Tetr.io Adriano**.

---

## 1. Configuração do Repositório GitHub

### 1.1. Arquivo `.gitignore`
O arquivo [`.gitignore`](file:///c:/Users/adria/Desktop/Tetrio%20Adriano/.gitignore) foi configurado para blindar dados sensíveis e credenciais do Neon:
- Ignora pastas de cache e build: `.next/`, `node_modules/`, `dist/`, `.vercel`.
- Bloqueia arquivos de variáveis de ambiente: `.env`, `.env*.local`, `.neon`.

### 1.2. Comandos para versionamento inicial:
```bash
git init
git add .
git commit -m "feat: complete tetrio adriano engine, neon postgres pooling and multiplayer"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/tetrio-adriano.git
git push -u origin main
```

---

## 2. Configuração do Neon PostgreSQL & Connection Pooling na Vercel

O Neon é um PostgreSQL Serverless que suporta **Connection Pooling via PgBouncer**. Em ambientes Serverless/Edge (como rotas de API da Vercel), o pooling é essencial para reutilizar conexões e evitar o erro `remaining connection slots are reserved for non-replication superuser connections` (estouro de conexões).

### 2.1. Variáveis de Ambiente no Painel da Vercel:
Acesse: **Vercel Dashboard > Seu Projeto > Settings > Environment Variables** e cadastre:

| Variável | Descrição | Exemplo de Formato |
| :--- | :--- | :--- |
| `DATABASE_URL` | **String com Connection Pooling** (porta 5432 / `-pooler` no host) | `postgresql://user:pass@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | String direta (sem pooler, usada para DDL/migrações seguras) | `postgresql://user:pass@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require` |

> [!NOTE]
> O client `@neondatabase/serverless` configurado em [`lib/db.ts`](file:///c:/Users/adria/Desktop/Tetrio%20Adriano/lib/db.ts) utiliza HTTP pipelining e WebSockets por padrão, garantindo que mesmo com centenas de requisições simultâneas de partidas na Vercel, a latência seja mínima e as conexões com o Neon sejam recicladas de imediato.

---

## 3. Checklist de Build e Deploy na Vercel

Antes de aprovar o deploy, o seguinte checklist foi auditado e validado:

- [x] **Zero Erros de TypeScript:** `npx tsc --noEmit` executado com código 0.
- [x] **Build de Produção do Next.js:** `npm run build` compilou com Turbopack em menos de 1 segundo (rotas dinâmicas e estáticas geradas com sucesso).
- [x] **Resíduos no Clear Line:** Corrigido algoritmo de filtragem e recriação de matriz com isolamento de referências e clones profundos.
- [x] **Soft Drop Fluido:** Timer independente de `40ms` (25 drops/s) com debounce inicial, removendo dependência do key-repeat irregular do sistema operacional.
- [x] **Validação SRS Wall Kicks:** Kicks JLSTZ e I validados conforme o padrão oficial da Tetris Guideline.
- [x] **Idempotência do Banco de Dados:** `initDatabase()` com trava singleton em memória e queries transacionais atômicas via `updatePlayerMatchProgress()`.

---

## 4. Deploy na Vercel via Interface ou CLI

### Opção A: Via Vercel Web
1. Acesse [vercel.com/new](https://vercel.com/new).
2. Selecione o repositório `tetrio-adriano`.
3. Framework Preset: **Next.js**.
4. Configure as variáveis `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
5. Clique em **Deploy**.

### Opção B: Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```
