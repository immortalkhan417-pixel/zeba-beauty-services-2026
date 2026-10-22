require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
const db = new Database(path.join(dataDir, 'zeba.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS services (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', duration INTEGER NOT NULL DEFAULT 45, price TEXT NOT NULL DEFAULT 'Contact for pricing',
 image TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bookings (
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, phone TEXT NOT NULL,
 service_ids TEXT NOT NULL, service_names TEXT NOT NULL, booking_date TEXT NOT NULL, booking_time TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
const initialServices = [
 ['Clean Up','Facial & Skin Care','A refreshing clean-up tailored to your skin.',35,'Contact for pricing','https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85'],
 ['D-Tan','Facial & Skin Care','A targeted salon treatment for a fresher-looking complexion.',30,'Contact for pricing','https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=900&q=85'],
 ['Bleach','Facial & Skin Care','A consultation-led beauty service for your preferred look.',25,'Contact for pricing','https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=85'],
 ['Facial','Facial & Skin Care','A relaxing facial experience customised to your needs.',50,'Contact for pricing','https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=900&q=85'],
 ['Advanced Facial','Facial & Skin Care','An elevated facial experience with a personalised consultation.',60,'Contact for pricing','https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=85'],
 ['Anti-Ageing Facial','Facial & Skin Care','A skincare-focused facial designed around your preferences.',60,'Contact for pricing','https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85'],
 ['Threading','Threading & Waxing','Precise grooming for a neat, defined finish.',15,'Contact for pricing','https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85'],
 ['Waxing','Threading & Waxing','A professional waxing service; ask about available areas.',30,'Contact for pricing','https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=85'],
 ['Hair Spa','Hair Care & Treatments','A relaxing hair and scalp care experience.',45,'Contact for pricing','https://images.unsplash.com/photo-1521590832167-7bcbda5f1a8f?auto=format&fit=crop&w=900&q=85'],
 ['Hair Treatment','Hair Care & Treatments','Talk with the stylist about your hair goals and options.',45,'Contact for pricing','https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=900&q=85'],
 ['Keratin','Hair Care & Treatments','A smoothing service with a consultation before treatment.',120,'Contact for pricing','https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85'],
 ['Botox Hair Treatment','Hair Care & Treatments','A salon hair treatment selected to suit your hair goals.',120,'Contact for pricing','https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=85'],
 ['Nanoplastia','Hair Care & Treatments','A professional smoothing service; consultation recommended.',150,'Contact for pricing','https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=85'],
 ['Straightening','Hair Care & Treatments','Explore straightening options with a stylist consultation.',120,'Contact for pricing','https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85'],
 ['Global Hair Colour','Hair Colouring','A single-tone colour service tailored to your look.',120,'Contact for pricing','https://images.unsplash.com/photo-1519690889869-e705e59f72e1?auto=format&fit=crop&w=900&q=85'],
 ['Highlights','Hair Colouring','Add dimension and brightness with customised highlights.',120,'Contact for pricing','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85'],
 ['Balayage','Hair Colouring','Soft, blended colour with a personalised consultation.',150,'Contact for pricing','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85'],
 ['Hair Colour','Hair Colouring','Discuss shades and maintenance with the stylist.',90,'Contact for pricing','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85'],
 ['Permanent Eyebrow','Eyebrow & Lash Services','Book a consultation to discuss shape, style, and suitability.',90,'Contact for pricing','https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=900&q=85'],
 ['Lash Extension','Eyebrow & Lash Services','Enhance your look with a lash style consultation.',90,'Contact for pricing','https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=900&q=85']
];
const insertService = db.prepare('INSERT OR IGNORE INTO services (name,category,description,duration,price,image) VALUES (?,?,?,?,?,?)');
for (const s of initialServices) insertService.run(...s);
const getSetting = db.prepare('SELECT value FROM settings WHERE key=?');
const setSetting = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
if (!getSetting.get('hours')) setSetting.run('hours', JSON.stringify({ start:'10:00', end:'19:00', slotMinutes:30, closedDays:[0] }));
if (!getSetting.get('offers')) setSetting.run('offers', JSON.stringify([
 {name:'Glow & Refresh',description:'A refreshing facial or clean-up experience. Ask us for a tailored combination.',active:true},
 {name:'Hair Transformation',description:'Discuss colour and hair-care options with our stylist.',active:true},
 {name:'Brow & Lash',description:'Explore eyebrow and lash services for your preferred look.',active:true}
]));

const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret.length < 32)) {
 console.error('SESSION_SECRET must be set to a random value of at least 32 characters in production.'); process.exit(1);
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit:'200kb' }));
app.use(express.urlencoded({ extended:false, limit:'20kb' }));
app.use(session({
 name:'zeba.sid', secret:sessionSecret || 'development-only-change-this-secret-before-deploying',
 resave:false, saveUninitialized:false, store:new SQLiteStore({ db:'sessions.sqlite', dir:dataDir }),
 cookie:{ httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV === 'production', maxAge:8*60*60*1000 }
}));
const loginLimiter = rateLimit({ windowMs:15*60*1000, limit:10, standardHeaders:true, legacyHeaders:false, message:{error:'Too many login attempts. Please try again in 15 minutes.'} });
const bookingLimiter = rateLimit({ windowMs:60*60*1000, limit:12, standardHeaders:true, legacyHeaders:false, message:{error:'Too many booking requests. Please try again later.'} });
const requireAdmin = (req,res,next) => req.session && req.session.admin ? next() : res.status(401).json({error:'Please sign in as the salon owner.'});
const clean = (v,max=500) => String(v ?? '').trim().slice(0,max);
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= new Date().toLocaleDateString('en-CA');
const validTime = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

