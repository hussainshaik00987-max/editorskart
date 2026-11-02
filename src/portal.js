import { createClient } from '@insforge/sdk';

// Public API origin only. No admin credentials or anonymous API keys ship to the browser.
const client = createClient({ baseUrl: 'https://wkcvga5c.ap-southeast.insforge.app' });
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portal = document.createElement('dialog');
portal.id = 'account-portal';
portal.innerHTML = '<div class="modal-top"><a class="brand" id="portal-brand" href="#">✦ <b>sihu<span>account</span></b></a><button class="quiet" id="portal-close" aria-label="Close">✕</button></div><div class="portal-content"><div id="portal-view"></div><p id="portal-error" role="alert"></p></div>';
document.body.append(portal);
const view = portal.querySelector('#portal-view');
const errorBox = portal.querySelector('#portal-error');
const portalBrand = portal.querySelector('#portal-brand');

let currentMode = 'account'; // 'account' or 'admin'
let adminTab = 'applications'; // 'applications' or 'leads'
let pendingApplication = null;
let email = '';
let queuePage = 0;
let queueFilter = 'pending';
const pageSize = 10;
const columns = 'id,user_id,email,profile,status,created_at,reviewed_at,review_note';

portal.querySelector('#portal-close').onclick = () => portal.close();
function error(e) { errorBox.textContent = e?.message || 'Something went wrong. Please try again.'; }
async function run(button, task) {
  errorBox.textContent = '';
  if (button) button.disabled = true;
  try { await task(); } catch (e) { error(e); }
  finally { if (button?.isConnected) button.disabled = false; }
}
async function rpc(name, args) {
  const { data, error } = await client.database.rpc(name, args);
  if (error) throw error;
  return data;
}

function updateBrand() {
  if (currentMode === 'admin') {
    portalBrand.innerHTML = '✦ <b>sihu<span class="admin-tag">admin</span></b>';
  } else {
    portalBrand.innerHTML = '✦ <b>sihu<span>account</span></b>';
  }
}

function heading(title, copy, eyebrow = null) {
  const eb = eyebrow || (currentMode === 'admin' ? 'SIHU ADMIN' : 'SIHU ACCOUNT');
  return `<div class="eyebrow">${eb}</div><h2>${title}</h2><p>${copy}</p>`;
}

// Helper for creator package presets
function getDefaultPackages(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('graphic') || c.includes('design') || c.includes('logo') || c.includes('poster')) {
    return [
      { name: 'Social Media Poster / Creative', time: '1 day delivery', revisions: '2 revisions', price: 300, desc: 'High-converting social poster for promotions.', features: ['High-Res PNG/JPG', 'Brand Colors Match'] },
      { name: 'Business Logo Design', time: '2 days delivery', revisions: '3 revisions', price: 800, desc: '2 unique vector logo concepts.', features: ['2 Concepts', 'Vector SVG/PNG', 'Social Avatar'] },
      { name: 'Complete Brand Identity Pack', time: '3 days delivery', revisions: 'Unlimited', price: 1500, desc: 'Full logo suite & brand assets.', features: ['Vector Source Files', 'Business Card'] }
    ];
  } else if (c.includes('photo') || c.includes('retouch') || c.includes('lightroom')) {
    return [
      { name: 'Photo Retouch & Color Grade', time: '1 day delivery', revisions: '2 revisions', price: 300, desc: 'Lighting balance & skin tone correction.', features: ['High-Res Export', 'Color LUTs'] },
      { name: 'Portrait & Beauty Retouch', time: '2 days delivery', revisions: '2 revisions', price: 600, desc: 'Frequency separation & texture cleanup.', features: ['Skin Texture Intact', 'Clean Finish'] },
      { name: 'Product Photo Pack (5 Shots)', time: '3 days delivery', revisions: '3 revisions', price: 1200, desc: 'Clean e-commerce product edits.', features: ['5 Product Shots', 'White Background'] }
    ];
  } else {
    return [
      { name: 'Standard Reel Edit', time: '2 days delivery', revisions: '2 revisions', price: 800, desc: 'Dynamic pacing, animated captions, color correction & SFX.', features: ['9:16 Cut', 'Captions', 'SFX'] },
      { name: 'YouTube Video Edit (8 to 10 min)', time: '4 days delivery', revisions: '2 revisions', price: 2000, desc: 'Full retention YouTube editing with B-rolls.', features: ['16:9 4K Cut', 'B-Roll & Graphics'] },
      { name: 'Commercial Brand Master Cut', time: '5 days delivery', revisions: '3 revisions', price: 3000, desc: 'End-to-end cinematic edit with master audio.', features: ['Cinematic Color', 'Audio Master'] }
    ];
  }
}

// Helper to save creator profile locally and sync with marketplace
function saveCreatorProfile(profile) {
  try {
    localStorage.setItem('sihu_creator_profile', JSON.stringify(profile));
    
    // Update or insert into sihu_approved_creators
    let approved = [];
    try {
      approved = JSON.parse(localStorage.getItem('sihu_approved_creators') || '[]');
    } catch {}
    
    const profileId = profile.id || ('creator-' + (profile.name || 'creator').toLowerCase().replace(/[^a-z0-9]/g, '-'));
    profile.id = profileId;
    
    const existingIndex = approved.findIndex(c => 
      c.id === profileId || 
      (c.name && profile.name && c.name.trim().toLowerCase() === profile.name.trim().toLowerCase())
    );
    
    if (existingIndex >= 0) {
      approved[existingIndex] = { ...approved[existingIndex], ...profile };
    } else {
      approved.unshift(profile);
    }
    
    localStorage.setItem('sihu_approved_creators', JSON.stringify(approved));
    
    // Notify home page marketplace to re-render immediately
    if (window.renderMarketplace) {
      window.renderMarketplace();
    }
    return true;
  } catch (err) {
    console.error('Failed to save creator profile:', err);
    return false;
  }
}

