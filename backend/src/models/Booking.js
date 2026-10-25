import mongoose from 'mongoose';

const bookedSeatSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['standard', 'premium'], required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    showtime: { type: mongoose.Schema.Types.ObjectId, ref: 'Showtime', required: true, index: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
    theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
    screen: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
    showStartTime: { type: Date, required: true },
    seats: { type: [bookedSeatSchema], validate: [(v) => v.length > 0, 'At least one seat'] },
    subtotal: { type: Number, required: true, min: 0 },
    convenienceFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, enum: ['card', 'upi', 'wallet'], required: true },
    paymentId: { type: String, required: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', index: true },
    cancelledAt: { type: Date },
    // Client generated key so that a double-clicked "Pay" button creates one booking only
    idempotencyKey: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.idempotencyKey;
        return ret;
      },
    },
  },
);

bookingSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
bookingSchema.index({ user: 1, showStartTime: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);
