import mongoose from "mongoose";

const CandidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    projects: {
      type: [String],
      default: [],
    },
    saved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Candidate", CandidateSchema);
