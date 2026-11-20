# 🏡 RoamHaven — Full-Stack Holiday Home & Stay Rental Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.3-black.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://www.mongodb.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**RoamHaven** is a full-stack vacation rental and accommodation platform designed with focus on real-world engineering practices: tamper-proof reservation workflows, date collision detection, intelligent multi-factor stay matching, transparent cost calculators, and interactive map exploration.

---

## 🌟 Key Engineering Features

### 1. 📅 End-to-End Booking Engine & Collision Detection
- **Overlapping Date Protection**: Backend verifies room availability and blocks double-booking conflicts via MongoDB range queries (`checkIn < requestedCheckOut && checkOut > requestedCheckIn`).
- **Server-Side Financial Recalculation**: Prevents client-side price tampering by recalculating base nights, cleaning fees, 5% platform service fees, and 18% GST directly on the server.
- **My Trips Dashboard (`/bookings`)**: Manage upcoming reservations, view unique confirmation vouchers (`#RH-XXXXXX`), and handle cancellations.
- **Printable Booking Voucher**: Boarding-pass style confirmation slip formatted with dedicated `@media print` CSS.

### 2. 🪄 Smart Stay Recommendation Matcher (`/recommendations`)
- Multi-factor scoring algorithm evaluating destination matching, budget proximity, property style, amenities overlap, and community review ratings.

### 3. 💰 Transparent Trip Budget Planner (`/budget-planner`)
- All-inclusive cost calculator showing base nightly fees, additional guest surcharges, cleaning fees, service charges, and taxes, with a budget fit indicator.

### 4. 🗺️ Map-Based Discovery (`/map`)
- Geospatial exploration powered by **Leaflet & OpenStreetMap** with custom price-pill markers, listing popups, and property type filtering.

### 5. ⚖️ Side-by-Side Property Comparison (`/listings/compare`)
- Compare up to 3 stays side-by-side across pricing, amenities, cancellation policies, and guest capacities using a persistent floating comparison tray.

### 6. 🛡️ Robust Server-Side Validation & Security
- Strict **Joi schema validation** on all incoming payloads (`POST /listings`, `PUT /listings/:id`, `POST /listings/:id/reviews`, `POST /listings/:id/book`).
- Relational integrity with Mongoose post-delete hooks to cascade review deletions.

### 7. 🌓 Seamless Dark & Light Mode
- Complete system theme synchronisation with zero-contrast issues across all components and date pickers.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js (v5)
- **Database**: MongoDB, Mongoose ODM
- **Templating**: EJS, EJS-Mate
- **Validation**: Joi
- **Frontend / Styling**: Vanilla JavaScript, Bootstrap 5.3, Font Awesome 6
- **Maps**: Leaflet.js, OpenStreetMap API

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally on default port `27017`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Sushobhanbeaster/roamhaven.git
cd roamhaven

# Install dependencies
npm install
```

### 3. Seed Database (Optional)
```bash
node init/index.js
```

### 4. Run Application
```bash
# Development mode with hot-reloading
npm run dev

# Or standard production start
npm start
```

Visit the app at: **`http://localhost:8080`**

---

## 📁 Project Architecture

```
ROAMHAVEN/
├── models/             # Mongoose schemas (Listing, Review, Booking)
├── views/              # EJS templates
│   ├── bookings/       # Trips dashboard & printable voucher
│   ├── includes/       # Navbar, Footer, Floating Compare Tray
│   ├── layouts/        # Base boilerplate layout
│   └── listings/       # CRUD views, Map discovery, Budget planner, Compare
├── public/             # Static assets (Custom CSS & Client JS)
├── utils/              # ExpressError, wrapAsync utilities
├── schema.js           # Joi validation schemas
├── app.js              # Express application & route endpoints
└── package.json        # Dependencies & scripts
```

---

## 📄 License
This project is licensed under the MIT License.
