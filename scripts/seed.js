require('dotenv').config();
const mongoose=require('mongoose');const bcrypt=require('bcryptjs');const User=require('../models/User');const Job=require('../models/Job');
async function run(){await mongoose.connect(process.env.MONGO_URI);const pass=await bcrypt.hash('DemoPass123!',12);
 const recruiter=await User.findOneAndUpdate({email:'recruiter@example.com'},{$set:{name:'Morgan Lee',passwordHash:pass,role:'recruiter',company:'Northstar Studio'}},{upsert:true,new:true,setDefaultsOnInsert:true});
 await User.findOneAndUpdate({email:'candidate@example.com'},{$set:{name:'Alex Rivera',passwordHash:pass,role:'candidate'}},{upsert:true,new:true,setDefaultsOnInsert:true});
 const examples=[{title:'Frontend Engineer',description:'Build thoughtful web experiences with React and TypeScript. Work closely with design and backend teams. 2+ years preferred.',requiredSkills:['React','JavaScript','CSS','TypeScript'],niceToHaveSkills:['Node.js','Accessibility'],minExperience:2},{title:'Node.js Platform Developer',description:'Design dependable APIs and data services with Node.js, Express, and MongoDB. Familiarity with cloud services is a plus.',requiredSkills:['Node.js','Express','MongoDB','REST APIs'],niceToHaveSkills:['AWS','Docker'],minExperience:3}];
 for(const j of examples) await Job.findOneAndUpdate({recruiterId:recruiter._id,title:j.title},{$set:{...j,company:recruiter.company,status:'open',weights:{skills:35,projects:30,certifications:20,experience:15}}},{upsert:true,new:true,setDefaultsOnInsert:true});
 console.log('Seeded. Sign in: recruiter@example.com / DemoPass123! or candidate@example.com / DemoPass123!');await mongoose.disconnect();}
run().catch(e=>{console.error(e);process.exit(1);});
