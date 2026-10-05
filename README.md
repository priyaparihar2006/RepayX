# RepayX

### AI-Powered Loan Follow-Up & Recovery Dashboard

> Phase 1 status: the existing frontend runs with mock data. Backend, ML, and retrieval directories are scaffolding only. Architecture and feature descriptions below include planned capabilities.

RepayX is an intelligent **loan follow-up and recovery management platform** designed to help lending and financial organizations efficiently monitor loan accounts, identify upcoming and overdue payments, prioritize follow-ups, and interact with loan records using an AI-powered Retrieval-Augmented Generation (RAG) system.

The platform combines **structured loan data, analytics, automated follow-up workflows, and natural-language querying** into a centralized dashboard for collection and recovery teams.

---

## 🚀 Overview

Managing large volumes of loan accounts manually can make it difficult for collection teams to identify:

* Which loans are due soon
* Which accounts are overdue
* How many days a payment is past due
* Which accounts require follow-up
* Historical payment and repayment information
* Portfolio-level payment statistics
* Relevant information from large loan datasets

RepayX addresses these challenges through a unified dashboard that allows users to monitor loan portfolios and retrieve relevant information using natural language.

### Core Concept

```text
Loan / Payment Data
        ↓
Data Processing & Validation
        ↓
Database / Structured Storage
        ↓
Analytics & Aggregation
        ↓
RAG Knowledge Layer
        ↓
AI Query Interface
        ↓
RepayX Dashboard
```

---

# ✨ Key Features

## 1. 📊 Loan Portfolio Dashboard

RepayX provides a centralized overview of the loan portfolio.

Users can monitor important metrics such as:

* Total Loans
* Active Loans
* Paid Loans
* Overdue Loans
* Due Soon Accounts
* Total Loan Amount
* Total Amount Paid
* Outstanding Amount
* Recovery-related metrics
* Payment status distribution

The dashboard provides a quick understanding of the overall loan portfolio.

---

## 2. 📅 Due Date & Payment Tracking

RepayX tracks important payment information including:

* Loan ID
* Borrower information
* Loan amount
* Due date
* Payment date
* Payment status
* Outstanding amount
* Days Past Due (DPD)

This helps users identify accounts that may require attention.

---

## 3. ⚠️ Overdue Loan Monitoring

The system identifies loans where payments have passed their expected due date.

Accounts can be categorized based on their payment status, such as:

```text
Upcoming
Due Today
Overdue
Paid
Partially Paid
```

The system can also use **Days Past Due (DPD)** to provide a clearer understanding of payment timelines.

---

## 4. 🔎 Loan Search & Filtering

Users can search and filter loan records based on relevant attributes.

Examples include:

* Loan ID
* Customer name
* Loan status
* Payment status
* Due date
* Date range
* Outstanding amount
* DPD
* Loan amount

This makes it easier for collection teams to locate specific accounts.

---

# 🤖 AI-Powered RAG Assistant

One of the primary features of RepayX is its **Retrieval-Augmented Generation (RAG)** based AI assistant.

The assistant allows users to ask questions about available loan records using natural language.

### Example Questions

```text
How many loans are currently overdue?

What is the total outstanding amount?

Show me loans that were due in September 2026.

How many payments were completed last month?

What is the average loan amount?

Show the payment records for loan ID LN10234.
```

Instead of requiring users to manually search through large datasets, the AI assistant retrieves relevant information and generates an understandable response.

---

# 🧠 RAG Architecture

RepayX uses a RAG-based architecture to connect the AI assistant with the application's loan data.

```text
                    User Query
                        │
                        ▼
              ┌──────────────────┐
              │   AI Assistant   │
              └────────┬─────────┘
                       │
                       ▼
              Query Understanding
                       │
                       ▼
             ┌────────────────────┐
             │ Retrieval / Search │
             └─────────┬──────────┘
                       │
              ┌────────┴─────────┐
              ▼                  ▼
       Structured Data      Knowledge Data
        SQL / Pandas        Vector Store
              │                  │
              └────────┬─────────┘
                       ▼
                Relevant Context
                       │
                       ▼
                LLM Generation
                       │
                       ▼
                 AI Response
```

### Important Design Principle

RepayX separates **structured numerical analysis** from **semantic retrieval**.

For example:

| Query Type                            | Processing         |
| ------------------------------------- | ------------------ |
| Number of overdue loans               | SQL / Pandas       |
| Average loan amount                   | SQL / Pandas       |
| Total outstanding amount              | SQL / Pandas       |
| Specific loan record                  | Database retrieval |
| Information from documents            | Vector search      |
| Natural-language contextual questions | RAG                |

This prevents the system from relying on vector search for calculations that should be performed directly on structured data.

---

# 📈 Analytics

RepayX can calculate portfolio-level statistics directly from structured loan data.

Examples include:

### Loan Statistics

* Total number of loans
* Average loan amount
* Minimum loan amount
* Maximum loan amount
* Total disbursed amount

### Payment Statistics

