const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Listing = require("./listing.js");

const bookingSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  guestName: {
    type: String,
    required: [true, "Guest name is required"],
    trim: true,
  },
  guestEmail: {
    type: String,
    required: [true, "Email address is required"],
    trim: true,
    lowercase: true,
  },
  guestPhone: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
  },
  checkIn: {
    type: Date,
    required: [true, "Check-in date is required"],
  },
  checkOut: {
    type: Date,
    required: [true, "Check-out date is required"],
  },
  nights: {
    type: Number,
    required: true,
    min: 1,
  },
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  priceBreakdown: {
    baseNightly: { type: Number, required: true },
    baseTotal: { type: Number, required: true },
    extraGuestFee: { type: Number, default: 0 },
    cleaningFee: { type: Number, default: 500 },
    serviceFee: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
  },
  bookingCode: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ["Confirmed", "Cancelled", "Completed"],
    default: "Confirmed",
  },
  specialRequests: {
    type: String,
    default: "",
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);