// Helper to get all approved creators from storage or DB
async function getApprovedCreators() {
  let approved = [];
  try {
    const { data: rows } = await client.database.from('sihu_applications').select(columns).eq('status', 'approved');
    if (rows && rows.length) {
      approved = rows.map(r => ({
        id: r.id,
        user_id: r.user_id,
        name: r.profile?.name || 'Verified Creator',
        category: r.profile?.category || 'Video Editor',
        software: Array.isArray(r.profile?.software) ? r.profile.software : [],
        niches: Array.isArray(r.profile?.niches) ? r.profile.niches : [],
        experience: r.profile?.experience || '1',
        city: r.profile?.city || 'India',
        portfolio: r.profile?.portfolio || '',
        instagram: r.profile?.instagram || '',
        bio: r.profile?.bio || '',
        packages: r.profile?.packages || getDefaultPackages(r.profile?.category),
        turnaround: (r.profile?.category === 'Reel Maker') ? '30-Min Delivery' : 'Same-Day Edit'
      }));
      localStorage.setItem('sihu_approved_creators', JSON.stringify(approved));
      return approved;
    }
  } catch (e) {}

  try {
    approved = JSON.parse(localStorage.getItem('sihu_approved_creators') || '[]');
  } catch {}
  return approved;
}

// View: Sign In Screen
function signIn() {
  updateBrand();
  const title = currentMode === 'admin' ? 'Admin authentication.' : 'Sign in to Creator Portal.';
  const copy = currentMode === 'admin'
    ? 'Enter your registered administrator email to access the application review queue and order management.'
    : (pendingApplication ? 'Verify the email on your application to send it for review.' : 'Enter your email to receive a one-time login code, or set up your creator profile directly below.');

  let savedProfile = null;
  try {
    savedProfile = JSON.parse(localStorage.getItem('sihu_creator_profile') || 'null');
  } catch {}

  let savedProfileBanner = '';
  if (savedProfile && savedProfile.name) {
    savedProfileBanner = `
      <div style="background:#ffffff; border:1px solid var(--line); border-left:4px solid var(--red); border-radius:var(--radius-md); padding:16px 20px; margin-bottom:20px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <strong style="font-size:15px; color:var(--text-primary); font-family:var(--font-display);">✦ Creator Profile: ${escape(savedProfile.name)}</strong>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${escape(savedProfile.category || 'Creator')} · Live on Sihu Marketplace</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="primary small-btn" id="open-saved-profile-btn" style="padding:6px 14px; font-size:12px;">View Profile &amp; About Section →</button>
            <button type="button" class="quiet" id="edit-saved-profile-btn" style="padding:6px 10px; font-size:12px;">✏️ Edit</button>
          </div>
        </div>
      </div>
    `;
  }

  view.innerHTML = heading(title, copy) +
    savedProfileBanner +
    `<form id="email-form">
      <label>Email address
        <input type="email" name="email" autocomplete="email" value="${escape(pendingApplication?.email || email)}" ${pendingApplication ? 'readonly' : ''} placeholder="${currentMode === 'admin' ? 'admin@example.com' : 'you@example.com'}" required>
      </label>
      <button class="primary" type="submit">Send sign-in code →</button>
    </form>` +
    (currentMode === 'admin' 
      ? '<p class="admin-note"><small>Protected interface · Requires an authorized administrator account.</small></p>' 
      : `<div style="text-align:center; margin-top:20px; padding-top:16px; border-top:1px dashed var(--line); display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
          <button type="button" class="quiet" id="add-profile-direct-btn" style="color:var(--red); font-weight:700; font-size:13px;">⚡ Add / Set Up Creator Profile Directly</button>
          <button type="button" class="quiet" id="open-apply-flow-btn" style="color:var(--text-secondary); font-size:13px;">Apply via Guided Steps →</button>
         </div>`);

  if (view.querySelector('#open-saved-profile-btn')) {
    view.querySelector('#open-saved-profile-btn').onclick = () => renderCreatorDashboard(savedProfile, null, false);
  }
  if (view.querySelector('#edit-saved-profile-btn')) {
    view.querySelector('#edit-saved-profile-btn').onclick = () => renderCreatorProfileEditor(savedProfile, false, false);
  }
  if (view.querySelector('#add-profile-direct-btn')) {
    view.querySelector('#add-profile-direct-btn').onclick = () => renderCreatorProfileEditor(savedProfile || null, !savedProfile, false);
  }
  if (view.querySelector('#open-apply-flow-btn')) {
    view.querySelector('#open-apply-flow-btn').onclick = () => {
      portal.close();
      const applyBtn = document.querySelector('.apply');
      if (applyBtn) applyBtn.click();
    };
  }

  view.querySelector('#email-form').onsubmit = e => {
    e.preventDefault();
    const button = e.submitter;
    email = new FormData(e.currentTarget).get('email').trim().toLowerCase();
    run(button, async () => {
      const result = await client.auth.signInWithOtp({ email });
      if (result.error) throw result.error;
      verify();
    });
  };
}

function verify() {
  updateBrand();
  view.innerHTML = heading('Check your inbox.', `Enter the six-digit code sent to ${escape(email)}. It expires in five minutes.`) +
    '<form id="code-form"><label>Verification code<input name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" required></label><button class="primary" type="submit">Verify & continue →</button></form><button class="quiet" id="resend">Request another code</button>';
  view.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const otp = new FormData(e.currentTarget).get('otp');
    run(e.submitter, async () => {
      const result = await client.auth.verifyOtp({ email, otp, ...(pendingApplication?.name ? { name: pendingApplication.name } : {}) });
      if (result.error) throw result.error;
      if (currentMode === 'admin') {
        await loadAdmin();
      } else {
        await loadAccount();
      }
    });
  };
  view.querySelector('#resend').onclick = signIn;
}

function sessionControls(isAdmin = false) {
  const row = document.createElement('div'); row.className = 'portal-controls';
  row.style.marginTop = '24px';
  row.style.paddingTop = '16px';
  row.style.borderTop = '1px solid var(--line)';
  row.innerHTML = `<button class="quiet" id="refresh-account">↻ Refresh</button>${isAdmin ? '<button class="quiet" id="switch-admin-portal">Admin Queue ✦</button>' : ''}<button class="quiet" id="sign-out">Sign out</button>`;
  view.append(row);
  row.querySelector('#refresh-account').onclick = e => run(e.currentTarget, currentMode === 'admin' ? loadAdmin : loadAccount);
  if (isAdmin && row.querySelector('#switch-admin-portal')) {
    row.querySelector('#switch-admin-portal').onclick = () => openAdminPortal();
  }
  row.querySelector('#sign-out').onclick = e => run(e.currentTarget, async () => {
    try { await client.auth.signOut(); } catch {}
    pendingApplication = null; email = ''; signIn();
  });
}

