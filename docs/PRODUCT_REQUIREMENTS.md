# FlavorMap — Product Requirements Document

> **Version:** 1.0
> **Date:** 2026-03-27
> **Project:** CSE-220 Web Programming | Acibadem University
> **Tech Stack:** Django 6 (Backend) + Next.js 16 (Frontend)

---

## 1. Overview

Restaurant review and discovery platform — discover restaurants, write reviews, rate experiences, manage favorites.

---

## 2. Feature Requirements

---

### Epic 1: Restaurant CRUD & Category Management

**Issue:** #2

| ID  | Feature            | Description                                                  |
| --- | ------------------ | ------------------------------------------------------------ |
| #3  | Category System    | Classify restaurants by cuisine type                         |
| #4  | Menu Management    | Manage menu items (name, description, price)                 |
| #5  | Advanced Filtering | Combined multi-filter (category + location + price + rating) |
| #6  | Location Filter    | Filter by city and district                                  |
| #7  | Price Range Filter | Filter by price range (€, €€, €€€)                           |
| #17 | Restaurant Photo   | Upload restaurant photos (depends on #24)                    |
| #19 | Opening Hours      | Display operating hours per day                              |

---

### Epic 2: Reviews & Ratings System

**Issue:** #9

| ID  | Feature        | Description                                         |
| --- | -------------- | --------------------------------------------------- |
| #8  | Average Rating | Calculate and display average rating per restaurant |
| #10 | Review Replies | Reply to reviews (one level of nesting)             |
| #11 | Review Likes   | Like/dislike reviews, sort by most helpful          |

---

### Epic 3: User Authentication & Profile

**Issue:** #12

| ID  | Feature               | Description                                      |
| --- | --------------------- | ------------------------------------------------ |
| #13 | Favorites List        | Add/remove restaurants to favorites              |
| #14 | User Profile          | Profile page showing reviews, ratings, favorites |
| #15 | Restaurant Owner Role | Claim and manage own restaurant listing          |

---

### Epic 4: Discovery & Homepage

**Issue:** #23

| ID  | Feature         | Description                                     |
| --- | --------------- | ----------------------------------------------- |
| #16 | Search          | Search by name, description, or location        |
| #20 | Popular Ranking | Homepage shows top-rated and newest restaurants |
| #22 | Map Integration | Interactive map for visual discovery (Epic)     |

---

### Epic 5: Map Integration

**Issue:** #22

| ID    | Feature                  | Description                                   |
| ----- | ------------------------ | --------------------------------------------- |
| #22.1 | Map Embed                | Google Maps iframe on restaurant detail pages |
| #22.2 | Geocoding Service        | Address to coordinates conversion             |
| #22.3 | Nearby Search            | Find restaurants by proximity                 |
| #22.4 | Interactive Map Homepage | Clustered markers, filtering                  |

---

### Infrastructure: Object File Management

**Issue:** #24
**Depended On By:** #17, #18

---

### Cross-Cutting: Data Integrity

**Issue:** #21

---

## 3. Non-Functional Requirements

| Requirement     | Specification                            |
| --------------- | ---------------------------------------- |
| Performance     | API responses < 200ms                    |
| Scalability     | 1000+ restaurants                        |
| Security        | JWT/Token auth, CSRF protection          |
| Availability    | 99% uptime                               |
| Accessibility   | WCAG 2.1 AA                              |
| Browser Support | Chrome, Firefox, Safari, Edge (latest 2) |

---

## 4. Dependencies

```
#24 Object File Management → #17, #18
#23 Discovery & Homepage   → #22 (Epic)
#2 Restaurant CRUD         → #17 (depends on #24)
```

---

## 5. Tech Stack

- Django 6
- Next.js 16
- PostgreSQL/SQLite
- MinIO (optional)

---

## 6. Issue Tracking

| #   | Title                                       | Type    | Epic | Status |
| --- | ------------------------------------------- | ------- | ---- | ------ |
| 2   | EPIC: Restaurant CRUD & Category Management | Epic    | —    | Open   |
| 3   | Category System                             | Feature | #2   | Open   |
| 4   | Menu Management                             | Feature | #2   | Open   |
| 5   | Advanced Filtering                          | Feature | #2   | Open   |
| 6   | Location Filter                             | Feature | #2   | Open   |
| 7   | Price Range Filter                          | Feature | #2   | Open   |
| 8   | Average Rating                              | Feature | #9   | Open   |
| 9   | EPIC: Reviews & Ratings System              | Epic    | —    | Open   |
| 10  | Review Replies                              | Feature | #9   | Open   |
| 11  | Review Likes                                | Feature | #9   | Open   |
| 12  | EPIC: User Authentication & Profile         | Epic    | —    | Open   |
| 13  | Favorites List                              | Feature | #12  | Open   |
| 14  | User Profile                                | Feature | #12  | Open   |
| 15  | Restaurant Owner Role                       | Feature | #12  | Open   |
| 16  | Search                                      | Feature | #23  | Open   |
| 17  | Restaurant Photo                            | Feature | #2   | Open   |
| 18  | Photo Gallery                               | Feature | —    | Open   |
| 19  | Opening Hours                               | Feature | #2   | Open   |
| 20  | Popular Ranking                             | Feature | #23  | Open   |
| 21  | Atomic Transactions                         | Feature | —    | Open   |
| 22  | EPIC: Map Integration                       | Epic    | #23  | Open   |
| 23  | EPIC: Discovery & Homepage                  | Epic    | —    | Open   |
| 24  | Object File Management                      | Feature | —    | Open   |

---

_Total: 24 issues (5 epics, 19 features)_
