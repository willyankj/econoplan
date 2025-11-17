# EconoPlan - SaaS de Organização Financeira

Este é o repositório oficial do EconoPlan, um SaaS (Software as a Service) para organização financeira.

O projeto utiliza uma arquitetura "Headless" (desacoplada), com um backend (API) independente e um frontend (SPA) que consome essa API. Todo o ambiente é gerenciado e containerizado usando Docker e Docker Compose.

## 🚀 Especificações Técnicas (Stack)

Esta é a arquitetura de tecnologia central do projeto:

* **Containerização:** Docker & Docker Compose
* **Banco de Dados:** PostgreSQL 15 (Container `db`)
* **Backend (API):**
    * Linguagem: Python 3.11
    * Framework: Django
    * API: Django REST Framework (DRF)
    * Servidor WSGI (Prod): Gunicorn
    * Container: `backend`
* **Frontend (SPA):**
    * Linguagem: JavaScript
    * Biblioteca: React
    * Toolchain (Build): Vite
    * Servidor Estático (Prod): Nginx
    * Container: `frontend`
* **Proxy Reverso:**
    * Software: Nginx
    * Propósito: Ponto de entrada único (Portas 80/443) que roteia o tráfego para o frontend ou backend.
    * Container: `proxy`

## 🏗️ Arquitetura de Ambientes

O projeto possui duas configurações de Docker Compose para gerenciar os diferentes ambientes:

### 1. Ambiente de Desenvolvimento (`docker-compose.dev.yml`)

Este é o ambiente padrão para desenvolvimento, focado em **hot-reloading**.

* **Proxy (Nginx):** Roteia o tráfego para os servidores de desenvolvimento.
* **Backend (Django Dev Server):** Roda na porta 8000 com o `manage.py runserver` para hot-reloading em todas as alterações de Python.
* **Frontend (Vite Dev Server):** Roda na porta 5173 com o servidor `vite` para hot-reloading instantâneo em todas as alterações de React/JS/CSS.
* **DB (PostgreSQL):** O mesmo container de banco de dados.

### 2. Ambiente de Produção (`docker-compose.yml`)

Este é o ambiente que simula a produção, focado em **performance e otimização**.

* **Proxy (Nginx):** Roteia o tráfego para os containers de produção.
* **Backend (Gunicorn):** Roda o Django com o servidor Gunicorn, otimizado para múltiplos *workers*.
* **Frontend (Nginx Estático):** O React é compilado (`npm run build`) e os arquivos estáticos (HTML/CSS/JS) são servidos por um container Nginx leve.
* **DB (PostgreSQL):** O mesmo container de banco de dados.

## 📂 Estrutura de Diretórios

```bash
/econoplan
│
├── .gitignore
├── docker-compose.yml         # Configuração de Produção
├── docker-compose.dev.yml     # Configuração de Desenvolvimento (sobrescreve o anterior)
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── econoplan/             # Projeto Django
│   └── manage.py
│
├── frontend/
│   ├── Dockerfile             # Dockerfile de Produção (multi-stage)
│   ├── Dockerfile.dev         # Dockerfile de Desenvolvimento
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js         # Configuração do Vite (com HMR para Docker)
│   └── src/                   # Código-fonte do React
│
└── proxy/
    ├── Dockerfile
    ├── Dockerfile.dev
    ├── nginx.conf             # Config de Nginx (Produção)
    └── nginx.dev.conf         # Config de Nginx (Desenvolvimento)
```

## 🛠️ Como Rodar o Projeto

**Pré-requisitos:**
* Git
* Docker
* Docker Compose

---

### 1. Ambiente de Desenvolvimento (Recomendado)

Este ambiente ativa o hot-reloading para backend e frontend.

**1. Clone o Repositório**
```bash
git clone [https://github.com/willyankj/econoplan.git](https://github.com/willyankj/econoplan.git)
cd econoplan
```

**2. Suba os Containers (Dev)**
Este comando usa o arquivo de produção como base e o sobrescreve com as configurações de desenvolvimento.

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

* O frontend (React) estará acessível em: `http://localhost`
* A API (Django) estará acessível em: `http://localhost/api/`
* O Admin do Django estará em: `http://localhost/admin/`

**3. Execute as Migrações Iniciais (Primeira vez)**
Em um terminal separado, execute as migrações do Django:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend python manage.py migrate
```

**4. Para Parar o Ambiente**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

---

### 2. Ambiente de Produção (Simulação)

Este ambiente compila os projetos e os roda como fariam no servidor.

**1. Suba os Containers (Prod)**
```bash
docker-compose up --build -d
```

**2. Execute as Migrações**
```bash
docker-compose exec backend python manage.py migrate
```

**3. (Obrigatório em Prod) Colete Arquivos Estáticos**
Para o Admin do Django funcionar corretamente:
```bash
docker-compose exec backend python manage.py collectstatic --no-input
```

**4. Para Parar o Ambiente**
```bash
docker-compose down
```

## ⚙️ Variáveis de Ambiente

As seguintes variáveis são usadas pelo `docker-compose.yml` para configurar os serviços:

* `POSTGRES_USER`: Usuário do banco de dados (ex: `econoplan`)
* `POSTGRES_PASSWORD`: Senha do banco de dados
* `POSTGRES_DB`: Nome do banco de dados (ex: `econoplan_db`)
* `POSTGRES_HOST`: Host do banco (usar `db` - nome do serviço)
* `DJANGO_SECRET_KEY`: Chave secreta do Django
* `DJANGO_DEBUG`: `True` ou `False`

## API

A documentação da API será implementada e estará disponível futuramente (ex: `/api/docs/`).
