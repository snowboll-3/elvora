import express from 'express'; import cors from 'cors'; import morgan from 'morgan'; import fs from 'fs'; import path from 'path';
const app=express(); app.use(cors()); app.use(express.json({limit:'200kb'})); app.use(morgan('dev'));
const DATA='./data'; fs.mkdirSync(DATA,{recursive:true}); const leads=path.join(DATA,'leads.json'); const demos=path.join(DATA,'demos.json');
if(!fs.existsSync(leads)) fs.writeFileSync(leads,'[]'); if(!fs.existsSync(demos)) fs.writeFileSync(demos,'[]');
function save(p,i){const a=JSON.parse(fs.readFileSync(p,'utf8')); a.push(i); fs.writeFileSync(p,JSON.stringify(a,null,2));}
app.post('/api/lead',(req,res)=>{const {company,name,email,country}=req.body||{}; if(!company||!name||!email) return res.status(400).json({ok:false});
save(leads,{ts:new Date().toISOString(),company,name,email,country:country||null,source:'pdf'}); res.json({ok:true});});
app.post('/api/demo',(req,res)=>{const {company,name,email,interest,timeslot,notes}=req.body||{}; if(!company||!name||!email) return res.status(400).json({ok:false});
save(demos,{ts:new Date().toISOString(),company,name,email,interest:interest||null,timeslot:timeslot||null,notes:notes||null,source:'demo'}); res.json({ok:true});});
const PORT=process.env.PORT||5050; app.listen(PORT,()=>console.log('Leads API '+PORT));