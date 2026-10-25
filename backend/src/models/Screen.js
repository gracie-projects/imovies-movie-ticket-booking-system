import mongoose from 'mongoose';

export const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const screenSchema = new mongoose.Schema(
  {
    theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    rows: { type: Number, required: true, min: 1, max: 26 },
    seatsPerRow: { type: Number, required: true, min: 1, max: 30 },
    // Row letters priced at the premium rate (usually the back rows)
    premiumRows: { type: [String], default: [] },
    // Seat numbers after which an aisle gap is drawn
    aisleAfter: { type: [Number], default: [] },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

screenSchema.index({ theater: 1, name: 1 }, { unique: true });

screenSchema.virtual('capacity').get(function capacity() {
  return this.rows * this.seatsPerRow;
});

/** Returns every valid seat id for this screen, e.g. ["A1", "A2", ...] */
screenSchema.methods.allSeatIds = function allSeatIds() {
  const ids = [];
  for (let r = 0; r < this.rows; r += 1) {
    for (let n = 1; n <= this.seatsPerRow; n += 1) ids.push(`${ROW_LETTERS[r]}${n}`);
  }
  return ids;
};

screenSchema.methods.seatType = function seatType(seatId) {
  return this.premiumRows.includes(seatId[0]) ? 'premium' : 'standard';
};

export const Screen = mongoose.model('Screen', screenSchema);
