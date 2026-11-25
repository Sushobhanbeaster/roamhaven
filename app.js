if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema, bookingSchema } = require("./schema.js");

// Server-side Validation Middleware
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

const validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

// Serverless-safe MongoDB connection caching (persists across warm invocations)
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 8000,
    }).then((m) => {
      console.log("Connected to MongoDB successfully");
      return m;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Middleware: wait for DB connection before handling any request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err);
    cached.promise = null; // reset so next request retries
    next(new ExpressError(500, `Database connection failed: ${err.message}`));
  }
});

// App Configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


// Root Route
app.get("/", (req, res) => {
  res.redirect("/listings");
});

// ================= FEATURE 1: SMART STAY RECOMMENDATION SYSTEM =================
app.get(
  "/recommendations",
  wrapAsync(async (req, res) => {
    let { destination = "", budget, propertyType = "Any", amenities = [] } = req.query;

    if (typeof amenities === "string") {
      amenities = [amenities];
    }

    const numericBudget = budget ? Number(budget) : null;
    const allListings = await Listing.find({}).populate("reviews");

    // Compute scoring for each listing
    const scoredListings = allListings.map((listing) => {
      let score = 0;
      let reasons = [];

      // 1. Destination Match (up to 35 pts)
      const cleanDest = destination.trim().toLowerCase();
      if (!cleanDest) {
        score += 35; // Neutral if user didn't specify destination
      } else {
        const loc = (listing.location || "").toLowerCase();
        const country = (listing.country || "").toLowerCase();
        if (loc.includes(cleanDest) || country.includes(cleanDest)) {
          score += 35;
          reasons.push(`Matches location: ${listing.location}`);
        } else if (cleanDest.includes(loc) || cleanDest.includes(country)) {
          score += 25;
          reasons.push(`Near ${listing.location}`);
        }
      }

      // 2. Budget Proximity Score (up to 30 pts)
      if (numericBudget && listing.price) {
        if (listing.price <= numericBudget) {
          // Closer to budget gives higher score
          const ratio = listing.price / numericBudget;
          const budgetPoints = Math.round(18 + 12 * ratio);
          score += budgetPoints;
          reasons.push(`Within ₹${numericBudget.toLocaleString("en-IN")} nightly budget`);
        } else {
          // Over budget penalty
          const diff = listing.price - numericBudget;
          const penaltyFactor = Math.max(0, 1 - diff / numericBudget);
          const budgetPoints = Math.round(30 * penaltyFactor);
          score += budgetPoints;
          if (budgetPoints > 0) {
            reasons.push(`Slightly above budget (+₹${diff.toLocaleString("en-IN")})`);
          }
        }
      } else {
        score += 25; // Neutral
      }

      // 3. Property Type Match (up to 15 pts)
      if (!propertyType || propertyType === "Any") {
        score += 15;
      } else if (listing.propertyType && listing.propertyType.toLowerCase() === propertyType.toLowerCase()) {
        score += 15;
        reasons.push(`Desired stay type: ${listing.propertyType}`);
      } else if (
        (listing.title && listing.title.toLowerCase().includes(propertyType.toLowerCase())) ||
        (listing.description && listing.description.toLowerCase().includes(propertyType.toLowerCase()))
      ) {
        score += 10;
        reasons.push(`Similar stay style`);
      }

      // 4. Amenities Match (up to 15 pts)
      const listingAmenities = listing.amenities || [];
      const matchedAmenities = [];
      if (amenities.length > 0) {
        for (let amenity of amenities) {
          if (
            listingAmenities.some(
              (item) => item.toLowerCase() === amenity.toLowerCase()
            )
          ) {
            matchedAmenities.push(amenity);
          }
        }
        const amenityRatio = matchedAmenities.length / amenities.length;
        score += Math.round(amenityRatio * 15);
        if (matchedAmenities.length > 0) {
          reasons.push(`Includes ${matchedAmenities.slice(0, 2).join(", ")}`);
        }
      } else {
        score += 15;
      }

      // 5. Community Rating Boost (up to 5 pts)
      if (listing.reviews && listing.reviews.length > 0) {
        const avgRating =
          listing.reviews.reduce((acc, curr) => acc + curr.rating, 0) /
          listing.reviews.length;
        score += Math.min(5, Math.round(avgRating));
      } else {
        score += 3;
      }

      const matchScore = Math.min(100, Math.max(10, Math.round(score)));

      return {
        listing,
        matchScore,
        reasons,
        matchedAmenities,
      };
    });

    // Rank descending by match score
    scoredListings.sort((a, b) => b.matchScore - a.matchScore);

    res.render("listings/recommendations.ejs", {
      results: scoredListings,
      filters: {
        destination,
        budget: numericBudget || "",
        propertyType,
        amenities,
      },
    });
  })
);