* Total payments
* Paid payments
* Pending payments
* Overdue payments
* Average payment amount

### Date-Based Analytics

* Loans due today
* Loans due this week
* Loans overdue this month
* Monthly payment trends
* Historical payment summaries

---

# 🗂️ Loan Data Structure

A typical loan record may contain fields such as:

```text
Loan ID
Customer ID
Customer Name
Loan Amount
Outstanding Amount
Due Date
Payment Date
Payment Amount
Payment Status
Loan Status
Days Past Due
Loan Type
Interest Rate
Loan Tenure
```

The exact schema can be extended according to the organization's requirements.

---

# 🔐 Data & Security

Because RepayX deals with financial information, the application should follow secure data-handling practices.

Recommended controls include:

* Authentication
* Role-based access control
* Secure API endpoints
* Input validation
* Environment variables for secrets
* Database access controls
* API rate limiting
* Secure session/token management
* Sensitive information protection
* Audit logging

### Environment Variables

Sensitive configuration should never be committed directly to Git.

Example:

```env
DATABASE_URL=
OPENAI_API_KEY=
VECTOR_DB_URL=
JWT_SECRET=
```

A `.env.example` file should be maintained for development.

---

# 🏗️ Project Architecture

A high-level architecture of RepayX:

```text
                    ┌─────────────────┐
                    │   RepayX UI     │
                    │    Dashboard    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Backend API   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         Loan Service    Analytics      AI Service
              │              │              │
              ▼              ▼              ▼
          Database       SQL/Pandas     RAG Pipeline
                                             │
                                    ┌────────┴────────┐
                                    ▼                 ▼
                              Vector Store           LLM
```

---

# 🔄 Data Flow

### Step 1 — Data Ingestion

Loan and payment records are imported into the system.

```text
CSV / Database / API
        ↓
Data Ingestion
```

### Step 2 — Data Processing

The system validates and processes the incoming records.

```text
Raw Data
   ↓
Validation
   ↓
Cleaning
   ↓
Transformation
```

### Step 3 — Structured Storage

Processed records are stored in the application's database.

### Step 4 — RAG Indexing

Relevant textual information can be transformed into embeddings and stored in a vector database.

```text
Documents
   ↓
Chunking
   ↓
Embeddings
   ↓
Vector Database
```

### Step 5 — User Query

The user asks a question through the RepayX AI assistant.

### Step 6 — Retrieval & Processing

The system determines whether the question requires:

* Database querying
* Aggregation
* Retrieval
* Semantic search
* RAG

### Step 7 — Response

The system returns a natural-language response to the user.

---

# 🖥️ Dashboard Modules

RepayX can be organized into the following modules:

### Dashboard

Provides the overall portfolio summary.

### Loans

Displays detailed loan records.

### Payments

Displays payment history and payment statuses.

### Overdue

Displays overdue accounts and DPD information.

### Analytics

Provides charts, trends, and portfolio-level statistics.

### AI Assistant

Allows users to ask natural-language questions about the loan data.

### Follow-Ups

Provides a workspace for managing accounts requiring follow-up.

---

# 🎯 Target Users

RepayX is designed for organizations and teams involved in loan servicing and recovery operations.

Potential users include:

* Collection teams
* Loan servicing teams
* Recovery teams
* Operations teams
* Financial analysts
* Loan administrators
* Managers
* Supervisors

---

# 💡 Example Use Cases

## Use Case 1 — Overdue Loans

A collection manager wants to identify overdue accounts.

```text
User:
"Show me all overdue loans."

RepayX:
Retrieves the relevant records and displays
overdue accounts with their DPD and outstanding amounts.
```

---

## Use Case 2 — Portfolio Summary

```text
User:
"What is the total outstanding amount?"

RepayX:
Calculates the value directly from structured loan data
and returns the aggregated result.
```

---

## Use Case 3 — Historical Analysis

```text
User:
"How many payments were completed last month?"

RepayX:
Filters payment records based on the requested date range
and calculates the total.
```

---

## Use Case 4 — Specific Loan

```text
User:
"Show me the details of loan LN10234."

RepayX:
Retrieves the corresponding loan record and presents
its relevant details.
```

---

# 🧪 Data Validation

The application should validate incoming loan and payment records before storing them.

Examples:

* Required fields must be present
* Loan IDs should be unique
* Dates should follow valid formats
* Amounts should be numeric
* Payment amounts should not contain invalid values
* DPD should be a valid numeric value
* Status values should follow predefined categories

Example:

```text
Loan Amount
      ↓
Numeric Validation
      ↓
Positive Value
      ↓
Accepted
```

---

# 📊 Reporting

RepayX can provide reporting for:

* Loan portfolio
* Payment history
* Outstanding amounts
* Overdue accounts
* DPD distribution
* Monthly payment trends
* Loan status distribution
* Recovery operations

Charts and tables can be used to make the information easier to understand.

---

# 🛠️ Technology Stack

The exact technologies may evolve with the project, but the platform can be structured around:

