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
 if(step===0)body=`<div class="choices">${['Reel Maker','Editor','Graphic Designer','Photo Editor','Photographer','Videographer','Drone Pilot','UGC Creator'].map((x,i)=>`<button type="button" class="choice ${data.category===x?'selected':''}" data-category="${x}">${['◧','✂','🎨','📸','◎','▣','✧','✦'][i]} &nbsp; ${x}</button>`).join('')}</div>`;
 if(step===1)body=input('Full name','name','text','Your creative identity')+input('Date of birth','dob','date')+select('Gender','gender',['Female','Male','Non-binary','Prefer not to say'])+'<p style="font-size:11px;color:#9aa68b">Partner applicants must be 18 or older.</p>';
 if(step===2)body=input('Email address','email','email','you@example.com')+input('Phone number','phone','tel','+91 98765 43210');
 if(step===3)body=input('Country','country','text','India')+input('State / Province','state','text','Your state')+input('City','city','text','Your city');
 if(step===4)body='<fieldset class="software-options"><legend>Software you use *</legend><p>Select all that apply.</p><div class="choices">'+['Adobe Premiere Pro','DaVinci Resolve','Photoshop','Lightroom','Illustrator','After Effects','CapCut','Final Cut Pro','Blender','Other'].map(x=>`<label class="choice software-choice"><input type="checkbox" name="software" value="${x}" ${data.software.includes(x)?'checked':''}> <span>${x}</span></label>`).join('')+'</div></fieldset>'+input('Years of experience','experience','number','e.g. 2')+'<label>Your specialties · choose up to 5 *</label><div class="choices">'+['Thumbnails & Posters','Photo Retouching','Social media','Motion design','Weddings','Brand films','Color grading','Visual effects','Travel','Product films'].map(x=>`<button type="button" class="choice ${data.niches.includes(x)?'selected':''}" data-niche="${x}">${x}</button>`).join('')+'</div>';
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

// Reel Popup Lightbox Elements
const reelModal = $('#reel-modal');
const modalVideo = $('#reel-modal-video');
const modalImg = $('#reel-modal-img');
const modalClose = $('#reel-modal-close');
const modalMute = $('#reel-modal-mute');
const modalPill = $('#reel-modal-pill');
const modalBadge = $('#reel-modal-creator-badge');
const modalTitle = $('#reel-modal-title');
const modalDesc = $('#reel-modal-desc');
const modalTags = $('#reel-modal-tags');
const modalHireBtn = $('#reel-modal-hire-btn');
const modalProgressFill = $('#reel-modal-progress-fill');
const modalProgressBar = $('#reel-modal-progress-bar');
const tapPulse = $('#reel-modal-tap-pulse');

function showTapPulse(symbol) {
  if (!tapPulse) return;
  tapPulse.textContent = symbol;
  tapPulse.classList.add('show');
  setTimeout(() => tapPulse.classList.remove('show'), 400);
}

function closeReelModal() {
  if (!reelModal || !reelModal.open) return;
  if (modalVideo) {
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
  }
  reelModal.close();
}