// ================= FEATURE 2: SMART TRIP BUDGET PLANNER =================
app.get(
  "/budget-planner",
  wrapAsync(async (req, res) => {
    let {
      destination = "",
      checkIn = "",
      checkOut = "",
      guests = 2,
      maxBudget = "",
      withinBudgetOnly = "false",
    } = req.query;

    guests = Math.max(1, Number(guests) || 2);
    const numericBudget = maxBudget ? Number(maxBudget) : null;

    // Default dates: today and 3 days later
    let nights = 3;
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        nights = diffDays;
      }
    } else {
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + 3);
      checkIn = today.toISOString().split("T")[0];
      checkOut = future.toISOString().split("T")[0];
    }

    let filter = {};
    if (destination && destination.trim() !== "") {
      const searchRegex = new RegExp(destination.trim(), "i");
      filter = {
        $or: [
          { title: searchRegex },
          { location: searchRegex },
          { country: searchRegex },
        ],
      };
    }

    const listings = await Listing.find(filter).populate("reviews");

    // Calculate detailed transparent cost breakdown
    const plannedListings = listings.map((listing) => {
      const baseNightly = listing.price || 0;
      const baseTotal = baseNightly * nights;
      const extraGuests = Math.max(0, guests - 2);
      const extraGuestFee = extraGuests * 300 * nights;
      const cleaningFee = listing.cleaningFee || 500;
      const serviceFee = listing.serviceFee || Math.round(baseTotal * 0.05);
      const subtotal = baseTotal + extraGuestFee + cleaningFee + serviceFee;
      const gst = Math.round(subtotal * 0.18);
      const grandTotal = subtotal + gst;

      const isWithinBudget = numericBudget ? grandTotal <= numericBudget : true;
      const delta = numericBudget ? grandTotal - numericBudget : 0;

      return {
        listing,
        nights,
        guests,
        baseNightly,
        baseTotal,
        extraGuestFee,
        cleaningFee,
        serviceFee,
        subtotal,
        gst,
        grandTotal,
        isWithinBudget,
        delta,
      };
    });

    let displayListings = plannedListings;
    if (withinBudgetOnly === "true" && numericBudget) {
      displayListings = plannedListings.filter((item) => item.isWithinBudget);
    }

    // Sort by best price value
    displayListings.sort((a, b) => a.grandTotal - b.grandTotal);

    res.render("listings/budget-planner.ejs", {
      plannedListings: displayListings,
      totalCount: plannedListings.length,
      params: {
        destination,
        checkIn,
        checkOut,
        nights,
        guests,
        maxBudget: numericBudget || "",
        withinBudgetOnly: withinBudgetOnly === "true",
      },
    });
  })
);

// ================= FEATURE 3: MAP-BASED PROPERTY DISCOVERY =================
app.get(
  "/map",
  wrapAsync(async (req, res) => {
    const { category } = req.query;
    let filter = {};
    if (category && category !== "All") {
      filter.propertyType = category;
    }
    const listings = await Listing.find(filter).populate("reviews");
    res.render("listings/map.ejs", { listings, activeCategory: category || "All" });
  })
);

// GeoJSON endpoint for Leaflet map & dynamic client updates
app.get(
  "/api/listings-geojson",
  wrapAsync(async (req, res) => {
    const listings = await Listing.find({});
    res.json(listings);
  })
);

