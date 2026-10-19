const $=s=>document.querySelector(s), modal=$('#application');
const steps=['Your craft','About you','Contact','Location','Your toolkit','Portfolio','Preferences','Review'];
let data={category:'Editor',niches:[]},step=0,complete=false;
try{data={...data,...JSON.parse((localStorage.getItem('sihu-draft') || localStorage.getItem('snapja-draft'))||'{}')}}catch{}
data.software=Array.isArray(data.software)?data.software:(data.software?[data.software]:[]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const input=(label,key,type='text',placeholder='',required=true)=>`<label>${label}${required?' *':''}<input name="${key}" type="${type}" value="${esc(data[key])}" placeholder="${placeholder}" ${required?'required':''}></label>`;
const select=(label,key,options)=>`<label>${label} *<select name="${key}" required><option value="">Select ${label.toLowerCase()}</option>${options.map(x=>`<option ${data[key]===x?'selected':''}>${x}</option>`).join('')}</select></label>`;
function save(){try{localStorage.setItem('sihu-draft',JSON.stringify(data))}catch{}}
function capture(){const values=new FormData($('#form'));values.forEach((v,k)=>{if(k!=='software')data[k]=v});if(step===4)data.software=values.getAll('software');save()}
function toast(t){$('#toast').textContent=t;$('#toast').style.opacity=1;setTimeout(()=>$('#toast').style.opacity=0,3000)}
function render(){
 $('#steps').innerHTML=steps.map((x,i)=>`<li class="${i===step?'active':''}"><span>${i<step?'✓':String(i+1).padStart(2,'0')}</span>${x}</li>`).join('');
 $('#progress').innerHTML=steps.map((_,i)=>`<i class="${i<=step?'done':''}"></i>`).join('');$('#error').textContent='';$('#back').hidden=step===0||complete;$('#next').textContent=step===7?'Submit for review →':'Continue →';$('#next').hidden=complete;
 const titles=['What do you create?','Tell us about you.','Let’s stay connected.','Where are you based?','Tools of your trade.','Show your signature.','Make it your own.','Ready for your next chapter?'];
 const descriptions=['Choose the craft that feels most like you.','Give your creative profile a personal touch.','Add the details you would use for booking notifications.','A local starting point. A world of possibilities.','The software and specialties behind your best work.','Let your portfolio do the talking.','Tell us how you like to work.','Review your profile. Verify your email next to submit it securely for admin review.'];
 let body='';
 if(step===0)body=`<div class="choices">${['Reel Maker','Photographer','Videographer','Drone Pilot','Editor','UGC Creator'].map((x,i)=>`<button type="button" class="choice ${data.category===x?'selected':''}" data-category="${x}">${['◧','◎','▣','✧','✂','✦'][i]} &nbsp; ${x}</button>`).join('')}</div>`;
 if(step===1)body=input('Full name','name','text','Your creative identity')+input('Date of birth','dob','date')+select('Gender','gender',['Female','Male','Non-binary','Prefer not to say'])+'<p style="font-size:11px;color:#9aa68b">Partner applicants must be 18 or older.</p>';
 if(step===2)body=input('Email address','email','email','you@example.com')+input('Phone number','phone','tel','+91 98765 43210');
 if(step===3)body=input('Country','country','text','India')+input('State / Province','state','text','Your state')+input('City','city','text','Your city');
 if(step===4)body='<fieldset class="software-options"><legend>Software you use *</legend><p>Select all that apply.</p><div class="choices">'+['Adobe Premiere Pro','DaVinci Resolve','Final Cut Pro','After Effects','Blender','CapCut','Other'].map(x=>`<label class="choice software-choice"><input type="checkbox" name="software" value="${x}" ${data.software.includes(x)?'checked':''}> <span>${x}</span></label>`).join('')+'</div></fieldset>'+input('Years of experience','experience','number','e.g. 2')+'<label>Your specialties · choose up to 5 *</label><div class="choices">'+['Social media','Motion design','Weddings','Brand films','Color grading','Visual effects','Travel','Product films'].map(x=>`<button type="button" class="choice ${data.niches.includes(x)?'selected':''}" data-niche="${x}">${x}</button>`).join('')+'</div>';
 if(step===5)body=input('Instagram username','instagram','text','@yourusername')+input('Portfolio link','portfolio','url','https://yourportfolio.com',false)+'<p style="font-size:11px;color:#9aa68b">Use a public Instagram profile. Portfolio links can include your website, YouTube, or a shared collection.</p>';
 if(step===6)body=select('Availability','availability',['Open to projects','Part-time','Full-time','Weekends'])+select('Work preference','work',['Remote','On location','Both'])+input('A few words about your style','bio','text','Cinematic cuts with a human touch',false);
 if(step===7)body='<div class="summary">'+[['Craft',data.category],['Name',data.name],['Email',data.email],['Location',[data.city,data.state,data.country].filter(Boolean).join(', ')],['Software',data.software.join(', ')],['Specialties',data.niches.join(', ')],['Instagram',data.instagram],['Availability',data.availability]].map(([k,v])=>`<div><small>${k}</small>${esc(v)}</div>`).join('')+'</div><label><input type="checkbox" name="consent" required> I agree to share these details with Sihu for application review.</label>';
 $('#fields').innerHTML=`<div class="eyebrow">STEP ${step+1} OF 8 · ${steps[step].toUpperCase()}</div><h2>${titles[step]}</h2><p>${descriptions[step]}</p>${body}`;
 if(step===4){const n=$('[name=experience]');n.min=0;n.max=80}
 $('#fields').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{data.category=b.dataset.category;save();render()});
 $('#fields').querySelectorAll('[data-niche]').forEach(b=>b.onclick=()=>{capture();const n=b.dataset.niche;if(data.niches.includes(n))data.niches=data.niches.filter(x=>x!==n);else if(data.niches.length<5)data.niches.push(n);else return toast('Choose up to five specialties.');save();render()});
}
function open(){complete=false;render();modal.showModal()}
document.querySelectorAll('.apply').forEach(b=>b.onclick=open);document.querySelectorAll('#login, .login-btn').forEach(b=>b.onclick=()=>{if(window.Sihu)window.Sihu.open();else toast('Account service is loading. Please try again.')});if($('#admin-link'))$('#admin-link').onclick=e=>{e.preventDefault();if(window.Sihu)window.Sihu.openAdmin();else location.search='?admin'};$('#close').onclick=()=>{capture();modal.close()};$('#back').onclick=()=>{capture();step=Math.max(0,step-1);render()};
$('#form').addEventListener('submit',e=>{e.preventDefault();capture();let error='';if(step===1){const d=new Date(data.dob+'T00:00:00'),now=new Date();let age=now.getFullYear()-d.getFullYear();if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))age--;if(age<18||age>120||!Number.isFinite(age))error='Please enter a valid date of birth. Applicants must be 18 or older.'}if(step===2&&!/^\+?[\d\s()-]{10,18}$/.test(data.phone))error='Enter a valid phone number, including your country code.';if(step===4&&!data.niches.length)error='Choose at least one specialty.';if(step===4&&!data.software.length)error='Choose at least one software tool.';if(step===5&&!/^@?[a-zA-Z0-9._]{1,30}$/.test(data.instagram))error='Enter your Instagram username, not a link.';if(error){$('#error').textContent=error;return}if(step<7){step++;render();$('.form-area').scrollIntoView({block:'start',behavior:'smooth'})}else{if(window.Sihu){window.Sihu.submit(data)}else{toast('Account service is loading. Please try again.')}}});
$('#form').addEventListener('change',capture);
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;function motion(){document.body.classList.toggle('paused',paused);$('#motion').textContent=`Motion: ${paused?'off':'on'}`;$('#play').textContent=paused?'▶':'Ⅱ';$('#play').setAttribute('aria-label',paused?'Play animation':'Pause animation')}$('#motion').onclick=$('#play').onclick=()=>{paused=!paused;motion()};motion();
let frame=108;setInterval(()=>{if(!paused){frame=(frame+1)%480;$('#timecode').textContent=`00:00:${String(Math.floor(frame/24)).padStart(2,'0')}:${String(frame%24).padStart(2,'0')}`}},1000/24);

