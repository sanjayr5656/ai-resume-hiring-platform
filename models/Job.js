const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  requiredSkills: [String],
  niceToHaveSkills: [String],
  minExperience: { type: Number, min: 0, default: 0 },
  weights: {
    skills: { type: Number, default: 45 },
    projects: { type: Number, default: 30 },
    certifications: { type: Number, default: 20 },
    experience: { type: Number, default: 5 }
  },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true }
}, { timestamps: true });

jobSchema.pre('validate', function() {
  if (this.weights) {
    const total = Object.values(this.weights.toObject ? this.weights.toObject() : this.weights).reduce((a, b) => a + Number(b || 0), 0);
    if (total !== 100) this.invalidate('weights', 'Weights must sum to 100');
  }
});

module.exports = mongoose.model('Job', jobSchema);