### Frontend

* React
* Vite
* JavaScript
* Tailwind CSS / CSS
* Reusable UI components
* Charts & data visualization

### Backend

* Python / Node.js
* REST APIs
* Authentication
* Data processing services

### Data

* PostgreSQL / SQL database
* Pandas for analytical operations
* CSV/structured datasets

### AI

* Large Language Model (LLM)
* Retrieval-Augmented Generation (RAG)
* Embeddings
* Vector database

---

# 📁 Suggested Project Structure

```text
RepayX/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   │
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── rag/
│   ├── database/
│   └── requirements.txt
│
├── data/
│   ├── loans.csv
│   └── payments.csv
│
├── docs/
│   ├── PRD.md
│   └── architecture.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

# ⚙️ Installation

## Prerequisites

Make sure the following are installed:

* Node.js 22.12+
* npm
* Git

Python and backend dependencies are not required for Phase 1.

---

## Clone the Repository

```bash
git clone https://github.com/priyaparihar2006/RepayX.git

cd RepayX
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

The frontend will be available at http://localhost:3000. From `frontend/`, run `npm run lint` for TypeScript checking and `npm run build` for a production build.

The two original CSV datasets remain unchanged at the repository root. They are separate datasets and are not joined or consumed by the current UI.

---

## Backend Setup

The backend is not implemented yet. The `backend/`, `ml/`, `models/`, `rag/`, and `notebooks/` directories are placeholders for later phases. There is no backend startup command in Phase 1.

---

# 🔑 Environment Configuration

For future API integration, copy the root `.env.example` to `frontend/.env`. Vite reads frontend environment files from `frontend/`. The current mock-data UI does not require this variable.

Example:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Never commit the `.env` file to Git.

---

# 🧪 Testing

Testing should cover the major application layers.

### Frontend

```bash
npm run build
```

### Backend

Run the configured backend test suite.

Testing should cover:

* API endpoints
* Authentication
* Loan retrieval
* Payment retrieval
* Data validation
* Analytics
* RAG retrieval
* AI responses
* Error handling

---

# 🔍 RAG Evaluation

The AI layer should be evaluated for:

### Retrieval Accuracy

Does the system retrieve the correct records or context?

### Response Accuracy

Does the generated response accurately represent the retrieved information?

### Grounding

Does the response remain grounded in the available data?

### Numerical Accuracy

Are calculations performed from structured data rather than hallucinated by the LLM?

### Relevance

Does the response directly answer the user's question?

---

# 🚀 Future Enhancements

Potential future versions of RepayX can include:

* Automated follow-up scheduling
* SMS integration
* WhatsApp integration
* Email notifications
* Call-management integration
* AI-generated follow-up summaries
* Customer communication history
* Advanced recovery analytics
* Role-based dashboards
* Exportable reports
* PDF report generation
* Advanced portfolio segmentation
* Predictive analytics
* AI-assisted collection workflows
* Multi-language AI assistant
* Real-time notifications

---

# 📌 Project Goals

The primary goals of RepayX are to:

1. Centralize loan and payment information.
2. Reduce manual data searching.
3. Improve visibility into overdue accounts.
4. Provide accurate portfolio analytics.
5. Enable natural-language interaction with loan data.
6. Use RAG to retrieve relevant contextual information.
7. Keep numerical calculations grounded in structured data.
8. Provide collection teams with a modern operational dashboard.
9. Create a scalable foundation for AI-assisted loan recovery workflows.

---

# 🔒 Responsible AI

RepayX should treat AI-generated responses as **data-assisted outputs**, not independent financial decisions.

The AI system should:

* Use available source data
* Avoid fabricating loan information
* Clearly distinguish retrieved facts from generated explanations
* Use structured calculations for numerical questions
* Provide appropriate uncertainty when information is unavailable
* Respect access permissions
* Avoid exposing unauthorized borrower information

---

# 📖 Documentation

Additional project documentation can include:

* Product Requirements Document (PRD)
* System Architecture
* API Documentation
* Database Schema
* RAG Architecture
* Deployment Guide
* Testing Documentation
* User Guide

---

# 🤝 Contribution

Contributions should follow the project's development workflow.

```text
Create Branch
     ↓
Implement Changes
     ↓
Test
     ↓
Commit
     ↓
Push
     ↓
Pull Request
     ↓
Code Review
     ↓
Merge
```

Use meaningful commit messages, for example:

```bash
git commit -m "feat: add overdue loan analytics"
git commit -m "fix: validate payment date"
git commit -m "feat: integrate RAG assistant"
```

---

# 📄 License

This project is intended for internal/company use.

Add the organization's official license and usage terms here if applicable.

---

# 👩‍💻 Project

**RepayX — AI-Powered Loan Follow-Up & Recovery Dashboard**

Built to bring **loan monitoring, payment analytics, recovery workflows, and AI-powered data interaction** into one intelligent platform.

> **RepayX — From Loan Data to Actionable Recovery Intelligence.**

