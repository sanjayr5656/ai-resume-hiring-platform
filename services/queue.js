const Job = require('../models/Job');
const Application = require('../models/Application');
const { rank } = require('../utils/ranking');

class RerankQueue {
  constructor() {
    this.queue = [];
    this.inFlight = false;
    this.queuedJobIds = new Set();
  }

  enqueueRerank(jobId) {
    if (!jobId) return;
    const strId = jobId.toString();
    if (this.queuedJobIds.has(strId)) {
      return; // Deduplicated
    }
    this.queuedJobIds.add(strId);
    this.queue.push(strId);
    this.processNext();
  }

  async processNext() {
    if (this.inFlight || this.queue.length === 0) return;
    this.inFlight = true;
    const jobId = this.queue.shift();
    this.queuedJobIds.delete(jobId);

    try {
      await this.rerankJob(jobId);
    } catch (err) {
      console.error(`Error reranking job ${jobId}:`, err.message);
    } finally {
      this.inFlight = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  async rerankJob(jobId) {
    const job = await Job.findById(jobId);
    if (!job) return;

    const applications = await Application.find({ jobId }).select('+parsed.certifications.proofFile');
    if (!applications.length) return;

    // 1. Recompute score for each application
    for (const app of applications) {
      app.scores = rank(app.parsed, job);
    }

    // 2. Sort by total score descending, then createdAt ascending
    applications.sort((a, b) => {
      const scoreDiff = (b.scores?.total || 0) - (a.scores?.total || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 3. Assign sequential rank and update timestamp
    const now = new Date();
    const bulkOps = applications.map((app, index) => ({
      updateOne: {
        filter: { _id: app._id },
        update: {
          $set: {
            rank: index + 1,
            scores: app.scores,
            rankUpdatedAt: now
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      await Application.bulkWrite(bulkOps);
    }
  }
}

const queueInstance = new RerankQueue();

module.exports = {
  enqueueRerank: jobId => queueInstance.enqueueRerank(jobId),
  rerankJob: jobId => queueInstance.rerankJob(jobId)
};
