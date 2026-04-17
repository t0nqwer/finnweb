# 🤖 FinnWeb — AI Agent Summary

## 🧭 Product Overview

FinnWeb is a **SaaS website & landing page builder** that allows users to create, publish, and monetize websites quickly without coding.

The system focuses on:

- Speed (launch in minutes)
- Simplicity (no-code / low-code)
- Conversion (lead generation & sales)

---

## 🎯 Primary Goal

Enable users to:

1. Create a website or landing page
2. Publish it online
3. Collect leads (forms)
4. Upgrade via subscription

---

## 👥 Target Users

- Small businesses (SMEs)
- Online sellers
- Freelancers / creators
- Non-technical users
- Agencies (secondary)

---

## 🧱 Core System Modules

### 1. Auth & User System

- Register / login
- JWT authentication (access + refresh)
- Workspace (multi-site per user)
- Role-based access (future)

### 2. Site Builder (Core Product)

- Section-based page builder (JSON structure)
- Supported sections:
  - Hero
  - Text
  - Image
  - CTA button
  - Form
- Page = list of sections
- Stored as JSON

### 3. Page Rendering Engine

- Public route rendering (`/[domain]/[slug]`)
- Converts JSON → UI
- Supports SEO metadata

### 4. Publishing System

- Publish/unpublish pages
- Public URL:
  ```
  yourapp.com/sitename
  ```
- Custom domain mapping (basic)

### 5. Forms & Leads

- Form submission system
- Fields:
  - Name
  - Email
  - Phone
  - Message
- Store submissions in database
- Notification:
  - Email
  - LINE (priority for Thai users)

### 6. Billing & Subscription

- Plans:
  - FREE
  - BASIC
  - BUSINESS
  - PRO
- Stripe integration:
  - Checkout session
  - Webhook handling
- Feature gating:
  - Limit sites/pages based on plan

### 7. Dashboard (CMS)

- Manage sites
- Edit pages
- View leads
- Manage subscription

### 8. Templates (MVP Starter Content)

- Prebuilt landing pages:
  - Product
  - Service
  - Clinic
  - Restaurant

---

## 🧪 MVP Scope (STRICT)

Include only:

- Auth system
- Site + page builder (simple sections)
- Page rendering
- Publish system
- Form + lead storage
- Basic notifications
- Stripe billing
- Basic dashboard

Exclude:

- Drag-and-drop builder
- Advanced analytics
- Blog system
- E-commerce (later phase)

---

## 🧰 Tech Stack

### Frontend

- Next.js (App Router)
- TailwindCSS

### Backend

- NestJS (Fastify)

### Database

- PostgreSQL
- Prisma ORM

### Infrastructure

- Docker
- Nginx
- GitHub Actions

### Storage

- S3-compatible (DigitalOcean Spaces)

### Queue / Async (optional MVP+)

- Redis
- Worker service

---

## ⚙️ Key Data Models (Simplified)

```
User
Workspace
Site
Page
Section (JSON)
FormSubmission
Subscription
Plan
Session
```

---

## 🔁 Core User Flow

```
User registers
→ Creates workspace
→ Creates site
→ Edits page (sections)
→ Publishes site
→ Visitors access page
→ Visitors submit form
→ User receives lead
→ User upgrades plan
```

---

## 💰 Monetization Strategy

- Freemium model
- Paid plans unlock:
  - More sites
  - Custom domain
  - Advanced features

---

## ⚡ System Priorities

1. Simplicity over flexibility
2. Speed of development
3. Fast time-to-market
4. Real user value (lead generation)
5. Early monetization

---

## 🚧 Future Expansion (Not MVP)

- Drag & drop builder
- Analytics dashboard
- E-commerce
- Blog/news module
- Template marketplace

---

## 🧠 Instructions for AI Agents

When working on this project:

- Focus on MVP only
- Avoid overengineering
- Prefer simple JSON-based systems
- Break tasks into small steps
- Always define acceptance criteria
- Ensure features are production-ready