// ================= FEATURE 4: COMPARE PROPERTIES SIDE BY SIDE =================
// Registered BEFORE /listings/:id so "compare" is not treated as an id
app.get(
  "/listings/compare",
  wrapAsync(async (req, res) => {
    const { ids } = req.query;
    let listings = [];

    if (ids && ids.trim()) {
      const idList = ids
        .split(",")
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      listings = await Listing.find({ _id: { $in: idList } }).populate("reviews");
    }

    // Also get 4 featured stays to recommend adding to compare if empty
    const featuredListings = await Listing.find({}).limit(6);

    res.render("listings/compare.ejs", {
      listings,
      featuredListings,
      comparedIds: ids || "",
    });
  })
);

// Batch query API for compare tray
app.get(
  "/api/listings/batch",
  wrapAsync(async (req, res) => {
    const { ids } = req.query;
    if (!ids) return res.json([]);
    const idList = ids
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    const listings = await Listing.find({ _id: { $in: idList } });
    res.json(listings);
  })
);

// ================= STANDARD LISTINGS ROUTES =================

// 1. Index Route (with Search functionality)
app.get(
  "/listings",
  wrapAsync(async (req, res) => {
    const { q, view = "grid" } = req.query;
    let filter = {};
    if (q && q.trim() !== "") {
      const searchRegex = new RegExp(q.trim(), "i");
      filter = {
        $or: [
          { title: searchRegex },
          { location: searchRegex },
          { country: searchRegex },
        ],
      };
    }
    const allListings = await Listing.find(filter).populate("reviews");
    res.render("listings/index.ejs", {
      allListings,
      searchQuery: q || "",
      activeView: view,
    });
  })
);

// 2. New Route
app.get("/listings/new", (req, res) => {
  res.render("listings/new.ejs");
});

// 3. Show Route
app.get(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ExpressError(404, "Invalid listing ID format!");
    }
    const listing = await Listing.findById(id).populate("reviews");
    if (!listing) {
      throw new ExpressError(404, "Listing does not exist!");
    }
    res.render("listings/show.ejs", { listing });
  })
);

// 4. Create Route
app.post(
  "/listings",
  validateListing,
  wrapAsync(async (req, res) => {
    const newListingData = req.body.listing;
    if (typeof newListingData.image === "string") {
      newListingData.image = {
        url: newListingData.image,
        filename: "listingimage",
      };
    }

    // Process amenities array
    if (newListingData.amenities && typeof newListingData.amenities === "string") {
      newListingData.amenities = [newListingData.amenities];
    }

    // Process latitude & longitude
    if (req.body.lat && req.body.lng) {
      newListingData.geometry = {
        lat: Number(req.body.lat),
        lng: Number(req.body.lng),
      };
    }

    const newListing = new Listing(newListingData);
    await newListing.save();
    res.redirect(`/listings/${newListing._id}`);
  })
);

// 5. Edit Route
app.get(
  "/listings/:id/edit",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ExpressError(404, "Invalid listing ID format!");
    }
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new ExpressError(404, "Listing does not exist!");
    }
    res.render("listings/edit.ejs", { listing });
  })
);

// 6. Update Route
app.put(
  "/listings/:id",
  validateListing,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const updatedData = { ...req.body.listing };
    if (typeof updatedData.image === "string") {
      updatedData.image = {
        url: updatedData.image,
        filename: "listingimage",
      };
    }

    // Process amenities array
    if (updatedData.amenities && typeof updatedData.amenities === "string") {
      updatedData.amenities = [updatedData.amenities];
    } else if (!updatedData.amenities) {
      updatedData.amenities = [];
    }

    if (req.body.lat && req.body.lng) {
      updatedData.geometry = {
        lat: Number(req.body.lat),
        lng: Number(req.body.lng),
      };
    }

    await Listing.findByIdAndUpdate(id, updatedData, { runValidators: true });
    res.redirect(`/listings/${id}`);
  })
);

// 7. Delete Route
app.delete(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
  })
);

// ================= REVIEWS ROUTES =================

// 1. Create Review Route
app.post(
  "/listings/:id/reviews",
  validateReview,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new ExpressError(404, "Listing not found!");
    }
    const newReview = new Review(req.body.review);
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    res.redirect(`/listings/${id}`);
  })
);