app.get('/api/services', (req,res) => res.json(db.prepare('SELECT id,name,category,description,duration,price,image FROM services WHERE active=1 ORDER BY id').all()));
app.get('/api/config', (req,res) => res.json({ instagram:'https://www.instagram.com/zebarfat/', whatsapp:'919930605111', hours:JSON.parse(getSetting.get('hours').value), offers:JSON.parse(getSetting.get('offers').value) }));
app.get('/api/availability', (req,res) => {
 const date=clean(req.query.date,10); if (!validDate(date)) return res.status(400).json({error:'Choose a valid future date.'});
 const hours=JSON.parse(getSetting.get('hours').value); const day=new Date(`${date}T12:00:00`).getDay();
 if (hours.closedDays.includes(day)) return res.json({date,slots:[],message:'The salon is closed on this day.'});
 const taken=db.prepare("SELECT booking_time FROM bookings WHERE booking_date=? AND status IN ('pending','approved')").all(date).map(x=>x.booking_time);
 const slots=[]; const [sh,sm]=hours.start.split(':').map(Number); const [eh,em]=hours.end.split(':').map(Number);
 for(let m=sh*60+sm;m+hours.slotMinutes<=eh*60+em;m+=hours.slotMinutes){const t=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;if(!taken.includes(t))slots.push(t)}
 const today=new Date(); const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 const nowM=today.getHours()*60+today.getMinutes();
 res.json({date,slots:date===todayStr?slots.filter(t=>{const [h,m]=t.split(':').map(Number);return h*60+m>nowM}):slots});
});
app.post('/api/bookings', bookingLimiter, (req,res) => {
 const name=clean(req.body.name,100), phone=clean(req.body.phone,30), notes=clean(req.body.notes,1000), date=clean(req.body.date,10), time=clean(req.body.time,5);
 let ids=Array.isArray(req.body.serviceIds)?[...new Set(req.body.serviceIds.map(Number).filter(Number.isInteger))]:[];
 if(name.length<2) return res.status(400).json({error:'Please enter your name.'});
 if(!/^\+?[0-9 ()-]{7,20}$/.test(phone)) return res.status(400).json({error:'Please enter a valid phone number.'});
 if(!ids.length || ids.length>10) return res.status(400).json({error:'Choose between 1 and 10 services.'});
 if(!validDate(date) || !validTime(time)) return res.status(400).json({error:'Choose a valid future date and time.'});
 const selected=db.prepare(`SELECT id,name,duration FROM services WHERE active=1 AND id IN (${ids.map(()=>'?').join(',')})`).all(...ids);
 if(selected.length!==ids.length) return res.status(400).json({error:'One or more selected services are unavailable.'});
 const hours=JSON.parse(getSetting.get('hours').value); if(hours.closedDays.includes(new Date(`${date}T12:00:00`).getDay())) return res.status(409).json({error:'The salon is closed on that date.'});
 const [h,m]=time.split(':').map(Number), start=h*60+m, [eh,em]=hours.end.split(':').map(Number), [sh,sm]=hours.start.split(':').map(Number);
 if(start<sh*60+sm || start>=eh*60+em || start%hours.slotMinutes!==((sh*60+sm)%hours.slotMinutes)) return res.status(400).json({error:'Please choose a listed appointment time.'});
 const today=new Date(); const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 if(date===todayStr && start<=today.getHours()*60+today.getMinutes()) return res.status(400).json({error:'Please choose a future time.'});
 try {
  const result=db.transaction(()=>{
   const exists=db.prepare("SELECT id FROM bookings WHERE booking_date=? AND booking_time=? AND status IN ('pending','approved')").get(date,time);
   if(exists) throw new Error('That time was just taken. Please choose another slot.');
   return db.prepare('INSERT INTO bookings(customer_name,phone,service_ids,service_names,booking_date,booking_time,notes,status) VALUES(?,?,?,?,?,?,?,\'pending\')').run(name,phone,JSON.stringify(ids),selected.map(s=>s.name).join(', '),date,time,notes);
  })();
  res.status(201).json({id:result.lastInsertRowid,status:'pending',message:'Your booking request has been saved. It is not confirmed until the salon owner replies.',booking:{name,phone,services:selected.map(s=>s.name),date,time,notes}});
 } catch(e) {res.status(409).json({error:e.message.includes('taken')?e.message:'Could not save your booking. Please try again.'})}
});
app.post('/api/admin/login',loginLimiter, async(req,res)=>{
 const username=clean(req.body.username,80), password=String(req.body.password||'');
 const expectedUser=process.env.ADMIN_USERNAME||'admin', expectedPass=process.env.ADMIN_PASSWORD||'ChangeThisPassword123!';
 const matchUser=username===expectedUser; const matchPass=await bcrypt.compare(password, await bcrypt.hash(expectedPass,10));
 if(!matchUser||!matchPass) return res.status(401).json({error:'Incorrect username or password.'});
 req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Unable to start a secure session.'});req.session.admin={username};res.json({ok:true,username})});
});
app.post('/api/admin/logout',requireAdmin,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/admin/me',(req,res)=>res.json({authenticated:!!(req.session&&req.session.admin),username:req.session?.admin?.username||null}));
app.get('/api/admin/bookings',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM bookings ORDER BY booking_date DESC,booking_time DESC,id DESC LIMIT 500').all().map(b=>({...b,service_ids:JSON.parse(b.service_ids)}))));
app.patch('/api/admin/bookings/:id',requireAdmin,(req,res)=>{
 const status=clean(req.body.status,20); if(!['pending','approved','rejected','rescheduled','completed'].includes(status))return res.status(400).json({error:'Invalid booking status.'});
 const b=db.prepare('SELECT * FROM bookings WHERE id=?').get(Number(req.params.id));if(!b)return res.status(404).json({error:'Booking not found.'});
 if(['approved','pending'].includes(status)){const conflict=db.prepare("SELECT id FROM bookings WHERE booking_date=? AND booking_time=? AND id<>? AND status IN ('pending','approved')").get(b.booking_date,b.booking_time,b.id);if(conflict)return res.status(409).json({error:'Another booking request already uses this time. Review the other request first.'})}
 db.prepare('UPDATE bookings SET status=? WHERE id=?').run(status,b.id);res.json({ok:true,status});
});
app.get('/api/admin/services',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM services ORDER BY category,name').all()));
app.patch('/api/admin/services/:id',requireAdmin,(req,res)=>{
 const id=Number(req.params.id), current=db.prepare('SELECT * FROM services WHERE id=?').get(id);if(!current)return res.status(404).json({error:'Service not found.'});
 const name=clean(req.body.name,100), description=clean(req.body.description,500), price=clean(req.body.price,80), duration=Number(req.body.duration), active=req.body.active?1:0;
 if(name.length<2||!Number.isInteger(duration)||duration<5||duration>600)return res.status(400).json({error:'Enter a valid name and duration (5–600 minutes).'});
 try{db.prepare('UPDATE services SET name=?,description=?,price=?,duration=?,active=? WHERE id=?').run(name,description,price,duration,active,id);res.json({ok:true})}catch(e){res.status(400).json({error:'Could not update service. Check that the name is unique.'})}
});
app.post('/api/admin/services',requireAdmin,(req,res)=>{
 const name=clean(req.body.name,100),category=clean(req.body.category,80),description=clean(req.body.description,500),price=clean(req.body.price||'Contact for pricing',80),duration=Number(req.body.duration||45),image=clean(req.body.image,1000);
 if(name.length<2||!category||!Number.isInteger(duration)||duration<5||duration>600)return res.status(400).json({error:'Provide a service name, category and valid duration.'});
 try{const r=db.prepare('INSERT INTO services(name,category,description,duration,price,image) VALUES(?,?,?,?,?,?)').run(name,category,description,duration,price,image);res.status(201).json({id:r.lastInsertRowid})}catch(e){res.status(400).json({error:'Could not add service. The name may already exist.'})}
});
app.get('/api/admin/settings',requireAdmin,(req,res)=>res.json({hours:JSON.parse(getSetting.get('hours').value),offers:JSON.parse(getSetting.get('offers').value)}));
app.put('/api/admin/settings',requireAdmin,(req,res)=>{
 const h=req.body.hours;if(!h||!/^([01]\d|2[0-3]):[0-5]\d$/.test(h.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(h.end)||!Number.isInteger(Number(h.slotMinutes))||h.slotMinutes<15||h.slotMinutes>240||h.start>=h.end)return res.status(400).json({error:'Check opening hours and slot length.'});
 const closed=Array.isArray(h.closedDays)?h.closedDays.map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6):[];setSetting.run('hours',JSON.stringify({start:h.start,end:h.end,slotMinutes:Number(h.slotMinutes),closedDays:closed}));
 if(Array.isArray(req.body.offers))setSetting.run('offers',JSON.stringify(req.body.offers.slice(0,10).map(o=>({name:clean(o.name,100),description:clean(o.description,300),active:!!o.active}))));res.json({ok:true});
});
app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`Zeba Beauty Services running at http://localhost:${PORT}`));