// Reels Feed & 1-Tap Hire Interaction
const hireModal = $('#hire-modal');

function bindReelEvents() {
  if (hireModal) {
    $('#hire-close').onclick = () => hireModal.close();
    document.querySelectorAll('.hire-btn').forEach(btn => {
      btn.onclick = () => {
        const creator = btn.dataset.creator || 'Creator Sihu #01';
        const category = btn.dataset.category || 'Cinematic Reel Edit';
        $('#hire-creator').value = creator;
        const typeSelect = $('#hire-type');
        if (typeSelect) {
          for (let opt of typeSelect.options) {
            if (opt.text.toLowerCase().includes(category.toLowerCase())) {
              typeSelect.value = opt.value;
              break;
            }
          }
        }
        $('#hire-error').textContent = '';
        hireModal.showModal();
      };
    });
  }

  // Reel Play/Pause Preview
  document.querySelectorAll('.reel-play-btn').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const card = btn.closest('.reel-card');
      const isPlaying = card.classList.toggle('playing');
      btn.textContent = isPlaying ? '⏸' : '▶';
      btn.setAttribute('aria-label', isPlaying ? 'Pause reel preview' : 'Play reel preview');
    };
  });
}

// Render approved creators dynamically into the showcase
function renderDynamicReels() {
  const grid = document.querySelector('#reels-grid');
  if (!grid) return;
  let approved = [];
  try {
    approved = JSON.parse(localStorage.getItem('sihu_approved_creators') || '[]');
  } catch {}

  if (approved.length) {
    const approvedCardsHtml = approved.map((c, i) => {
      let cat = (c.category || 'cinematic').toLowerCase();
      let categoryClass = 'cinematic';
      if (cat.includes('iphone') || cat.includes('30-min') || cat.includes('express')) categoryClass = 'iphone viral';
      else if (cat.includes('short') || cat.includes('reel') || cat.includes('ugc')) categoryClass = 'viral';
      else if (cat.includes('commercial') || cat.includes('ad')) categoryClass = 'commercial';
      else if (cat.includes('color') || cat.includes('grade')) categoryClass = 'grading';
      else if (cat.includes('wedding') || cat.includes('event')) categoryClass = 'wedding';

      const bgNum = (i % 6) + 1;
      const softwareTags = (c.software || []).slice(0, 3).map(s => `<span>${esc(s)}</span>`).join('');
      const nicheText = (c.niches || []).slice(0, 3).join(' · ');
      return `
        <article class="reel-card dynamic-approved-card" data-category="${categoryClass}">
          <div class="reel-media">
            <div class="reel-poster reel-bg-${bgNum}"></div>
            <div class="reel-overlay"></div>
            <span class="reel-pill">⚡ ${esc(c.turnaround || 'Same-Day Edit')}</span>
            <div class="reel-meta">
              <span class="creator-badge">✦ Verified Creator: ${esc(c.name)}</span>
              <h3>${esc(c.category)}</h3>
              <p>${esc(nicheText || c.experience + ' yrs exp · ' + c.city)}</p>
            </div>
            <button class="reel-play-btn" aria-label="Play reel preview">▶</button>
          </div>
          <div class="reel-footer">
            <div class="reel-tags">${softwareTags}</div>
            <button class="primary hire-btn" data-creator="${esc(c.name)} (${esc(c.category)})" data-category="${esc(c.category)}">Hire in 1 Tap ⚡</button>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.dynamic-approved-card').forEach(el => el.remove());
    grid.insertAdjacentHTML('afterbegin', approvedCardsHtml);
  }
  bindReelEvents();
}

window.renderShowcase = renderDynamicReels;
renderDynamicReels();

if (hireModal) {
  $('#hire-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const clientName = fd.get('client_name')?.trim();
    const clientPhone = fd.get('client_phone')?.trim();
    const clientEmail = fd.get('client_email')?.trim();
    const creator = fd.get('creator')?.trim();
    const projectType = fd.get('project_type')?.trim();
    const details = fd.get('details')?.trim();

    if (!clientName || !clientPhone || !clientEmail) {
      $('#hire-error').textContent = 'Please fill out all required contact fields.';
      return;
    }

    const leadData = {
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      creator: creator,
      project_type: projectType,
      details: details
    };

    if (window.Sihu?.submitLead) {
      window.Sihu.submitLead(leadData);
    }

    // Direct WhatsApp dispatch to +91 7989797016 with pre-formatted booking details
    const waText = `Hi Sihu Team! I want to hire ${creator} for ${projectType}.\n\n*Client Name:* ${clientName}\n*Phone:* ${clientPhone}\n*Email:* ${clientEmail}\n*Project Brief:* ${details || 'Standard Booking'}`;
    const waUrl = `https://api.whatsapp.com/send?phone=917989797016&text=${encodeURIComponent(waText)}`;

    window.open(waUrl, '_blank');
    hireModal.close();
    toast('⚡ Request received! The Sihu team is connecting with you on WhatsApp and Email.');
  });
}

// Reel Category Filters
document.querySelectorAll('.reel-filter').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.reel-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.reel-card').forEach(card => {
      const cardCat = card.dataset.category || '';
      if (filter === 'all' || cardCat === filter || cardCat.split(' ').includes(filter)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  };
});

// Entry Welcome Notification & PWA Install Manager
let deferredPrompt = null;
const notif = document.querySelector('#welcome-notification');
const pwaBtn = document.querySelector('#pwa-install-btn');
const notifClose = document.querySelector('#notif-close');
const notifExplore = document.querySelector('#notif-explore');

// Show notification upon entering the website
if (notif) {
  setTimeout(() => {
    notif.classList.add('visible');
  }, 1200);

  if (notifClose) {
    notifClose.onclick = () => notif.classList.remove('visible');
  }
  if (notifExplore) {
    notifExplore.onclick = () => notif.classList.remove('visible');
  }
}

// Service Worker Registration for PWA / WebAPK
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// PWA Install Prompt Listener
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (pwaBtn) {
    pwaBtn.style.display = 'inline-flex';
    pwaBtn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        pwaBtn.style.display = 'none';
        if (notif) notif.classList.remove('visible');
      }
      deferredPrompt = null;
    };
  }
});
