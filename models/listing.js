const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review");

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    url: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      set: (v) =>
        !v || v === ""
          ? "https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
          : v,
    },
    filename: {
      type: String,
      default: "listingimage",
    },
  },
  price: Number,
  location: String,
  country: String,
  geometry: {
    lat: {
      type: Number,
      default: 20.2961, // Default latitude
    },
    lng: {
      type: Number,
      default: 85.8245, // Default longitude
    },
  },
  propertyType: {
    type: String,
    enum: [
      "Apartment",
      "Villa",
      "Cottage",
      "Chalet",
      "Loft",
      "Treehouse",
      "Cabin",
      "Resort",
      "Ryokan",
      "Other",
    ],
    default: "Apartment",
  },
  amenities: {
    type: [String],
    default: ["Wifi", "Air Conditioning", "Free Parking"],
  },
  maxGuests: {
    type: Number,
    default: 4,
  },
  cleaningFee: {
    type: Number,
    default: 500,
  },
  serviceFee: {
    type: Number,
    default: 300,
  },
  cancellationPolicy: {
    type: String,
    default: "Flexible (Free cancellation up to 48 hrs)",
  },
  nearbyHubs: {
    type: [String],
    default: ["City Centre (2 km)", "Transit Station (3 km)"],
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
});

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing && listing.reviews && listing.reviews.length) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;

