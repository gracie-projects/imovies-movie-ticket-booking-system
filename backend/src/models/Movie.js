import mongoose from 'mongoose';

export const MOVIE_STATUSES = ['now_showing', 'coming_soon', 'archived'];
export const CERTIFICATES = ['U', 'UA', 'UA13+', 'A'];

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true, maxlength: 160, default: '' },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    genres: { type: [String], validate: [(v) => v.length > 0, 'At least one genre is required'] },
    languages: { type: [String], validate: [(v) => v.length > 0, 'At least one language is required'] },
    durationMins: { type: Number, required: true, min: 30, max: 300 },
    certificate: { type: String, enum: CERTIFICATES, default: 'UA' },
    rating: { type: Number, min: 0, max: 10, default: 0 },
    director: { type: String, trim: true, maxlength: 80, required: true },
    cast: { type: [String], default: [] },
    releaseDate: { type: Date, required: true },
    posterUrl: { type: String, trim: true, required: true },
    backdropUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: MOVIE_STATUSES, default: 'now_showing', index: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

movieSchema.index({ title: 1 });
movieSchema.index({ genres: 1 });
movieSchema.index({ languages: 1 });

export const Movie = mongoose.model('Movie', movieSchema);