function openReelModal(card) {
  if (!reelModal || !card) return;
  const videoEl = card.querySelector('.reel-video');
  const posterEl = card.querySelector('.reel-poster');
  const hireBtn = card.querySelector('.hire-btn');
  const pillEl = card.querySelector('.reel-pill');
  const badgeEl = card.querySelector('.creator-badge');
  const titleEl = card.querySelector('h3');
  const descEl = card.querySelector('p');
  const tagsEl = card.querySelector('.reel-tags');

  const creator = hireBtn?.dataset.creator || 'Verified Creator';
  const category = hireBtn?.dataset.category || 'Video Editing';
  const title = titleEl ? titleEl.textContent : '';
  const desc = descEl ? descEl.textContent : '';
  const pill = pillEl ? pillEl.textContent : '⚡ Instant Hire';
  const badge = badgeEl ? badgeEl.textContent : '✦ Verified Creator';
  const tagsHtml = tagsEl ? tagsEl.innerHTML : '';

  if (modalPill) modalPill.textContent = pill;
  if (modalBadge) modalBadge.textContent = badge;
  if (modalTitle) modalTitle.textContent = title;
  if (modalDesc) modalDesc.textContent = desc;
  if (modalTags) modalTags.innerHTML = tagsHtml;
  if (modalHireBtn) {
    modalHireBtn.dataset.creator = creator;
    modalHireBtn.dataset.category = category;
  }

  if (videoEl) {
    if (modalVideo) {
      modalVideo.style.display = 'block';
      modalVideo.src = videoEl.getAttribute('src') || 'assets/sample-reel.mp4';
      modalVideo.currentTime = 0;
      modalVideo.muted = false;
    }
    if (modalImg) modalImg.style.display = 'none';
    if (modalMute) {
      modalMute.style.display = 'flex';
      modalMute.textContent = '🔊';
      modalMute.setAttribute('aria-label', 'Mute audio');
    }
    if (modalProgressBar) modalProgressBar.style.display = 'block';

    reelModal.showModal();

    if (modalVideo) {
      const playPromise = modalVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy requires mute for initial autoplay
          modalVideo.muted = true;
          if (modalMute) {
            modalMute.textContent = '🔇';
            modalMute.setAttribute('aria-label', 'Unmute audio');
          }
          modalVideo.play().catch(err => console.log('Autoplay handled:', err));
        });
      }
    }
  } else {
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.style.display = 'none';
    }
    if (modalImg) {
      modalImg.style.display = 'block';
      let bgUrl = '';
      if (posterEl) {
        const styleBg = posterEl.style.backgroundImage || '';
        const match = styleBg.match(/url\(['"]?(.*?)['"]?\)/);
        if (match) bgUrl = match[1];
      }
      modalImg.src = bgUrl || 'assets/reel-7-thumbnail.jpg';
    }
    if (modalMute) modalMute.style.display = 'none';
    if (modalProgressBar) modalProgressBar.style.display = 'none';

    reelModal.showModal();
  }
}

// Global modal event listeners
if (reelModal) {
  if (modalClose) modalClose.onclick = closeReelModal;
  reelModal.addEventListener('cancel', closeReelModal);

  // Close when tapping outside dialog
  reelModal.onclick = e => {
    const rect = reelModal.getBoundingClientRect();
    const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
      && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
    if (!isInDialog) closeReelModal();
  };

  // Tap video to toggle play/pause
  if (modalVideo) {
    modalVideo.onclick = e => {
      e.stopPropagation();
      if (modalVideo.paused) {
        modalVideo.play();
        showTapPulse('▶');
      } else {
        modalVideo.pause();
        showTapPulse('⏸');
      }
    };

    modalVideo.ontimeupdate = () => {
      if (modalVideo.duration && modalProgressFill) {
        const pct = (modalVideo.currentTime / modalVideo.duration) * 100;
        modalProgressFill.style.width = pct + '%';
      }
    };
  }

  // Seek bar click
  if (modalProgressBar) {
    modalProgressBar.onclick = e => {
      e.stopPropagation();
      const rect = modalProgressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      if (modalVideo && modalVideo.duration) {
        modalVideo.currentTime = pos * modalVideo.duration;
      }
    };
  }

  // Audio mute/unmute toggle
  if (modalMute) {
    modalMute.onclick = e => {
      e.stopPropagation();
      if (!modalVideo) return;
      modalVideo.muted = !modalVideo.muted;
      modalMute.textContent = modalVideo.muted ? '🔇' : '🔊';
      modalMute.setAttribute('aria-label', modalVideo.muted ? 'Unmute audio' : 'Mute audio');
    };
  }

  // 1-Tap Hire directly from Popup Lightbox
  if (modalHireBtn) {
    modalHireBtn.onclick = e => {
      e.stopPropagation();
      const creator = modalHireBtn.dataset.creator || 'Verified Creator';
      const category = modalHireBtn.dataset.category || 'Video Editing';
      closeReelModal();

      if (hireModal) {
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
      }
    };
  }
}

function bindReelEvents() {
  if (hireModal) {
    $('#hire-close').onclick = () => hireModal.close();
    document.querySelectorAll('.hire-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
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

  // When client taps on video/image media card or play button, popup & play!
  document.querySelectorAll('.reel-media').forEach(media => {
    media.onclick = e => {
      const card = media.closest('.reel-card');
      if (card) openReelModal(card);
    };
  });

  document.querySelectorAll('.reel-play-btn').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const card = btn.closest('.reel-card');
      if (card) openReelModal(card);
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
      if (cat.includes('graphic') || cat.includes('design') || cat.includes('thumbnail')) categoryClass = 'graphic';
      else if (cat.includes('photo') || cat.includes('retouch') || cat.includes('lightroom')) categoryClass = 'photo';
      else if (cat.includes('iphone') || cat.includes('30-min') || cat.includes('express')) categoryClass = 'iphone viral';
      else if (cat.includes('short') || cat.includes('reel') || cat.includes('ugc')) categoryClass = 'viral';
      else if (cat.includes('commercial') || cat.includes('ad')) categoryClass = 'commercial';
      else if (cat.includes('color') || cat.includes('grade')) categoryClass = 'grading';
      else if (cat.includes('wedding') || cat.includes('event')) categoryClass = 'wedding';

      const isVideo = !categoryClass.includes('graphic') && !categoryClass.includes('photo');
      const bgNum = (i % 8) + 1;
      const softwareTags = (c.software || []).slice(0, 3).map(s => `<span>${esc(s)}</span>`).join('');
      const nicheText = (c.niches || []).slice(0, 3).join(' · ');
      return `
        <article class="reel-card dynamic-approved-card" data-category="${categoryClass}">
          <div class="reel-media">
            <div class="reel-poster reel-bg-${bgNum}"></div>
            ${isVideo ? '<video class="reel-video" src="assets/sample-reel.mp4" playsinline loop muted preload="none"></video>' : ''}
            <div class="reel-overlay"></div>
            <span class="reel-pill">⚡ ${esc(c.turnaround || 'Same-Day Edit')}</span>
            <div class="reel-meta">
              <span class="creator-badge">✦ Verified Creator: ${esc(c.name)}</span>
              <h3>${esc(c.category)}</h3>
              <p>${esc(nicheText || c.experience + ' yrs exp · ' + c.city)}</p>
            </div>
            <button class="reel-play-btn" aria-label="${isVideo ? 'Play reel preview' : 'Inspect preview'}" data-icon="${isVideo ? '▶' : '🔍'}">${isVideo ? '▶' : '🔍'}</button>
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

// Master Category Tabs & Sub-Filter Switcher
document.querySelectorAll('.service-master-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.service-master-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const group = tab.dataset.group;

    document.querySelectorAll('.sub-filters').forEach(bar => {
      bar.style.display = 'none';
      bar.classList.remove('active');
    });
    const targetBar = document.querySelector(`#filters-${group}`);
    if (targetBar) {
      targetBar.style.display = 'flex';
      targetBar.classList.add('active');
      targetBar.querySelectorAll('.reel-filter').forEach(b => b.classList.remove('active'));
      const defaultBtn = targetBar.querySelector('.reel-filter');
      if (defaultBtn) defaultBtn.classList.add('active');
    }

    document.querySelectorAll('.reel-card').forEach(card => {
      const cardCat = card.dataset.category || '';
      if (group === 'all' || cardCat.split(' ').includes(group)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  };
});

// Individual Sub-Filter Buttons
document.querySelectorAll('.reel-filter').forEach(btn => {
  btn.onclick = () => {
    const parentBar = btn.closest('.sub-filters');
    if (parentBar) {
      parentBar.querySelectorAll('.reel-filter').forEach(b => b.classList.remove('active'));
    }
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

// Quick switch to category from Services section CTAs
document.querySelectorAll('[data-switch]').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.switch;
    const masterTab = document.querySelector(`.service-master-tab[data-group="${group}"]`);
    if (masterTab) masterTab.click();
  });
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

// =======================================================
// SIHU EXPERT MARKETPLACE ENGINE (Screens 1, 2, 3)
// =======================================================

const SIHU_TEAM = [
  {
    id: 'hussain',
    name: 'Hussain',
    initial: 'H',
    role: 'Long Videos & YouTube Specialist',
    category: 'video',
    categories: ['all', 'youtube', 'reels'],
    tag: 'Video Editing',
    badge: 'Creator Specialist',
    startingPrice: 600,
    priceDisplay: 'From ₹600',
    rating: '★ 4.9 (52 orders)',
    delivery: '2 - 4 Days',
    bio: 'Specialist in creator-first high retention editing. Long videos for creators, YouTube pacing, podcast multi-cam, sound design, and viral short-form retention.',
    packages: [
      {
        name: 'Standard Reel Edit',
        time: '2 days delivery',
        revisions: '2 revisions',
        price: 800,
        desc: 'Dynamic hook, fast pacing, animated captions, color correction & sound effects.',
        features: ['9:16 Vertical Cut', 'Dynamic Subtitles', 'Sound SFX Design', '1080p / 4K Export']
      },
      {
        name: 'YouTube Video (8 to 10 min)',
        time: '4 days delivery',
        revisions: '2 revisions',
        price: 2000,
        desc: 'Full retention YouTube editing with B-roll overlays, zooms, chapter pacing & audio mastering.',
        features: ['16:9 4K Cut', 'Audio Enhancement', 'B-Roll & Graphics', 'High-CTR Pacing']
      },
      {
        name: 'Creator Long-Form Master',
        time: '5 days delivery',
        revisions: '3 revisions',
        price: 3000,
        desc: 'End-to-end long-form cut + 2 promotional viral shorts extracted from the video.',
        features: ['Complete Long Cut', '2 Free Promo Shorts', 'Soundtrack Mixing', 'Thumbnail Guidance']
      }
    ]
  },
  {
    id: 'phani',
    name: 'Phani',
    initial: 'P',
    role: 'Expert Editor & AI Content Reels',
    category: 'ai-reels',
    categories: ['all', 'ai-reels', 'reels', 'youtube'],
    tag: 'AI Reels & Expert Cut',
    badge: 'Top Rated Expert',
    startingPrice: 1000,
    priceDisplay: 'From ₹1,000',
    rating: '★ 5.0 (64 orders)',
    delivery: '2 Days',
    bio: 'Expert across all editing styles. Hyper-engaging AI content reels, avatar workflows, script-to-video, 3D motion graphics, and viral short-form systems.',
    packages: [
      {
        name: 'AI Reel (30 to 60 sec)',
        time: '2 days delivery',
        revisions: '2 revisions',
        price: 1000,
        desc: 'Cutting-edge AI visuals, synthetic voiceover sync, animated text & retention graphics.',
        features: ['AI Visual Generation', 'Voiceover Sync', 'Kinetic Typography', 'High-Viral Hook']
      },
      {
        name: 'Standard Reel Edit',
        time: '2 days delivery',
        revisions: '2 revisions',
        price: 800,
        desc: 'Cinematic color, sound design, sound synchrony, and high-energy transitions.',
        features: ['Pacing & Transitions', 'Color Grading', 'Trendy SFX', 'Instagram/YT Shorts Ready']
      },
      {
        name: 'YouTube Video (8 to 10 min)',
        time: '4 days delivery',
        revisions: '2 revisions',
        price: 2500,
        desc: 'Expert YouTube edit with custom motion elements, documentary/talking-head rhythm.',
        features: ['Multi-Cam Switching', 'Documentary Style B-roll', 'Custom Motion Graphics', 'Audio Polish']
      }
    ]
  },
  {
    id: 'sandeep',
    name: 'Sandeep',
    initial: 'S',
    role: 'Basic AI Videos & Graphic Design',
    category: 'design',
    categories: ['all', 'ai-reels', 'design', 'budget'],
    tag: 'AI Reels & Design',
    badge: 'Fast Turnaround',
    startingPrice: 200,
    priceDisplay: 'From ₹200',
    rating: '★ 4.8 (38 orders)',
    delivery: 'Same-Day - 2 Days',
    bio: 'Quick, reliable basic AI video editing for small videos, YouTube thumbnails, social media banners, and carousel graphics.',
    packages: [
      {
        name: 'Social Media Poster / Banner',
        time: '1 day delivery',
        revisions: '2 revisions',
        price: 300,
        desc: 'Clean, high-impact social media creative for Instagram, Facebook, or business promotion.',
        features: ['High-Res PNG/JPG', 'Brand Colors Match', 'Source Files', 'Fast Same-Day Turnaround']
      },
      {
        name: 'AI Reel (Small / Quick)',
        time: '2 days delivery',
        revisions: '1 revision',
        price: 500,
        desc: 'Compact AI short with automated text, voiceover, and clean image-to-video motion.',
        features: ['15-30 Sec Clip', 'Auto Subtitles', 'Background Music', 'Commercial Use']
      },
      {
        name: 'Creative Ad Creative Pack',
        time: '2 days delivery',
        revisions: '2 revisions',
        price: 800,
        desc: 'Pack of 3 converting social creatives for product campaigns or event ads.',
        features: ['3 Size Variants', 'Feed & Story Format', 'High Converting Copy Style', 'Quick Delivery']
      }
    ]
  },
  {
    id: 'prudvi',
    name: 'Prudvi',
    initial: 'P',
    role: 'Budget Video Editing',
    category: 'budget',
    categories: ['all', 'budget', 'reels'],
    tag: 'Budget Video Editing',
    badge: 'Budget Friendly',
    startingPrice: 300,
    priceDisplay: 'From ₹300',
    rating: '★ 4.8 (41 orders)',
    delivery: '1 - 2 Days',
    bio: 'Affordable, clean video editing for students, budget creators, simple vlog cuts, basic Instagram reels, and status clips.',
    packages: [
      {
        name: 'Basic Reel Edit',
        time: '1 day delivery',
        revisions: '1 revision',
        price: 300,
        desc: 'Clean cutting, basic text overlays, music sync, and clean mobile export.',
        features: ['Under 60 Seconds', 'Music Sync', 'Trim & Clean Cuts', 'Fast 24h Delivery']
      },
      {
        name: 'Simple Shorts Cut',
        time: '1 day delivery',
        revisions: '2 revisions',
        price: 450,
        desc: 'Shorts cut with basic sound effects, subtitle highlights, and aspect ratio conversion.',
        features: ['Clean Subtitles', 'Basic SFX', 'Color Boost', 'Fast Turnaround']
      },
      {
        name: 'Standard Budget Video Edit',
        time: '2 days delivery',
        revisions: '2 revisions',
        price: 500,
        desc: 'Up to 3-5 minute basic YouTube or vlog edit with title cards and audio cleanup.',
        features: ['Up to 5 Minutes', 'Basic Lower Thirds', 'Audio Leveling', '1080p Export']
      }
    ]
  },
  {
    id: 'sai',
    name: 'Sai',
    initial: 'S',
    role: 'Logos & Posters Designer',
    category: 'design',
    categories: ['all', 'design', 'budget'],
    tag: 'Graphic Design',
    badge: 'Brand Identity',
    startingPrice: 200,
    priceDisplay: 'From ₹200',
    rating: '★ 4.9 (45 orders)',
    delivery: '1 - 3 Days',
    bio: 'Professional logo designer and graphic artist. Business logos, cinematic posters, movie posters, business cards, and vector branding.',
    packages: [
      {
        name: 'Promotional / Event Poster',
        time: '1 day delivery',
        revisions: '2 revisions',
        price: 300,
        desc: 'Cinematic or commercial poster for events, business promotions, or releases.',
        features: ['High-Res Print Ready', 'Social Media Sizing', 'Modern Typography', 'Quick Delivery']
      },
      {
        name: 'Business Logo Design',
        time: '2 days delivery',
        revisions: '3 revisions',
        price: 800,
        desc: '2 unique vector logo concepts, transparent PNGs, brand icon, and color palette.',
        features: ['2 Logo Concepts', 'Vector SVG/PNG/PDF', 'Transparent Files', 'Social Media Avatar']
      },
      {
        name: 'Premium Brand Identity Pack',
        time: '3 days delivery',
        revisions: 'Unlimited',
        price: 1500,
        desc: 'Full logo suite + business card + social banners + vector source files (.AI/.EPS).',
        features: ['Full Vector Source Files', 'Business Card Design', 'Social Media Kit', 'Unlimited Revisions']
      }
    ]
  }
];

// Screen 1: Render Experts Grid
function renderMarketplaceExperts(activeFilter = 'all', searchQuery = '') {
  const grid = document.querySelector('#experts-grid');
  if (!grid) return;

  const q = (searchQuery || '').trim().toLowerCase();
  const filtered = SIHU_TEAM.filter(expert => {
    const matchesFilter = activeFilter === 'all' || expert.categories.includes(activeFilter);
    const matchesQuery = !q || (
      expert.name.toLowerCase().includes(q) ||
      expert.role.toLowerCase().includes(q) ||
      expert.tag.toLowerCase().includes(q) ||
      expert.bio.toLowerCase().includes(q) ||
      expert.packages.some(p => p.name.toLowerCase().includes(q))
    );
    return matchesFilter && matchesQuery;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: #14160f; border-radius: 16px; border: 1px dashed #343725;">
        <span style="font-size: 32px; display: block; margin-bottom: 10px;">🔍</span>
        <h3 style="color: #fff; margin: 0 0 6px;">No experts found for "${esc(searchQuery)}"</h3>
        <p style="color: #989680; font-size: 13px; margin: 0 0 16px;">Try searching for reels, youtube, AI, logo, or clear filters.</p>
        <button class="primary small" id="reset-experts-btn">Show All Experts</button>
      </div>
    `;
    const resetBtn = grid.querySelector('#reset-experts-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        const inp = document.querySelector('#expert-search-input');
        if (inp) inp.value = '';
        const clr = document.querySelector('#search-clear-btn');
        if (clr) clr.style.display = 'none';
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
        renderMarketplaceExperts('all', '');
      };
    }
    return;
  }

  grid.innerHTML = filtered.map(expert => `
    <article class="expert-card" data-expert-id="${expert.id}">
      <div>
        <div class="expert-card-header">
          <div class="expert-avatar-circle">${expert.initial}</div>
          <div class="expert-card-meta">
            <h3>${esc(expert.name)} <span class="verified-tag">✦ Verified</span></h3>
            <p class="expert-role">${esc(expert.role)}</p>
          </div>
        </div>

        <div class="expert-badges-row">
          <span class="expert-pill speed">⚡ ${esc(expert.delivery)}</span>
          <span class="expert-pill rating">${esc(expert.rating)}</span>
          <span class="expert-pill">${esc(expert.tag)}</span>
        </div>

        <p class="expert-bio-snippet">${esc(expert.bio)}</p>
      </div>

      <div class="expert-card-footer">
        <div class="expert-price-box">
          <small>Starting from</small>
          <strong>${esc(expert.priceDisplay)}</strong>
        </div>
        <button type="button" class="view-packages-btn" data-expert-id="${expert.id}">View Packages ↗</button>
      </div>
    </article>
  `).join('');

  // Attach click listeners to cards
  grid.querySelectorAll('.expert-card').forEach(card => {
    card.onclick = () => {
      const id = card.dataset.expertId;
      openExpertProfile(id);
    };
  });
}

// Search & Filter event handlers
const searchInput = document.querySelector('#expert-search-input');
const searchClearBtn = document.querySelector('#search-clear-btn');
let currentFilter = 'all';

if (searchInput) {
  searchInput.addEventListener('input', e => {
    const val = e.target.value;
    if (searchClearBtn) searchClearBtn.style.display = val ? 'inline-block' : 'none';
    renderMarketplaceExperts(currentFilter, val);
  });
}

if (searchClearBtn) {
  searchClearBtn.onclick = () => {
    if (searchInput) searchInput.value = '';
    searchClearBtn.style.display = 'none';
    renderMarketplaceExperts(currentFilter, '');
  };
}

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.onclick = () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter || 'all';
    renderMarketplaceExperts(currentFilter, searchInput ? searchInput.value : '');
  };
});

// Screen 2: Open Editor Profile Modal
const profileModal = document.querySelector('#expert-profile-modal');
const profileCloseBtn = document.querySelector('#expert-profile-close');

if (profileCloseBtn && profileModal) {
  profileCloseBtn.onclick = () => profileModal.close();
}

function openExpertProfile(expertId) {
  const expert = SIHU_TEAM.find(e => e.id === expertId);
  if (!expert || !profileModal) return;

  $('#profile-modal-avatar').textContent = expert.initial;
  $('#profile-modal-name').textContent = expert.name;
  $('#profile-modal-role').textContent = expert.role;
  $('#profile-modal-delivery').textContent = `⚡ ${expert.delivery} Delivery`;
  $('#profile-modal-rating').textContent = expert.rating;
  $('#profile-modal-badge').textContent = `✦ ${expert.badge}`;
  $('#profile-modal-bio').textContent = expert.bio;

  const packagesGrid = $('#profile-packages-grid');
  packagesGrid.innerHTML = expert.packages.map((pkg, idx) => `
    <div class="package-card">
      <div class="package-card-header">
        <h4>${esc(pkg.name)}</h4>
        <span class="package-timing">⚡ ${esc(pkg.time)} · ${esc(pkg.revisions)}</span>
        <div class="package-price">₹${pkg.price.toLocaleString()}</div>
        <p class="package-desc">${esc(pkg.desc)}</p>
        <ul class="package-features">
          ${pkg.features.map(f => `<li>${esc(f)}</li>`).join('')}
        </ul>
      </div>
      <button type="button" class="primary package-order-btn" data-expert-id="${expert.id}" data-pkg-idx="${idx}">
        Order this package ⚡
      </button>
    </div>
  `).join('');

  // Wire up "Order this package"
  packagesGrid.querySelectorAll('.package-order-btn').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const expId = btn.dataset.expertId;
      const pkgIdx = parseInt(btn.dataset.pkgIdx, 10);
      profileModal.close();
      openOrderCheckout(expId, pkgIdx);
    };
  });

  profileModal.showModal();
}

// Screen 3: Order Checkout & Live Tracker
const orderModal = document.querySelector('#order-status-modal');
const orderModalClose = document.querySelector('#order-modal-close');
const orderCheckoutView = document.querySelector('#order-checkout-view');
const orderTrackerView = document.querySelector('#order-tracker-view');
const orderForm = document.querySelector('#order-checkout-form');
const copyUpiBtn = document.querySelector('#copy-upi-btn');

if (orderModalClose && orderModal) {
  orderModalClose.onclick = () => orderModal.close();
}

if (copyUpiBtn) {
  copyUpiBtn.onclick = () => {
    navigator.clipboard.writeText('7989797016@ybl').then(() => {
      copyUpiBtn.textContent = 'Copied! ✓';
      setTimeout(() => copyUpiBtn.textContent = 'Copy', 2000);
    }).catch(() => {});
  };
}

function openOrderCheckout(expertId, pkgIndex) {
  const expert = SIHU_TEAM.find(e => e.id === expertId);
  if (!expert || !orderModal) return;
  const pkg = expert.packages[pkgIndex];
  if (!pkg) return;

  $('#order-checkout-view').style.display = 'block';
  $('#order-tracker-view').style.display = 'none';

  $('#checkout-package-name').textContent = pkg.name;
  $('#checkout-expert-name').textContent = `${expert.name} (${expert.tag})`;
  $('#checkout-delivery-time').textContent = `${pkg.time} · ${pkg.revisions}`;
  $('#checkout-total-price').textContent = `₹${pkg.price.toLocaleString()}`;

  $('#order-expert-id').value = expert.id;
  $('#order-package-title').value = pkg.name;
  $('#order-package-price').value = pkg.price;
  $('#checkout-error').textContent = '';

  orderModal.showModal();
}

if (orderForm) {
  orderForm.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(orderForm);
    const clientName = fd.get('client_name')?.trim();
    const clientPhone = fd.get('client_phone')?.trim();
    const clientEmail = fd.get('client_email')?.trim();
    const brief = fd.get('project_brief')?.trim();
    const expertId = fd.get('expert_id');
    const packageName = fd.get('package_name');
    const packagePrice = fd.get('package_price');

    if (!clientName || !clientPhone || !clientEmail || !brief) {
      $('#checkout-error').textContent = 'Please fill out all required fields.';
      return;
    }

    const expert = SIHU_TEAM.find(e => e.id === expertId) || SIHU_TEAM[0];
    const orderId = 'SIHU-ORD-' + Math.floor(1000 + Math.random() * 9000);
    const orderData = {
      orderId,
      clientName,
      clientPhone,
      clientEmail,
      brief,
      expertId: expert.id,
      expertName: expert.name,
      packageName,
      packagePrice: parseInt(packagePrice, 10),
      delivery: expert.delivery,
      status: 'advance_payment',
      createdAt: new Date().toISOString()
    };

    // Save in LocalStorage
    try {
      localStorage.setItem('sihu_active_order', JSON.stringify(orderData));
      const allOrders = JSON.parse(localStorage.getItem('sihu_all_orders') || '[]');
      allOrders.unshift(orderData);
      localStorage.setItem('sihu_all_orders', JSON.stringify(allOrders));
    } catch {}

    // Dispatch lead to InsForge backend if available
    if (window.Sihu?.submitLead) {
      window.Sihu.submitLead({
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        creator: `${expert.name} [${orderId}]`,
        project_type: packageName,
        details: `[ORDER: ₹${packagePrice}] ${brief}`
      });
    }

    // Prepare WhatsApp URL for Advance Payment confirmation
    const waText = `Hi Sihu Team! I placed Order *#${orderId}* on SIHU.\n\n*Expert:* ${expert.name}\n*Package:* ${packageName}\n*Total:* ₹${packagePrice}\n*Client Name:* ${clientName}\n*Phone:* ${clientPhone}\n*Brief:* ${brief}\n\nI am sending the advance payment via UPI to 7989797016@ybl. Please confirm my order!`;
    const waUrl = `https://api.whatsapp.com/send?phone=917989797016&text=${encodeURIComponent(waText)}`;

    // Render Live Progress Tracker (Screen 3)
    renderOrderTracker(orderData, waUrl);

    // Open WhatsApp
    window.open(waUrl, '_blank');
  });
}

function renderOrderTracker(order, customWaUrl = null) {
  $('#order-checkout-view').style.display = 'none';
  $('#order-tracker-view').style.display = 'block';

  $('#tracker-order-id').textContent = '#' + (order.orderId || 'SIHU-ORD-8491');
  $('#tracker-package-title').textContent = order.packageName || 'Standard Reel Edit';
  $('#tracker-expert-name').textContent = order.expertName || 'Assigned Expert';
  $('#tracker-delivery').textContent = order.delivery || '2 Days';
  $('#tracker-price').textContent = '₹' + (order.packagePrice || 800).toLocaleString();

  const waUrl = customWaUrl || `https://api.whatsapp.com/send?phone=917989797016&text=${encodeURIComponent('Hi Sihu Team! Checking status for Order #' + order.orderId + ' (' + order.expertName + ' - ' + order.packageName + ')')}`;
  $('#tracker-wa-btn').setAttribute('href', waUrl);

  const conn1 = $('#conn-1');
  const conn2 = $('#conn-2');
  const conn3 = $('#conn-3');
  const step2 = $('#step-2');
  const step3 = $('#step-3');
  const step4 = $('#step-4');

  // Reset steps
  step2.className = 'timeline-step';
  step3.className = 'timeline-step';
  step4.className = 'timeline-step';
  conn1.className = 'timeline-connector';
  conn2.className = 'timeline-connector';
  conn3.className = 'timeline-connector';

  if (order.status === 'editing') {
    $('#tracker-status-tag').textContent = 'Editing in Progress';
    $('#tracker-status-tag').style.color = '#ffd500';
    conn1.className = 'timeline-connector done';
    conn2.className = 'timeline-connector done';
    step2.className = 'timeline-step step-done';
    step2.querySelector('.timeline-node').textContent = '✓';
    step3.className = 'timeline-step step-active';
  } else if (order.status === 'delivered') {
    $('#tracker-status-tag').textContent = 'Delivered ✓';
    $('#tracker-status-tag').style.color = '#25d366';
    conn1.className = 'timeline-connector done';
    conn2.className = 'timeline-connector done';
    conn3.className = 'timeline-connector done';
    step2.className = 'timeline-step step-done';
    step2.querySelector('.timeline-node').textContent = '✓';
    step3.className = 'timeline-step step-done';
    step3.querySelector('.timeline-node').textContent = '✓';
    step4.className = 'timeline-step step-done';
    step4.querySelector('.timeline-node').textContent = '✓';
  } else {
    // Advance payment
    $('#tracker-status-tag').textContent = 'Advance Payment (UPI)';
    $('#tracker-status-tag').style.color = '#38bdf8';
    conn1.className = 'timeline-connector done';
    step2.className = 'timeline-step step-active';
  }

  orderModal.showModal();
}

// Nav "Track Order 📦" click
const navTrackOrder = document.querySelector('#nav-track-order');
if (navTrackOrder) {
  navTrackOrder.onclick = e => {
    e.preventDefault();
    let activeOrder = null;
    try {
      activeOrder = JSON.parse(localStorage.getItem('sihu_active_order'));
    } catch {}

    if (activeOrder) {
      renderOrderTracker(activeOrder);
    } else {
      // Default sample order tracking demo
      renderOrderTracker({
        orderId: 'SIHU-ORD-8491',
        packageName: 'Standard Reel Edit',
        expertName: 'Phani (AI Reels Expert)',
        delivery: '2 Days Delivery',
        packagePrice: 800,
        status: 'advance_payment'
      });
    }
  };
}

// Lookup by Order ID / Phone
const lookupBtn = document.querySelector('#lookup-order-btn');
const lookupInput = document.querySelector('#lookup-order-input');
if (lookupBtn && lookupInput) {
  lookupBtn.onclick = () => {
    const val = lookupInput.value.trim().toLowerCase();
    if (!val) return;
    try {
      const allOrders = JSON.parse(localStorage.getItem('sihu_all_orders') || '[]');
      const found = allOrders.find(o =>
        (o.orderId && o.orderId.toLowerCase().includes(val)) ||
        (o.clientPhone && o.clientPhone.includes(val))
      );
      if (found) {
        renderOrderTracker(found);
      } else {
        toast('Order not found. Check Order ID or phone number.');
      }
    } catch {
      toast('Order not found.');
    }
  };
}

// "Book Another Expert" button inside tracker
const trackerNewOrderBtn = document.querySelector('#tracker-new-order-btn');
if (trackerNewOrderBtn) {
  trackerNewOrderBtn.onclick = () => {
    orderModal.close();
    const expertsSec = document.querySelector('#experts');
    if (expertsSec) expertsSec.scrollIntoView({ behavior: 'smooth' });
  };
}

// Initial Marketplace Render on load
renderMarketplaceExperts('all', '');
