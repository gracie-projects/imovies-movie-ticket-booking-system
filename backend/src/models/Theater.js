import mongoose from 'mongoose';

const theaterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    city: { type: String, required: true, trim: true, maxlength: 60, index: true },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    amenities: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

export const Theater = mongoose.model('Theater', theaterSchema);
