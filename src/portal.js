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

function signIn() {
  updateBrand();
  const title = currentMode === 'admin' ? 'Admin authentication.' : 'Sign in with your email.';
  const copy = currentMode === 'admin'
    ? 'Enter your registered administrator email to access the application review queue and order management.'
    : (pendingApplication ? 'Verify the email on your application to send it for review.' : 'We will send you a one-time code. No password needed.');

  view.innerHTML = heading(title, copy) +
    `<form id="email-form"><label>Email address<input type="email" name="email" autocomplete="email" value="${escape(pendingApplication?.email || email)}" ${pendingApplication ? 'readonly' : ''} placeholder="${currentMode === 'admin' ? 'admin@example.com' : 'you@example.com'}" required></label><button class="primary" type="submit">Send sign-in code →</button></form>` +
    (currentMode === 'admin' ? '<p class="admin-note"><small>Protected interface · Requires an authorized administrator account.</small></p>' : '');

  view.querySelector('form').onsubmit = e => {
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

function sessionControls() {
  const row = document.createElement('div'); row.className = 'portal-controls';
  row.innerHTML = `<button class="quiet" id="refresh-account">↻ Refresh</button>${currentMode === 'admin' ? '<button class="quiet" id="switch-account-portal">Creator view</button>' : ''}<button class="quiet" id="sign-out">Sign out</button>`;
  view.append(row);
  row.querySelector('#refresh-account').onclick = e => run(e.currentTarget, currentMode === 'admin' ? loadAdmin : loadAccount);
  if (currentMode === 'admin') {
    row.querySelector('#switch-account-portal').onclick = () => openPortal();
  }
  row.querySelector('#sign-out').onclick = e => run(e.currentTarget, async () => {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw signOutError;
    pendingApplication = null; email = ''; signIn();
  });
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

// STRICT PRIVACY: Creator account view NEVER exposes client phone, email, or identity
async function loadAccount() {
  currentMode = 'account';
  updateBrand();
  const { data: auth, error: authError } = await client.auth.getCurrentUser();
  if (authError || !auth?.user) { signIn(); return; }
  if (pendingApplication) {
    if (auth.user.email.toLowerCase() !== pendingApplication.email.trim().toLowerCase()) {
      throw new Error('You are signed in with a different email. Close this window, sign out from My account, then submit using the application email.');
    }
    await rpc('sihu_submit_application', { details: pendingApplication });
    pendingApplication = null;
    localStorage.removeItem('sihu-draft'); localStorage.removeItem('snapja-draft');
  }
  const isAdmin = await rpc('sihu_is_admin');
  const { data: rows, error: queryError } = await client.database.from('sihu_applications').select(columns).eq('user_id', auth.user.id).limit(1);
  if (queryError) throw queryError;
  const application = rows?.[0];

  if (!application) {
    view.innerHTML = heading('Your story starts here.', 'You are signed in. Complete your creator application to request account access.') + '<button class="primary" id="start-application">Create my application →</button>';
    view.querySelector('#start-application').onclick = () => { portal.close(); document.querySelector('.apply').click(); };
  } else if (application.status === 'approved') {
    const account = await rpc('sihu_member_account');
    const myName = (account.profile?.name || '').trim().toLowerCase();
    
    // Read projects assigned to this creator (strictly sanitized: NO client contact info)
    let assignedProjects = [];
    try {
      const allLeads = JSON.parse(localStorage.getItem('sihu_client_leads') || '[]');
      assignedProjects = allLeads.filter(l => {
        const assignedName = (l.assigned_creator_name || '').trim().toLowerCase();
        const expertName = (l.expert_name || '').trim().toLowerCase();
        const creatorField = (l.creator || '').trim().toLowerCase();
        return (
          l.assigned_creator_id === application.id ||
          (assignedName && (assignedName === myName || myName.includes(assignedName) || assignedName.includes(myName))) ||
          (l.status === 'assigned' && expertName && (expertName === myName || myName.includes(expertName))) ||
          (l.status === 'assigned' && creatorField && creatorField.includes(myName))
        );
      });
    } catch {}

    const myPackages = account.profile.packages || getDefaultPackages(account.profile.category);
    const packagesHtml = `
      <div class="creator-pricing-box" style="margin: 20px 0; background: #171911; border: 1px solid #343825; border-radius: 14px; padding: 18px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <h4 style="margin:0; font-size:14px; color:#fff;">⚡ Your Live Marketplace Packages</h4>
            <small style="color:#9e9c85;">Shown to clients when booking your profile</small>
          </div>
          ${account.profile.portfolio ? `<a href="${escape(account.profile.portfolio)}" target="_blank" rel="noopener noreferrer" style="color:var(--yellow); font-size:12px; font-weight:700; text-decoration:none;">View Portfolio Link ↗</a>` : ''}
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px;">
          ${myPackages.map(pkg => `
            <div style="background:#11120d; border:1px solid #292c1c; border-radius:10px; padding:12px;">
              <strong style="display:block; font-size:13px; color:#fff; margin-bottom:4px;">${escape(pkg.name)}</strong>
              <div style="color:var(--yellow); font-size:16px; font-weight:800; font-family:'Space Grotesk',sans-serif;">₹${(pkg.price || 800).toLocaleString()}</div>
              <small style="color:#888672; font-size:11px;">${escape(pkg.time)} · ${escape(pkg.revisions)}</small>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    let projectsHtml = '';
    if (assignedProjects.length) {
      projectsHtml = `<div class="assigned-projects-section">
        <h3>⚡ Projects Assigned to You (${assignedProjects.length})</h3>
        <p class="privacy-note">🔒 Escrow Protected: Sihu Team coordinates client communication and payment milestones. Direct client contacts are kept private.</p>
        <div class="projects-list">
          ${assignedProjects.map(p => `
            <div class="project-card">
              <div class="project-header">
                <div>
                  <span class="status-pill approved" style="margin-right:6px;">${p.order_id ? '#' + escape(p.order_id) : 'Assigned'}</span>
                  <strong>${escape(p.project_type || p.package_name || 'Project Deliverable')}</strong>
                </div>
                <span class="status-pill approved">In Progress</span>
              </div>
              <p><strong>Package &amp; Price:</strong> <span style="color:#ffd500;font-weight:700;">₹${escape(p.package_price || 'Standard Escrow')}</span> · Delivery: ${escape(p.delivery || '2-4 Days')}</p>
              <p><strong>Client Brief / Requirements:</strong> ${escape(p.details || p.brief || 'Standard deliverable required')}</p>
              <div class="project-meta"><small>Assigned on: ${new Date(p.assigned_at || p.timestamp).toLocaleDateString()}</small></div>
              <a href="https://api.whatsapp.com/send?phone=917989797016&text=${encodeURIComponent('Hi Sihu Team, I am ' + account.profile.name + ' working on assigned order ' + (p.order_id ? '#' + p.order_id : '') + ' (' + (p.project_type || p.package_name || '') + '). I have an update.')}" target="_blank" class="primary small-btn wa-submit-btn">Update Sihu Manager on WhatsApp ⚡</a>
            </div>
          `).join('')}
        </div>
      </div>`;
    } else {
      projectsHtml = `<div class="assigned-projects-section">
        <h3>⚡ Assigned Projects</h3>
        <p>No active project orders assigned yet. When clients book you and the Sihu Admin assigns the order, it will appear here.</p>
      </div>`;
    }

    view.innerHTML = heading(`Welcome, ${escape(account.profile.name)}.`, 'Your application is approved. Your Sihu creator profile is published and active in the showcase.') +
      `<span class="status-pill approved">Account &amp; Showcase Active</span>
      <div class="summary">
        <div><small>Creator category</small>${escape(account.profile.category)}</div>
        <div><small>Email</small>${escape(account.email)}</div>
        <div><small>Software</small>${escape(account.profile.software.join(', '))}</div>
        <div><small>Location</small>${escape(account.profile.city)}</div>
      </div>
      ${packagesHtml}
      ${projectsHtml}`;
  } else {
    const rejected = application.status === 'rejected';
    view.innerHTML = heading(rejected ? 'Application not approved.' : 'Your application is under review.', rejected ? 'Your account remains locked. Review the feedback below.' : 'Your application has reached our backend securely. Your profile will be added to the showcase after admin approval.') +
      `<span class="status-pill ${application.status}">${rejected ? 'Not approved' : 'Pending review'}</span><div class="summary"><div><small>Application ID</small>${escape(application.id)}</div><div><small>Submitted</small>${new Date(application.created_at).toLocaleDateString()}</div></div>${application.review_note ? `<p><strong>Review feedback</strong><br>${escape(application.review_note)}</p>` : ''}`;
  }

  if (isAdmin) {
    const adminBanner = document.createElement('div');
    adminBanner.className = 'admin-switch-banner';
    adminBanner.innerHTML = '<span>✦ Administrator privileges detected</span><button class="quiet" id="go-admin-queue">Open Admin Review Portal →</button>';
    view.append(adminBanner);
    adminBanner.querySelector('#go-admin-queue').onclick = () => openAdminPortal();
  }
  sessionControls();
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
  const hideDemo = localStorage.getItem('sihu_hide_demo') === 'true';
  view.innerHTML = heading('Application review queue.', 'Review creator submissions, verify portfolios, and approve accounts to publish them to the showcase.') +
    adminTabsHtml() +
    `<div class="admin-demo-toggle-bar" style="margin-bottom: 14px; padding: 10px 14px; background: #171911; border: 1px solid #313524; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <span style="font-size: 12px; color: #b0ae98;">
        Marketplace Demo Cards:
        <strong style="color: ${hideDemo ? '#ff5252' : '#25d366'};">${hideDemo ? 'Hidden 🚫 (Only Real Creators)' : 'Visible 👁️ (Demo Active)'}</strong>
      </span>
      <button type="button" class="quiet small" id="admin-toggle-demo-btn" style="border: 1px solid #3c4028; padding: 5px 12px; font-size: 11px; border-radius: 999px;">
        ${hideDemo ? 'Show Demo Cards' : 'Wipe / Hide Demo Cards 🚫'}
      </button>
    </div>` +
    `<div class="queue-header"><label>Filter applications<select id="queue-filter"><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Not approved</option></select></label><div class="queue-stats"><span class="badge">Showing: ${escape(queueFilter)}</span></div></div><div id="review-list"></div><div class="portal-controls"><button class="quiet" id="queue-prev" ${queuePage === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${queuePage + 1}</span><button class="quiet" id="queue-next" ${rows.length <= pageSize ? 'disabled' : ''}>Next →</button></div>`;
  
  const demoToggleBtn = view.querySelector('#admin-toggle-demo-btn');
  if (demoToggleBtn) {
    demoToggleBtn.onclick = () => {
      const cur = localStorage.getItem('sihu_hide_demo') === 'true';
      localStorage.setItem('sihu_hide_demo', cur ? 'false' : 'true');
      if (window.renderMarketplace) window.renderMarketplace();
      adminQueue();
    };
  }

  view.querySelector('#tab-apps').onclick = () => run(null, adminQueue);
  view.querySelector('#tab-leads').onclick = () => run(null, adminLeadsQueue);

  const list = view.querySelector('#review-list');
  if (!rows.length) list.innerHTML = `<div class="empty-queue"><p>No ${queueFilter} applications found in this queue.</p></div>`;
  for (const application of rows.slice(0, pageSize)) {
    const card = document.createElement('article'); card.className = 'review-card';
    card.innerHTML = `<div class="review-header"><div><h3>${escape(application.profile.name || 'Applicant')}</h3><span class="sub-label">${escape(application.profile.category || 'Creator')} · Submitted ${new Date(application.created_at).toLocaleString()}</span></div><span class="status-pill ${application.status}">${escape(application.status)}</span></div><div class="summary"><div><small>Verified email</small>${escape(application.email)}</div><div><small>Phone</small>${escape(application.profile.phone || '—')}</div><div><small>Location</small>${escape([application.profile.city, application.profile.state, application.profile.country].filter(Boolean).join(', '))}</div><div><small>Software</small>${escape(Array.isArray(application.profile.software) ? application.profile.software.join(', ') : application.profile.software || '—')}</div><div><small>Specialties</small>${escape(Array.isArray(application.profile.niches) ? application.profile.niches.join(', ') : application.profile.niches || '—')}</div><div><small>Experience</small>${escape(application.profile.experience || '0')} years</div><div><small>Availability</small>${escape(application.profile.availability || '—')}</div><div><small>Work style</small>${escape(application.profile.work || '—')}</div><div><small>Instagram</small>${escape(application.profile.instagram || '—')}</div>${application.profile.bio ? `<div><small>Bio</small>${escape(application.profile.bio)}</div>` : ''}</div>`;
    if (application.profile.portfolio) {
      try {
        const url = new URL(application.profile.portfolio);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Open portfolio ↗'; a.className = 'text-link portfolio-btn'; card.append(a);
        }
      } catch {}
    }
    if (application.status === 'pending') {
      const controls = document.createElement('div');
      controls.className = 'review-actions';
      controls.innerHTML = '<label>Feedback / review note (optional)<textarea maxlength="1000" rows="2" placeholder="Optional notes visible to applicant..."></textarea></label><div class="portal-controls"><button class="primary approve-btn" data-decision="approved">Approve &amp; Publish to Showcase</button><button class="quiet reject-btn" data-decision="rejected">Reject application</button></div>';
      for (const button of controls.querySelectorAll('button')) button.onclick = () => run(button, async () => {
        controls.querySelectorAll('button').forEach(b => b.disabled = true);
        try {
          await rpc('sihu_review_application', {
            application_id: application.id,
            decision: button.dataset.decision,
            note: controls.querySelector('textarea').value
          });
          // Update cache of approved creators
          await getApprovedCreators();
          if (window.renderShowcase) window.renderShowcase();
          if (window.renderMarketplace) window.renderMarketplace();
          await adminQueue();
        } finally {
          controls.querySelectorAll('button').forEach(b => b.disabled = false);
        }
      });
      card.append(controls);
    } else if (application.review_note) {
      const noteDiv = document.createElement('div');
      noteDiv.className = 'review-past-note';
      noteDiv.innerHTML = `<small>Review note (${new Date(application.reviewed_at).toLocaleDateString()}):</small><p>${escape(application.review_note)}</p>`;
      card.append(noteDiv);
    }
    list.append(card);
  }
  const filter = view.querySelector('#queue-filter'); filter.value = queueFilter;
  filter.onchange = () => run(filter, async () => { queueFilter = filter.value; queuePage = 0; await adminQueue(); });
  view.querySelector('#queue-prev').onclick = e => run(e.currentTarget, async () => { queuePage--; await adminQueue(); });
  view.querySelector('#queue-next').onclick = e => run(e.currentTarget, async () => { queuePage++; await adminQueue(); });
  sessionControls();
}

// ADMIN-ONLY: View client orders and ASSIGN them to approved creator profiles
async function adminLeadsQueue() {
  currentMode = 'admin';
  adminTab = 'leads';
  updateBrand();
  
  const approvedCreators = await getApprovedCreators();
  let leads = [];
  try {
    leads = JSON.parse(localStorage.getItem('sihu_client_leads') || '[]');
  } catch {}

  view.innerHTML = heading('Client orders &amp; assignment.', 'Review client booking requests and assign them to approved creator profiles.') +
    adminTabsHtml() +
    `<div class="queue-header"><div><strong>Total Orders / Leads:</strong> ${leads.length}</div></div><div id="leads-list"></div>`;

  view.querySelector('#tab-apps').onclick = () => run(null, adminQueue);
  view.querySelector('#tab-leads').onclick = () => run(null, adminLeadsQueue);

  const list = view.querySelector('#leads-list');
  if (!leads.length) {
    list.innerHTML = `<div class="empty-queue"><p>No client booking orders yet. When clients book on the marketplace, orders will appear here for assignment.</p></div>`;
  } else {
    leads.slice().reverse().forEach((lead, reverseIdx) => {
      const realIdx = leads.length - 1 - reverseIdx;
      const card = document.createElement('article');
      card.className = 'review-card lead-card';
      const cleanPhone = String(lead.client_phone || '').replace(/[^0-9]/g, '');
      const waMsg = encodeURIComponent(`Hi ${lead.client_name}, this is the Sihu Team regarding your request for ${lead.project_type || lead.package_name}. We have verified your request and are coordinating with the creator.`);
      const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${waMsg}`;
      const mailLink = `mailto:${encodeURIComponent(lead.client_email)}?subject=${encodeURIComponent('Sihu Booking: ' + (lead.project_type || lead.package_name))}`;

      const isAssigned = !!lead.assigned_creator_name;
      const requestedExpert = lead.expert_name || (lead.creator ? lead.creator.split('[')[0].trim() : '');

      card.innerHTML = `
        <div class="review-header">
          <div>
            <h3>${escape(lead.client_name)} ${lead.order_id ? `<small style="color:var(--yellow); font-size:12px;">#${escape(lead.order_id)}</small>` : ''}</h3>
            <span class="sub-label">Requested: <strong>${escape(requestedExpert || lead.creator)}</strong> · ${new Date(lead.timestamp || Date.now()).toLocaleString()}</span>
          </div>
          <span class="status-pill ${isAssigned ? 'approved' : 'pending'}">${isAssigned ? 'Assigned' : 'Unassigned'}</span>
        </div>
        <div class="summary">
          <div><small>Client WhatsApp</small>${escape(lead.client_phone)}</div>
          <div><small>Client Email</small>${escape(lead.client_email)}</div>
          <div><small>Package / Project</small>${escape(lead.package_name || lead.project_type)} ${lead.package_price ? `(₹${lead.package_price})` : ''}</div>
          <div><small>Client Brief / Footage</small>${escape(lead.details || 'No additional notes provided.')}</div>
        </div>
        
        <div class="assignment-panel">
          <h4>Assign to Creator Profile:</h4>
          ${isAssigned ? `
            <div class="current-assignment">
              <span class="status-pill approved">✓ Assigned to: <strong>${escape(lead.assigned_creator_name)}</strong></span>
              <small>Assigned at: ${new Date(lead.assigned_at).toLocaleString()}</small>
            </div>
          ` : ''}

          ${requestedExpert ? `
            <div class="target-expert-notice" style="margin: 8px 0 12px; padding: 10px 14px; background: #1b1e12; border-radius: 10px; border: 1px solid #3d4224; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div>
                <small style="color: #8f927b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; display: block;">Client Requested Expert:</small>
                <strong style="color: #ffd500; font-size: 15px;">${escape(requestedExpert)}</strong>
              </div>
              ${!isAssigned ? `
                <button type="button" class="primary quick-assign-to-expert" style="padding: 6px 14px; font-size: 11px;">
                  ⚡ 1-Click Assign to ${escape(requestedExpert)}
                </button>
              ` : ''}
            </div>
          ` : ''}

          <div class="assign-controls">
            <select class="creator-assign-select">
              <option value="">-- Choose Approved Creator --</option>
              ${approvedCreators.map(c => `
                <option value="${c.id}" data-name="${escape(c.name)}" ${(lead.assigned_creator_name === c.name || (requestedExpert && requestedExpert.toLowerCase() === c.name.toLowerCase())) ? 'selected' : ''}>
                  ${escape(c.name)} (${escape(c.category)}) - ${escape(c.city)}
                </option>
              `).join('')}
            </select>
            <button class="primary assign-btn">Confirm Assignment ➔</button>
          </div>
        </div>

        <div class="lead-actions">
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="primary wa-btn">Chat Client on WhatsApp ↗</a>
          <a href="${mailLink}" class="quiet mail-btn">Reply Client via Email ✉</a>
        </div>
      `;

      const quickBtn = card.querySelector('.quick-assign-to-expert');
      if (quickBtn) {
        quickBtn.onclick = () => {
          leads[realIdx].assigned_creator_name = requestedExpert;
          leads[realIdx].assigned_at = new Date().toISOString();
          leads[realIdx].status = 'assigned';
          localStorage.setItem('sihu_client_leads', JSON.stringify(leads));
          adminLeadsQueue();
        };
      }

      const assignBtn = card.querySelector('.assign-btn');
      const select = card.querySelector('.creator-assign-select');
      assignBtn.onclick = () => {
        const selectedOpt = select.selectedOptions[0];
        if (!select.value || !selectedOpt) {
          alert('Please select an approved creator to assign this order to.');
          return;
        }
        leads[realIdx].assigned_creator_id = select.value;
        leads[realIdx].assigned_creator_name = selectedOpt.dataset.name;
        leads[realIdx].assigned_at = new Date().toISOString();
        leads[realIdx].status = 'assigned';
        localStorage.setItem('sihu_client_leads', JSON.stringify(leads));
        adminLeadsQueue();
      };

      list.append(card);
    });
  }
  sessionControls();
}

async function openPortal(application = null) {
  pendingApplication = application;
  currentMode = 'account';
  updateBrand();
  document.querySelector('#application')?.close();
  if (!portal.open) portal.showModal();
  view.innerHTML = heading('Connecting…', 'Checking your account securely.');
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
  submit: profile => openPortal(structuredClone(profile)),
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
