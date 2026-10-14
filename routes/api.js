const router = require('express').Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Candidate = require('../models/Candidate');
const { evaluateResume } = require('../controllers/ai');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:10},fileFilter:(_r,f,cb)=>cb(null,f.mimetype==='application/pdf'&&f.originalname.toLowerCase().endsWith('.pdf'))});
router.post('/process',upload.array('resumes',10),async(req,res)=>{
 try{const jd=req.body.jobDescription;if(!jd?.trim())return res.status(400).json({error:'Job description missing'});if(!req.files?.length)return res.status(400).json({error:'Upload at least one PDF'});
  for(const file of req.files){const text=(await pdfParse(file.buffer)).text;const evaluation=await evaluateResume(text,jd);await Candidate.create({fileName:file.originalname,jobDescription:jd,score:evaluation.score,matchingSkills:evaluation.matchingSkills,missingSkills:evaluation.missingSkills,education:evaluation.education,experience:evaluation.experience,summary:evaluation.summary});}res.json({message:'Processed successfully'});
 }catch(e){res.status(e.status||500).json({error:e.status?e.message:'Could not process resumes'});}
});
router.get('/candidates',async(_req,res)=>{try{res.json(await Candidate.find().sort({createdAt:-1}));}catch{res.status(500).json({error:'Could not load candidates'});}});
module.exports=router;
