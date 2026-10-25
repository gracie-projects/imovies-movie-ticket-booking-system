import mongoose from 'mongoose';

export const FORMATS = ['2D', '3D', 'IMAX', '4DX'];

const showtimeSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
    screen: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    language: { type: String, required: true, trim: true },
    format: { type: String, enum: FORMATS, default: '2D' },
    prices: {
      standard: { type: Number, required: true, min: 0 },
      premium: { type: Number, required: true, min: 0 },
    },
    // Seats confirmed by bookings. Updated only with atomic conditional writes.
    bookedSeats: { type: [String], default: [] },
    status: { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

showtimeSchema.index({ movie: 1, startTime: 1 });
showtimeSchema.index({ screen: 1, startTime: 1 });
showtimeSchema.index({ startTime: 1 });

export const Showtime = mongoose.model('Showtime', showtimeSchema);
