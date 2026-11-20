const Joi = require("joi");

const listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().trim().required(),
    location: Joi.string().trim().required(),
    country: Joi.string().trim().required(),
    price: Joi.number().min(0).required(),
    image: Joi.alternatives().try(
      Joi.string().allow("", null),
      Joi.object({
        url: Joi.string().allow("", null),
        filename: Joi.string().allow("", null),
      })
    ),
    propertyType: Joi.string()
      .valid(
        "Apartment",
        "Villa",
        "Cottage",
        "Chalet",
        "Loft",
        "Treehouse",
        "Cabin",
        "Resort",
        "Ryokan",
        "Other"
      )
      .default("Apartment"),
    maxGuests: Joi.number().min(1).max(50),
    cleaningFee: Joi.number().min(0),
    serviceFee: Joi.number().min(0),
    cancellationPolicy: Joi.string().allow("", null),
    nearbyHubs: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ),
    amenities: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ),
  }).required(),
  lat: Joi.alternatives().try(Joi.number(), Joi.string().allow("", null)),
  lng: Joi.alternatives().try(Joi.number(), Joi.string().allow("", null)),
});

const reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().trim().required(),
    author: Joi.string().trim().allow("", null),
    tripType: Joi.string().trim().allow("", null),
  }).required(),
});

const bookingSchema = Joi.object({
  booking: Joi.object({
    guestName: Joi.string().trim().min(2).max(100).required(),
    guestEmail: Joi.string().trim().email().required(),
    guestPhone: Joi.string().trim().min(7).max(20).required(),
    checkIn: Joi.date().iso().required(),
    checkOut: Joi.date().iso().greater(Joi.ref("checkIn")).required().messages({
      "date.greater": "Check-out date must be after check-in date",
    }),
    guests: Joi.number().min(1).max(30).required(),
    specialRequests: Joi.string().allow("", null).max(500),
  }).required(),
});

module.exports = {
  listingSchema,
  reviewSchema,
  bookingSchema,
};