// Render Creator Profile Dashboard with About Section, Live Card Preview, Packages, and Assigned Projects
function renderCreatorDashboard(profile, application = null, isAdmin = false) {
  updateBrand();
  const name = profile.name || 'Creator';
  const initial = (name.trim() || 'C').charAt(0).toUpperCase();
  const category = profile.category || 'Video Editor';
  const packages = (Array.isArray(profile.packages) && profile.packages.length) ? profile.packages : getDefaultPackages(category);
  const minPrice = Math.min(...packages.map(p => Number(p.price) || 500));
  const myName = name.trim().toLowerCase();
  const creatorId = profile.id || ('creator-' + myName.replace(/[^a-z0-9]/g, '-'));

  // Read assigned projects (strictly sanitized: NO client contact info)
  let assignedProjects = [];
  try {
    const allLeads = JSON.parse(localStorage.getItem('sihu_client_leads') || '[]');
    assignedProjects = allLeads.filter(l => {
      const assignedName = (l.assigned_creator_name || '').trim().toLowerCase();
      const expertName = (l.expert_name || '').trim().toLowerCase();
      const creatorField = (l.creator || '').trim().toLowerCase();
      return (
        (application && l.assigned_creator_id === application.id) ||
        (assignedName && (assignedName === myName || myName.includes(assignedName) || assignedName.includes(myName))) ||
        (l.status === 'assigned' && expertName && (expertName === myName || myName.includes(expertName))) ||
        (l.status === 'assigned' && creatorField && creatorField.includes(myName))
      );
    });
  } catch {}

  // 1. Header with Avatar & Live Status
  const headerHtml = `
    <div class="creator-profile-header">
      <div class="creator-header-meta">
        <div class="creator-avatar-badge">${initial}</div>
        <div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h2 style="margin:0; font-size:22px; font-family:var(--font-display);">${escape(name)}</h2>
            <span class="status-pill approved" style="font-size:11px; padding:3px 10px;">● Live on Sihu Marketplace</span>
          </div>
          <div style="font-size:13px; color:var(--text-secondary); margin-top:3px;">
            ${escape(category)} · ${(profile.niches || []).slice(0, 2).join(', ') || 'Specialist'} · ★ 5.0 (Verified)
          </div>
        </div>
      </div>
      <div style="display:flex; gap:10px;">
        <button type="button" class="primary small-btn" id="open-edit-profile-btn" style="padding:8px 16px; font-size:13px;">✏️ Edit Profile &amp; Bio</button>
      </div>
    </div>
  `;

  // 2. About Section
  const aboutHtml = `
    <div class="creator-about-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h4>✦ ABOUT ME &amp; CREATIVE BIO</h4>
        </div>
        <span class="creator-chip highlight" style="font-size:11px;">🚀 ${escape(profile.turnaround || '1 - 2 Days Turnaround')}</span>
      </div>
      <p class="creator-bio-text">${escape(profile.bio || 'Passionate visual creator delivering high-retention cinematic edits and modern storytelling.')}</p>
      
      <div class="creator-details-chips">
        <span class="creator-chip">📍 ${escape(profile.city || 'India')}</span>
        <span class="creator-chip">⏳ ${escape(profile.experience || '1')} Years Exp</span>
        ${(profile.software || ['Adobe Premiere Pro', 'DaVinci Resolve']).map(s => `<span class="creator-chip">⚡ ${escape(s)}</span>`).join('')}
        ${(profile.niches || ['Social media', 'Motion design']).map(n => `<span class="creator-chip">✦ ${escape(n)}</span>`).join('')}
      </div>

      <div class="creator-links-row">
        ${profile.portfolio ? `<a href="${escape(profile.portfolio)}" target="_blank" rel="noopener noreferrer" class="creator-link-pill"><span>🌐</span> Open Portfolio Website / Drive ↗</a>` : ''}
        ${profile.instagram ? `<a href="https://instagram.com/${escape(profile.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener noreferrer" class="creator-link-pill"><span>📸</span> Instagram @${escape(profile.instagram.replace(/^@/, ''))} ↗</a>` : ''}
        <button type="button" class="creator-link-pill" id="about-edit-shortcut-btn" style="background:#ffffff; color:var(--text-primary); cursor:pointer;"><span>✏️</span> Edit Profile Details</button>
      </div>
    </div>
  `;

  // 3. Live Marketplace Card Preview Box
  const previewHtml = `
    <div class="live-card-preview-box">
      <div class="live-preview-header">
        <h4>✦ HOW CLIENTS SEE YOU ON SIHU MARKETPLACE</h4>
        <button type="button" class="primary small-btn" id="spotlight-marketplace-btn" style="padding:6px 14px; font-size:12px;">View My Card on Marketplace ⚡</button>
      </div>
      <div class="live-card-compact">
        <div class="creator-avatar-badge" style="width:48px; height:48px; font-size:20px;">${initial}</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <strong style="font-size:16px; color:var(--text-primary); font-family:var(--font-display);">${escape(name)}</strong>
            <span style="font-size:15px; font-weight:800; color:var(--red); font-family:var(--font-display);">From ₹${minPrice.toLocaleString()}</span>
          </div>
          <div style="font-size:12px; color:var(--text-secondary); margin:2px 0 6px;">
            ${escape(category)} · ${(profile.niches || []).slice(0, 2).join(', ') || 'Specialist'} · ★ 5.0 (Verified)
          </div>
          <p style="font-size:13px; color:var(--text-primary); margin:0 0 8px; line-height:1.4;">
            ${escape((profile.bio || '').slice(0, 110))}${profile.bio && profile.bio.length > 110 ? '...' : ''}
          </p>
          <div style="display:flex; gap:8px; font-size:11px; flex-wrap:wrap;">
            <span class="creator-chip highlight" style="font-size:11px; padding:2px 9px;">${escape(profile.turnaround || '1 - 2 Days')}</span>
            ${profile.portfolio ? `<span class="creator-chip" style="font-size:11px; padding:2px 9px;">🌐 Portfolio Linked</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // 4. Packages Box
  const packagesHtml = `
    <div class="creator-about-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h4>✦ YOUR LIVE MARKETPLACE PACKAGES</h4>
          <small style="color:var(--text-muted);">Clients see these pricing packages directly on your profile card</small>
        </div>
        <button type="button" class="quiet" id="packages-edit-shortcut-btn" style="font-size:12px; color:var(--red); font-weight:700;">Edit Package Prices ✏️</button>
      </div>
      <div class="packages-edit-grid">
        ${packages.map(pkg => `
          <div class="package-edit-item" style="background:#ffffff; border:1px solid var(--line); border-radius:var(--radius-sm); padding:14px;">
            <strong style="display:block; font-size:14px; color:var(--text-primary); margin-bottom:4px; font-family:var(--font-display);">${escape(pkg.name)}</strong>
            <div style="color:var(--red); font-size:18px; font-weight:800; font-family:var(--font-display); margin-bottom:4px;">₹${(Number(pkg.price) || 800).toLocaleString()}</div>
            <small style="color:var(--text-secondary); font-size:11px; display:block; margin-bottom:6px;">${escape(pkg.time || '1-2 Days')} · ${escape(pkg.revisions || '2 Revisions')}</small>
            <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.3;">${escape(pkg.desc || '')}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // 5. Assigned Projects Section
  let projectsHtml = '';
  if (assignedProjects.length) {
    projectsHtml = `
      <div class="creator-about-card" style="border-left:4px solid var(--red);">
        <h4>⚡ PROJECTS ASSIGNED TO YOU (${assignedProjects.length})</h4>
        <p style="font-size:12px; color:var(--text-muted); margin:0 0 14px;">🔒 Escrow Protected: Sihu Team coordinates client communication and payment milestones. Direct client contacts are kept private.</p>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${assignedProjects.map(p => `
            <div style="background:#faf8f5; border:1px solid var(--line); border-radius:var(--radius-sm); padding:14px 16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
                <div>
                  <span class="status-pill approved" style="margin-right:6px; font-size:10px; padding:2px 8px;">${p.order_id ? '#' + escape(p.order_id) : 'Assigned'}</span>
                  <strong style="font-size:14px; color:var(--text-primary); font-family:var(--font-display);">${escape(p.project_type || p.package_name || 'Project Deliverable')}</strong>
                </div>
                <span class="status-pill approved" style="font-size:10px; padding:2px 8px;">In Progress</span>
              </div>
              <p style="font-size:13px; margin:4px 0 6px;"><strong>Package &amp; Escrow:</strong> <span style="color:var(--red); font-weight:700;">₹${escape(p.package_price || 'Standard Escrow')}</span> · Delivery: ${escape(p.delivery || '2-4 Days')}</p>
              <p style="font-size:13px; margin:4px 0 8px; color:var(--text-secondary);"><strong>Client Brief:</strong> ${escape(p.details || p.brief || 'Standard deliverable required')}</p>
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">Assigned on: ${new Date(p.assigned_at || p.timestamp || Date.now()).toLocaleDateString()}</div>
              <a href="https://api.whatsapp.com/send?phone=917989797016&text=${encodeURIComponent('Hi Sihu Team, I am ' + name + ' working on assigned order ' + (p.order_id ? '#' + p.order_id : '') + ' (' + (p.project_type || p.package_name || '') + '). I have an update.')}" target="_blank" class="primary small-btn" style="padding:6px 14px; font-size:12px; text-decoration:none; display:inline-block;">Update Sihu Manager on WhatsApp ⚡</a>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    projectsHtml = `
      <div class="creator-about-card">
        <h4>⚡ ASSIGNED PROJECTS</h4>
        <p style="font-size:13px; color:var(--text-secondary); margin:0;">No active project orders assigned yet. When clients book you on Sihu and admin assigns the project, it appears right here in your dashboard.</p>
      </div>
    `;
  }

  // 6. Edit Profile Form Container (hidden by default)
  const editContainerHtml = `
    <div id="inline-editor-slot" style="display:none;"></div>
  `;

  view.innerHTML = `
    <div class="creator-profile-dashboard">
      ${headerHtml}
      ${editContainerHtml}
      ${aboutHtml}
      ${previewHtml}
      ${packagesHtml}
      ${projectsHtml}
    </div>
  `;

  // Hook actions
  const editorSlot = view.querySelector('#inline-editor-slot');
  const toggleEditor = () => {
    if (editorSlot.style.display === 'none') {
      editorSlot.style.display = 'block';
      editorSlot.innerHTML = getProfileEditorHtml(profile, false);
      bindProfileEditorEvents(editorSlot, profile, isAdmin);
      editorSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      editorSlot.style.display = 'none';
      editorSlot.innerHTML = '';
    }
  };

  if (view.querySelector('#open-edit-profile-btn')) view.querySelector('#open-edit-profile-btn').onclick = toggleEditor;
  if (view.querySelector('#about-edit-shortcut-btn')) view.querySelector('#about-edit-shortcut-btn').onclick = toggleEditor;
  if (view.querySelector('#packages-edit-shortcut-btn')) view.querySelector('#packages-edit-shortcut-btn').onclick = toggleEditor;

  if (view.querySelector('#spotlight-marketplace-btn')) {
    view.querySelector('#spotlight-marketplace-btn').onclick = () => {
      portal.close();
      setTimeout(() => {
        const card = document.querySelector(`[data-expert-id="${creatorId}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('spotlight-pulse');
          setTimeout(() => card.classList.remove('spotlight-pulse'), 3000);
        } else {
          const grid = document.querySelector('#experts-grid');
          if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    };
  }

  sessionControls(isAdmin);
}

// Generate Profile Editor HTML
function getProfileEditorHtml(profile, isNew = false) {
  const p = profile || {};
  const category = p.category || 'Editor';
  const packages = (Array.isArray(p.packages) && p.packages.length) ? p.packages : getDefaultPackages(category);
  const pkg1 = packages[0] || { name: 'Starter Edit', price: 500 };
  const pkg2 = packages[1] || { name: 'Pro Standard Cut', price: 1200 };
  const pkg3 = packages[2] || { name: 'Elite Master Cut', price: 2500 };

  return `
    <div class="add-profile-form-container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <h3 style="margin:0; font-size:20px; font-family:var(--font-display);">${isNew ? '✦ Add Your Creator Profile' : '✏️ Edit Creator Profile &amp; About Details'}</h3>
        ${!isNew ? '<button type="button" class="quiet" id="dismiss-editor-btn" style="padding:4px 8px; font-size:12px;">✕ Cancel</button>' : ''}
      </div>
      <p style="font-size:13px; color:var(--text-secondary); margin:0 0 18px; line-height:1.5;">
        ${isNew ? 'Add your creative profile to be featured directly in the Sihu Marketplace showcase so clients can book you immediately.' : 'Update your bio, craft, portfolio link, and package prices. Your card on the live marketplace updates instantly.'}
      </p>

      <form id="creator-save-profile-form">
        <div class="form-grid-2">
          <label>Full Name *
            <input type="text" name="name" required value="${escape(p.name || '')}" placeholder="e.g. Hussain Shaik">
          </label>
          <label>Your Craft / Category *
            <select name="category" required>
              <option value="Reel Maker" ${category === 'Reel Maker' ? 'selected' : ''}>Reel Maker (Instagram &amp; Shorts)</option>
              <option value="Editor" ${category === 'Editor' ? 'selected' : ''}>Video Editor (YouTube &amp; Commercial)</option>
              <option value="Graphic Designer" ${category === 'Graphic Designer' ? 'selected' : ''}>Graphic Designer (Logos &amp; Posters)</option>
              <option value="Photo Editor" ${category === 'Photo Editor' ? 'selected' : ''}>Photo Editor &amp; Retoucher</option>
              <option value="Videographer" ${category === 'Videographer' ? 'selected' : ''}>Videographer &amp; Cinematographer</option>
              <option value="Drone Pilot" ${category === 'Drone Pilot' ? 'selected' : ''}>Drone Pilot</option>
              <option value="UGC Creator" ${category === 'UGC Creator' ? 'selected' : ''}>UGC Content Creator</option>
            </select>
          </label>
        </div>

        <label style="margin-top:12px; display:block;">About Me / Creative Bio *
          <textarea name="bio" rows="3" required placeholder="Tell clients about your editing style, storytelling approach, and what makes your work stand out...">${escape(p.bio || '')}</textarea>
        </label>

        <div class="form-grid-2" style="margin-top:12px;">
          <label>City &amp; Location *
            <input type="text" name="city" required value="${escape(p.city || 'Hyderabad')}" placeholder="e.g. Hyderabad, India">
          </label>
          <label>Turnaround / Delivery Time
            <input type="text" name="turnaround" value="${escape(p.turnaround || '1 - 2 Days')}" placeholder="e.g. 1 - 2 Days or 30-Min Delivery">
          </label>
        </div>

        <div class="form-grid-2" style="margin-top:12px;">
          <label>Portfolio Link (Drive / YouTube / Website)
            <input type="url" name="portfolio" value="${escape(p.portfolio || '')}" placeholder="https://drive.google.com/... or portfolio link">
          </label>
          <label>Instagram Username
            <input type="text" name="instagram" value="${escape(p.instagram || '')}" placeholder="@yourhandle">
          </label>
        </div>

        <div style="margin-top:20px;">
          <h4 style="font-size:12px; text-transform:uppercase; letter-spacing:1px; margin:0 0 10px; color:var(--text-muted); font-weight:800;">
            ✦ MARKETPLACE PACKAGES &amp; PRICING (₹ INR)
          </h4>
          <div class="packages-edit-grid">
            <div class="package-edit-item">
              <strong>Starter Package</strong>
              <input type="text" name="pkg1_name" value="${escape(pkg1.name || 'Starter Edit')}" placeholder="Package name" style="margin-bottom:6px;">
              <input type="number" name="pkg1_price" value="${pkg1.price || 500}" placeholder="Price (₹)" required>
              <small style="display:block; margin-top:4px; color:var(--text-muted);">Quick delivery, basic cut</small>
            </div>
            <div class="package-edit-item">
              <strong>Pro Package</strong>
              <input type="text" name="pkg2_name" value="${escape(pkg2.name || 'Pro Standard Cut')}" placeholder="Package name" style="margin-bottom:6px;">
              <input type="number" name="pkg2_price" value="${pkg2.price || 1200}" placeholder="Price (₹)" required>
              <small style="display:block; margin-top:4px; color:var(--text-muted);">Standard full edit + SFX</small>
            </div>
            <div class="package-edit-item">
              <strong>Elite Package</strong>
              <input type="text" name="pkg3_name" value="${escape(pkg3.name || 'Elite Master Cut')}" placeholder="Package name" style="margin-bottom:6px;">
              <input type="number" name="pkg3_price" value="${pkg3.price || 2500}" placeholder="Price (₹)" required>
              <small style="display:block; margin-top:4px; color:var(--text-muted);">Cinematic cut + audio mix</small>
            </div>
          </div>
        </div>

        <div class="profile-form-actions">
          <button class="primary" type="submit">⚡ Save &amp; Publish Profile to Marketplace</button>
          ${!isNew ? '<button type="button" class="quiet" id="cancel-edit-form-btn">Cancel</button>' : ''}
        </div>
      </form>
    </div>
  `;
}

// Bind Profile Editor Events
function bindProfileEditorEvents(container, existingProfile, isAdmin = false) {
  const form = container.querySelector('#creator-save-profile-form');
  if (!form) return;

  const dismiss = () => {
    container.style.display = 'none';
    container.innerHTML = '';
  };

  const cancelBtn1 = container.querySelector('#dismiss-editor-btn');
  const cancelBtn2 = container.querySelector('#cancel-edit-form-btn');
  if (cancelBtn1) cancelBtn1.onclick = dismiss;
  if (cancelBtn2) cancelBtn2.onclick = dismiss;

  form.onsubmit = e => {
    e.preventDefault();
    const btn = e.submitter;
    const fd = new FormData(form);
    const name = fd.get('name').trim();
    const category = fd.get('category').trim();
    const bio = fd.get('bio').trim();
    const city = fd.get('city').trim();
    const turnaround = fd.get('turnaround').trim() || '1 - 2 Days';
    let portfolio = fd.get('portfolio').trim();
    if (portfolio && !/^https?:\/\//i.test(portfolio)) portfolio = 'https://' + portfolio;
    let instagram = fd.get('instagram').trim().replace(/^@+/, '');

    const pkg1Name = fd.get('pkg1_name').trim() || 'Starter Edit';
    const pkg1Price = Number(fd.get('pkg1_price')) || 500;
    const pkg2Name = fd.get('pkg2_name').trim() || 'Pro Standard Cut';
    const pkg2Price = Number(fd.get('pkg2_price')) || 1200;
    const pkg3Name = fd.get('pkg3_name').trim() || 'Elite Master Cut';
    const pkg3Price = Number(fd.get('pkg3_price')) || 2500;

    const packages = [
      { name: pkg1Name, price: pkg1Price, time: '1 day delivery', revisions: '2 revisions', desc: 'Fast turnaround project deliverable.', features: ['Quick Delivery', 'Clean Export', 'Full HD'] },
      { name: pkg2Name, price: pkg2Price, time: '2-3 days delivery', revisions: '2 revisions', desc: 'Complete production deliverable with SFX & Color Grade.', features: ['High Retention', 'Color Grading', 'Sound Design'] },
      { name: pkg3Name, price: pkg3Price, time: '3-4 days delivery', revisions: 'Unlimited', desc: 'Master commercial deliverable with full revisions.', features: ['4K Master Export', 'Motion Graphics', 'Audio Master'] }
    ];

    const updatedProfile = {
      ...(existingProfile || {}),
      id: existingProfile?.id || ('creator-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
      name,
      category,
      bio,
      city,
      turnaround,
      portfolio,
      instagram,
      software: existingProfile?.software || ['Adobe Premiere Pro', 'DaVinci Resolve', 'Photoshop'],
      niches: existingProfile?.niches || ['Social media', 'Motion design', 'Color grading'],
      experience: existingProfile?.experience || '2',
      packages,
      status: 'approved'
    };

    run(btn, async () => {
      saveCreatorProfile(updatedProfile);
      
      // If signed into Supabase, attempt RPC update as well
      try {
        const { data: auth } = await client.auth.getCurrentUser();
        if (auth?.user) {
          await rpc('sihu_submit_application', { details: updatedProfile });
        }
      } catch (rpcErr) {
        // Local save succeeded regardless
      }

      // Re-render dashboard
      renderCreatorDashboard(updatedProfile, null, isAdmin);
    });
  };
}

// Standalone Profile Editor View (when user creates profile without existing one)
function renderCreatorProfileEditor(profile, isNew = false, isAdmin = false) {
  updateBrand();
  view.innerHTML = getProfileEditorHtml(profile, isNew);
  bindProfileEditorEvents(view, profile, isAdmin);
  sessionControls(isAdmin);
}

// STRICT PRIVACY: Creator account view NEVER exposes client phone, email, or identity
async function loadAccount() {
  currentMode = 'account';
  updateBrand();
  const { data: auth, error: authError } = await client.auth.getCurrentUser();
  if (authError || !auth?.user) {
    // Check if creator profile is already saved in localStorage
    let savedProfile = null;
    try {
      savedProfile = JSON.parse(localStorage.getItem('sihu_creator_profile') || 'null');
    } catch {}

    if (savedProfile && savedProfile.name) {
      renderCreatorDashboard(savedProfile, null, false);
      return;
    }
    signIn();
    return;
  }

  if (pendingApplication) {
    if (auth.user.email.toLowerCase() !== pendingApplication.email.trim().toLowerCase()) {
      throw new Error('You are signed in with a different email. Close this window, sign out from My account, then submit using the application email.');
    }
    await rpc('sihu_submit_application', { details: pendingApplication });
    // Also save pending application into local profile
    saveCreatorProfile(pendingApplication);
    pendingApplication = null;
    localStorage.removeItem('sihu-draft'); localStorage.removeItem('snapja-draft');
  }

  const isAdmin = await rpc('sihu_is_admin');
  const { data: rows, error: queryError } = await client.database.from('sihu_applications').select(columns).eq('user_id', auth.user.id).limit(1);
  if (queryError) throw queryError;
  const application = rows?.[0];

  let localProfile = null;
  try {
    localProfile = JSON.parse(localStorage.getItem('sihu_creator_profile') || 'null');
  } catch {}

  let effectiveProfile = application?.profile || localProfile;

  if (application?.status === 'approved') {
    try {
      const account = await rpc('sihu_member_account');
      if (account?.profile) effectiveProfile = account.profile;
    } catch {}
  }

  if (effectiveProfile && effectiveProfile.name) {
    renderCreatorDashboard(effectiveProfile, application, isAdmin);
  } else if (!application) {
    // No profile or application yet: offer Add Profile directly
    renderCreatorProfileEditor(null, true, isAdmin);
  } else {
    const rejected = application.status === 'rejected';
    view.innerHTML = heading(
      rejected ? 'Application not approved.' : 'Your application is under review.',
      rejected ? 'Your account remains locked. Review the feedback below.' : 'Your application has reached our backend securely. Your profile will be added to the showcase after admin approval.'
    ) +
    `<span class="status-pill ${application.status}">${rejected ? 'Not approved' : 'Pending review'}</span>
     <div class="summary">
       <div><small>Application ID</small>${escape(application.id)}</div>
       <div><small>Submitted</small>${new Date(application.created_at).toLocaleDateString()}</div>
     </div>
     ${application.review_note ? `<p><strong>Review feedback</strong><br>${escape(application.review_note)}</p>` : ''}
     <div style="margin-top:20px;">
       <button type="button" class="primary" id="edit-pending-profile-btn">Edit Application Profile ✏️</button>
     </div>`;

    if (view.querySelector('#edit-pending-profile-btn')) {
      view.querySelector('#edit-pending-profile-btn').onclick = () => {
        renderCreatorProfileEditor(application.profile || null, false, isAdmin);
      };
    }
  }

  if (isAdmin) {
    const adminBanner = document.createElement('div');
    adminBanner.className = 'admin-switch-banner';
    adminBanner.innerHTML = '<span>✦ Administrator privileges detected</span><button class="quiet" id="go-admin-queue">Open Admin Review Portal →</button>';
    view.append(adminBanner);
    adminBanner.querySelector('#go-admin-queue').onclick = () => openAdminPortal();
  }
}

async function loadAdmin() {
  currentMode = 'admin';
  updateBrand();
  const { data: auth, error: authError } = await client.auth.getCurrentUser();
  if (authError || !auth?.user) { signIn(); return; }
  const isAdmin = await rpc('sihu_is_admin');
  if (!isAdmin) {
    view.innerHTML = heading('Access restricted.', `You are signed in as <strong>${escape(auth.user.email)}</strong>, but this account is not registered as an administrator.`) +
      '<p>Only approved administrators can review creator applications, assign orders, and unlock accounts.</p><div class="portal-controls"><button class="primary" id="switch-admin-user">Sign in with different email</button><button class="quiet" id="back-to-member">Back to creator account</button></div>';
    view.querySelector('#switch-admin-user').onclick = async () => {
      await client.auth.signOut();
      email = '';
      signIn();
    };
    view.querySelector('#back-to-member').onclick = () => openPortal();
    return;
  }
  if (adminTab === 'leads') {
    await adminLeadsQueue();
  } else {
    await adminQueue();
  }
}

function adminTabsHtml() {
  return `<div class="admin-tab-nav">
    <button class="tab-btn ${adminTab === 'applications' ? 'active' : ''}" id="tab-apps">Creator Applications ✦</button>
    <button class="tab-btn ${adminTab === 'leads' ? 'active' : ''}" id="tab-leads">Client Orders &amp; Assignment ⚡</button>
  </div>`;
}

async function adminQueue() {
  currentMode = 'admin';
  adminTab = 'applications';
  updateBrand();
  const { data: rows, error: queryError } = await client.database.from('sihu_applications').select(columns).eq('status', queueFilter).order('created_at', { ascending: false }).order('id').range(queuePage * pageSize, (queuePage + 1) * pageSize);
  if (queryError) throw queryError;
  const { count } = await client.database.from('sihu_applications').select('id', { count: 'exact', head: true }).eq('status', queueFilter);
  const totalPages = Math.ceil((count || 0) / pageSize);

  view.innerHTML = heading('Creator Review Queue.', 'Review pending creator applications, inspect portfolios, and approve or reject.') +
    adminTabsHtml() +
    `<div class="filter-pills">${['pending', 'approved', 'rejected'].map(s => `<button class="filter-pill ${queueFilter === s ? 'active' : ''}" data-status="${s}">${s} (${s === queueFilter ? (count || 0) : '·'})</button>`).join('')}</div><div class="review-list" id="review-list"></div><div class="pagination"><button class="quiet" id="prev-page" ${queuePage === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${queuePage + 1} of ${Math.max(1, totalPages)}</span><button class="quiet" id="next-page" ${queuePage + 1 >= totalPages ? 'disabled' : ''}>Next →</button></div>`;

  view.querySelector('#tab-apps').onclick = () => adminQueue();
  view.querySelector('#tab-leads').onclick = () => adminLeadsQueue();

  view.querySelectorAll('[data-status]').forEach(btn => {
    btn.onclick = () => { queueFilter = btn.dataset.status; queuePage = 0; adminQueue(); };
  });
  view.querySelector('#prev-page').onclick = () => { if (queuePage > 0) { queuePage--; adminQueue(); } };
  view.querySelector('#next-page').onclick = () => { if (queuePage + 1 < totalPages) { queuePage++; adminQueue(); } };

  const list = view.querySelector('#review-list');
  if (!rows.length) list.innerHTML = `<div class="empty-queue"><p>No ${queueFilter} applications found in this queue.</p></div>`;
  for (const application of rows.slice(0, pageSize)) {
    const card = document.createElement('article'); card.className = 'review-card';
    card.innerHTML = `<div class="review-header"><div><h3>${escape(application.profile.name || 'Applicant')}</h3><span class="sub-label">${escape(application.profile.category || 'Creator')} · Submitted ${new Date(application.created_at).toLocaleString()}</span></div><span class="status-pill ${application.status}">${escape(application.status)}</span></div><div class="summary"><div><small>Verified email</small>${escape(application.email)}</div><div><small>Phone</small>${escape(application.profile.phone || '-')}</div><div><small>Location</small>${escape([application.profile.city, application.profile.state, application.profile.country].filter(Boolean).join(', '))}</div><div><small>Software</small>${escape(Array.isArray(application.profile.software) ? application.profile.software.join(', ') : application.profile.software || '-')}</div><div><small>Specialties</small>${escape(Array.isArray(application.profile.niches) ? application.profile.niches.join(', ') : application.profile.niches || '-')}</div><div><small>Experience</small>${escape(application.profile.experience || '0')} years</div><div><small>Availability</small>${escape(application.profile.availability || '-')}</div><div><small>Work style</small>${escape(application.profile.work || '-')}</div><div><small>Instagram</small>${escape(application.profile.instagram || '-')}</div>${application.profile.bio ? `<div><small>Bio</small>${escape(application.profile.bio)}</div>` : ''}</div>`;
    if (application.profile.portfolio) {
      try {
        const url = new URL(application.profile.portfolio);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Open portfolio ↗'; a.className = 'text-link portfolio-btn'; card.append(a);
        }
      } catch {}
    }
    const noteArea = document.createElement('div'); noteArea.className = 'review-actions';
    noteArea.innerHTML = `<textarea placeholder="Optional feedback note to creator (e.g. Please provide Instagram handle or updated portfolio)">${escape(application.review_note || '')}</textarea><div class="action-buttons"><button class="primary approve-btn">Approve Application</button><button class="danger reject-btn">Reject Application</button></div>`;
    const textarea = noteArea.querySelector('textarea');
    noteArea.querySelector('.approve-btn').onclick = e => run(e.currentTarget, async () => {
      await rpc('sihu_review_application', { application_id: application.id, new_status: 'approved', note: textarea.value.trim() });
      adminQueue();
    });
    noteArea.querySelector('.reject-btn').onclick = e => run(e.currentTarget, async () => {
      await rpc('sihu_review_application', { application_id: application.id, new_status: 'rejected', note: textarea.value.trim() });
      adminQueue();
    });
    card.append(noteArea);
    list.append(card);
  }
  sessionControls(true);
}

// Admin: Client Orders & Lead Assignment Queue
async function adminLeadsQueue() {
  currentMode = 'admin';
  adminTab = 'leads';
  updateBrand();

  let leads = [];
  try {
    leads = JSON.parse(localStorage.getItem('sihu_client_leads') || '[]');
  } catch {}

  const approvedCreators = await getApprovedCreators();

  view.innerHTML = heading('Client Orders &amp; Assignment.', 'Review client project bookings, assign verified creators, and track delivery.') +
    adminTabsHtml() +
    `<div class="leads-stats-row">
      <div class="stat-pill">Total Orders: <strong>${leads.length}</strong></div>
      <div class="stat-pill">Unassigned: <strong>${leads.filter(l => l.status === 'new').length}</strong></div>
      <div class="stat-pill">Assigned: <strong>${leads.filter(l => l.status === 'assigned').length}</strong></div>
      <div class="stat-pill">Completed: <strong>${leads.filter(l => l.status === 'completed').length}</strong></div>
    </div>
    <div class="review-list" id="leads-list"></div>`;

  view.querySelector('#tab-apps').onclick = () => adminQueue();
  view.querySelector('#tab-leads').onclick = () => adminLeadsQueue();

  const list = view.querySelector('#leads-list');
  if (!leads.length) {
    list.innerHTML = `<div class="empty-queue"><p>No client bookings recorded yet. Orders placed by clients via the 1-Tap Hire flow will appear here.</p></div>`;
  } else {
    leads.slice().reverse().forEach((lead, index) => {
      const realIndex = leads.length - 1 - index;
      const card = document.createElement('article');
      card.className = 'review-card lead-card';
      const isAssigned = lead.status === 'assigned';
      const isCompleted = lead.status === 'completed';

      card.innerHTML = `
        <div class="review-header">
          <div>
            <h3>${escape(lead.project_type || lead.package_name || 'Project Booking')} · ₹${escape(lead.package_price || 'Standard')}</h3>
            <span class="sub-label">Order #${lead.order_id || 'ORD-' + (realIndex + 1)} · ${new Date(lead.timestamp).toLocaleString()}</span>
          </div>
          <span class="status-pill ${lead.status || 'new'}">${escape(lead.status || 'new')}</span>
        </div>
        <div class="summary">
          <div><small>Client name</small>${escape(lead.client_name)}</div>
          <div><small>Client phone</small><a href="tel:${escape(lead.client_phone)}" class="text-link">${escape(lead.client_phone)}</a></div>
          <div><small>Client email</small><a href="mailto:${escape(lead.client_email)}" class="text-link">${escape(lead.client_email)}</a></div>
          <div><small>Requested expert</small>${escape(lead.expert_name || lead.creator || 'Open assignment')}</div>
          <div><small>Package delivery</small>${escape(lead.delivery || 'Standard')}</div>
          <div><small>Project brief</small>${escape(lead.details || lead.brief || '-')}</div>
          ${lead.assigned_creator_name ? `<div><small>Assigned creator</small><strong>${escape(lead.assigned_creator_name)}</strong></div>` : ''}
        </div>
        <div class="lead-assign-box">
          <label>Assign to verified creator:
            <select class="assign-creator-select">
              <option value="">Select a verified creator...</option>
              ${approvedCreators.map(c => `
                <option value="${escape(c.id)}" data-name="${escape(c.name)}" ${lead.assigned_creator_id === c.id ? 'selected' : ''}>
                  ${escape(c.name)} (${escape(c.category)} · ${escape(c.city)})
                </option>
              `).join('')}
            </select>
          </label>
          <div class="action-buttons">
            <button class="primary assign-lead-btn" ${isCompleted ? 'disabled' : ''}>Assign Order ⚡</button>
            <button class="quiet complete-lead-btn" ${isCompleted ? 'disabled' : ''}>Mark Completed ✓</button>
          </div>
        </div>
      `;

      const select = card.querySelector('.assign-creator-select');
      card.querySelector('.assign-lead-btn').onclick = () => {
        const creatorId = select.value;
        const selectedOpt = select.options[select.selectedIndex];
        const creatorName = selectedOpt?.dataset?.name || '';
        if (!creatorId) {
          alert('Please select an approved creator from the list to assign this order.');
          return;
        }
        leads[realIndex].status = 'assigned';
        leads[realIndex].assigned_creator_id = creatorId;
        leads[realIndex].assigned_creator_name = creatorName;
        leads[realIndex].assigned_at = new Date().toISOString();
        localStorage.setItem('sihu_client_leads', JSON.stringify(leads));
        adminLeadsQueue();
      };

      card.querySelector('.complete-lead-btn').onclick = () => {
        leads[realIndex].status = 'completed';
        leads[realIndex].completed_at = new Date().toISOString();
        localStorage.setItem('sihu_client_leads', JSON.stringify(leads));
        adminLeadsQueue();
      };

      list.append(card);
    });
  }
  sessionControls(true);
}

async function openPortal(application = null) {
  pendingApplication = application;
  currentMode = 'account';
  updateBrand();
  document.querySelector('#application')?.close();
  if (!portal.open) portal.showModal();
  view.innerHTML = heading('Connecting…', 'Loading Creator Portal.');
  await run(null, loadAccount);
}

async function openAdminPortal() {
  currentMode = 'admin';
  updateBrand();
  document.querySelector('#application')?.close();
  if (!portal.open) portal.showModal();
  view.innerHTML = heading('Connecting to Admin Portal…', 'Verifying administrator access.');
  await run(null, loadAdmin);
}

// Client 1-Tap Hire lead submission handler
function submitClientLead(leadData) {
  try {
    const leads = JSON.parse(localStorage.getItem('sihu_client_leads') || '[]');
    leads.push({
      ...leadData,
      status: 'new',
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('sihu_client_leads', JSON.stringify(leads));
  } catch (e) {
    console.error('Failed to save lead locally:', e);
  }
}

window.Sihu = {
  open: () => openPortal(),
  openAdmin: () => openAdminPortal(),
  submit: profile => {
    saveCreatorProfile(profile);
    openPortal(structuredClone(profile));
  },
  saveProfile: profile => saveCreatorProfile(profile),
  submitLead: leadData => submitClientLead(leadData),
  getApprovedCreators: () => getApprovedCreators(),
  toggleDemo: hide => {
    localStorage.setItem('sihu_hide_demo', hide ? 'true' : 'false');
    if (window.renderMarketplace) window.renderMarketplace();
  }
};

if (new URLSearchParams(location.search).has('admin') || location.hash === '#admin') {
  openAdminPortal();
} else if (new URLSearchParams(location.search).has('account') || location.hash === '#account') {
  openPortal();
}