// 2. Delete Review Route
app.delete(
  "/listings/:id/reviews/:reviewId",
  wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
  })
);

// ================= BOOKINGS & RESERVATIONS ROUTES =================

// 1. Create Booking Route
app.post(
  "/listings/:id/book",
  validateBooking,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ExpressError(404, "Invalid listing ID format!");
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      throw new ExpressError(404, "Listing not found!");
    }

    const { guestName, guestEmail, guestPhone, checkIn, checkOut, guests, specialRequests } = req.body.booking;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (checkInDate < now) {
      throw new ExpressError(400, "Check-in date cannot be in the past!");
    }

    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
      throw new ExpressError(400, "Check-out date must be after check-in date!");
    }

    const numGuests = Number(guests);
    if (listing.maxGuests && numGuests > listing.maxGuests) {
      throw new ExpressError(400, `This listing accommodates a maximum of ${listing.maxGuests} guests.`);
    }

    // Availability / Collision Check: ensure no overlapping confirmed bookings
    const conflictingBooking = await Booking.findOne({
      listing: id,
      status: "Confirmed",
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    });

    if (conflictingBooking) {
      const bookedFrom = new Date(conflictingBooking.checkIn).toLocaleDateString("en-IN");
      const bookedTo = new Date(conflictingBooking.checkOut).toLocaleDateString("en-IN");
      throw new ExpressError(
        400,
        `These dates are already reserved (${bookedFrom} to ${bookedTo}). Please select different dates for your trip.`
      );
    }

    // Server-side recalculation of pricing for financial integrity
    const baseNightly = listing.price || 0;
    const baseTotal = baseNightly * nights;
    const extraGuests = Math.max(0, numGuests - 2);
    const extraGuestFee = extraGuests * 300 * nights;
    const cleaningFee = listing.cleaningFee || 500;
    const serviceFee = listing.serviceFee || Math.round(baseTotal * 0.05);
    const subtotal = baseTotal + extraGuestFee + cleaningFee + serviceFee;
    const gst = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gst;

    // Generate unique human-friendly booking reference code
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingCode = `RH-${randomHex}`;

    const newBooking = new Booking({
      listing: id,
      guestName,
      guestEmail,
      guestPhone,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      guests: numGuests,
      priceBreakdown: {
        baseNightly,
        baseTotal,
        extraGuestFee,
        cleaningFee,
        serviceFee,
        gst,
        grandTotal,
      },
      bookingCode,
      specialRequests: specialRequests || "",
      status: "Confirmed",
    });

    await newBooking.save();
    res.redirect(`/bookings/${newBooking._id}/confirmation`);
  })
);

// 2. All Bookings ("My Trips") Route
app.get(
  "/bookings",
  wrapAsync(async (req, res) => {
    const bookings = await Booking.find({})
      .populate("listing")
      .sort({ createdAt: -1 });

    res.render("bookings/index.ejs", { bookings });
  })
);

// 3. Booking Confirmation Receipt Route
app.get(
  "/bookings/:id/confirmation",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ExpressError(404, "Invalid booking ID format!");
    }

    const booking = await Booking.findById(id).populate("listing");
    if (!booking) {
      throw new ExpressError(404, "Booking reservation not found!");
    }

    res.render("bookings/confirmation.ejs", { booking });
  })
);

// 4. Cancel Booking Route
app.post(
  "/bookings/:id/cancel",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ExpressError(404, "Invalid booking ID format!");
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: "Cancelled" },
      { new: true }
    );
    if (!booking) {
      throw new ExpressError(404, "Booking not found!");
    }

    res.redirect("/bookings");
  })
);

// 5. Delete Booking Route
app.delete(
  "/bookings/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ExpressError(404, "Invalid booking ID format!");
    }

    await Booking.findByIdAndDelete(id);
    res.redirect("/bookings");
  })
);

// ================= ERROR HANDLING =================

// 404 Route
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { err });
});

// Start Server
const PORT = process.env.PORT || 8080;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT} - http://localhost:${PORT}`);
  });
}

module.exports = app;