// ===========================
// CONTACT INFO LOADER
// ===========================
(async function loadContactInfo() {
  try {
    const ci = await fetch('/api/contact').then(r => r.json());
    const WA_MSG = encodeURIComponent("Navin ji, I'm interested in your construction services. Please call me.");

    document.querySelectorAll('[data-ci-href]').forEach(el => {
      const t = el.getAttribute('data-ci-href');
      if (t === 'tel1')    el.href = `tel:+${ci.phone1}`;
      if (t === 'tel2')    el.href = `tel:+${ci.phone2}`;
      if (t === 'wa1')     el.href = `https://wa.me/${ci.phone1}`;
      if (t === 'wa1-msg') el.href = `https://wa.me/${ci.phone1}?text=${WA_MSG}`;
      if (t === 'ig')      el.href = `https://www.instagram.com/${ci.instagram}`;
    });

    document.querySelectorAll('[data-ci-text]').forEach(el => {
      const t = el.getAttribute('data-ci-text');
      if (t === 'phone1') el.textContent = ci.phone1Display;
      if (t === 'phone2') el.textContent = ci.phone2Display;
      if (t === 'ig')     el.textContent = `@${ci.instagram}`;
    });
  } catch (e) {
    console.error('Contact info load failed', e);
  }
})();

// ===========================
// MULTILINGUAL
// ===========================
const i18n = {
  en: {
    'nav.home':'Home','nav.about':'About','nav.services':'Services',
    'nav.projects':'Projects','nav.videos':'Videos','nav.reviews':'Reviews',
    'nav.quote':'Free Quote',
    'hero.badge':'Trusted Construction Partner — Delhi NCR Since 2009',
    'hero.tagline':'आपका हर सपना, हमारी मेहनत का परिणाम',
    'hero.desc':'End-to-end construction solutions including planning, design, site preparation, building renovation and project management — serving Najafgarh and all of Delhi NCR.',
    'hero.btn.quote':'Get Free Quote','hero.btn.projects':'View Projects',
    'about.eyebrow':'About Us',
    'services.eyebrow':'What We Do','services.h2':'Our <span class="hl">Construction Services</span>',
    'services.desc':'From planning to project handover — complete solutions so you don\'t have to worry about anything.',
    'whyus.eyebrow':'Why Choose Us','whyus.h2':'The <span class="hl">Navin Developer</span> Difference',
    'whyus.desc':'We don\'t just build structures — we build trust, lasting value, and relationships for every single client.',
    'projects.eyebrow':'Our Portfolio','projects.h2':'Featured <span class="hl">Projects</span>',
    'projects.desc':'A selection of our work across Najafgarh and Delhi NCR — residential, commercial, and renovation.',
    'process.eyebrow':'How We Work','process.h2':'Our <span class="hl">Construction Process</span>',
    'process.desc':'A clear, transparent process — no confusion, no surprises. Just results.',
    'videos.eyebrow':'Watch & Learn','videos.h2':'Construction <span class="hl">Videos</span>',
    'videos.desc':'Watch construction timelapses, renovation transformations, and expert construction insights.',
    'testimonials.eyebrow':'Client Reviews','testimonials.h2':'What Our <span class="hl">Clients Say</span>',
    'testimonials.desc':'Real words from real clients across Najafgarh and Delhi NCR.',
    'enquiry.eyebrow':'Get In Touch','enquiry.h2':'Request a <span class="hl">Free Quote</span>',
    'enquiry.desc':'Tell us about your project — we will visit your site and provide a detailed, written estimate within 24 hours. Absolutely free.',
    'form.h3':'Send Your Requirements',
    'form.name':'Full Name','form.phone':'Phone / WhatsApp','form.email':'Email Address',
    'form.service':'Service Required','form.budget':'Estimated Budget',
    'form.location':'Project Location / Area','form.message':'Project Details',
    'form.ph.name':'Your full name','form.ph.phone':'+91 XXXXX XXXXX',
    'form.ph.email':'your@email.com','form.ph.location':'e.g. Najafgarh, Dwarka, Uttam Nagar...',
    'form.ph.message':'Type of work, plot size, number of floors, special requirements...',
    'form.submit':'Submit Enquiry','form.sending':'Sending...',
    'form.note':'Your information is 100% safe. We never share your data.',
    'form.success.h3':'Received!',
    'form.success.p':'Navin ji will call you within <strong>24 hours</strong> for a free site visit.',
    'form.success.btn':'Submit Another Enquiry',
  },
  hi: {
    'nav.home':'होम','nav.about':'हमारे बारे में','nav.services':'सेवाएं',
    'nav.projects':'प्रोजेक्ट्स','nav.videos':'वीडियो','nav.reviews':'समीक्षाएं',
    'nav.quote':'मुफ्त कोटेशन',
    'hero.badge':'दिल्ली NCR का विश्वसनीय निर्माण साझेदार — 2009 से',
    'hero.tagline':'आपका हर सपना, हमारी मेहनत का परिणाम',
    'hero.desc':'योजना, डिज़ाइन, साइट तैयारी, भवन नवीनीकरण और परियोजना प्रबंधन सहित संपूर्ण निर्माण समाधान — नजफगढ़ और पूरे दिल्ली NCR में।',
    'hero.btn.quote':'मुफ्त कोटेशन पाएं','hero.btn.projects':'प्रोजेक्ट देखें',
    'about.eyebrow':'हमारे बारे में',
    'services.eyebrow':'हम क्या करते हैं','services.h2':'हमारी <span class="hl">निर्माण सेवाएं</span>',
    'services.desc':'योजना से प्रोजेक्ट हैंडओवर तक — संपूर्ण समाधान, कोई चिंता नहीं।',
    'whyus.eyebrow':'हमें क्यों चुनें','whyus.h2':'<span class="hl">नवीन डेवलपर</span> की विशेषता',
    'whyus.desc':'हम सिर्फ इमारतें नहीं बनाते — हम विश्वास, स्थायी मूल्य और रिश्ते बनाते हैं।',
    'projects.eyebrow':'हमारा पोर्टफोलियो','projects.h2':'हमारे <span class="hl">प्रमुख प्रोजेक्ट्स</span>',
    'projects.desc':'नजफगढ़ और दिल्ली NCR में हमारे काम की झलक — आवासीय, व्यावसायिक और नवीनीकरण।',
    'process.eyebrow':'हम कैसे काम करते हैं','process.h2':'हमारी <span class="hl">निर्माण प्रक्रिया</span>',
    'process.desc':'स्पष्ट और पारदर्शी प्रक्रिया — कोई भ्रम नहीं, कोई आश्चर्य नहीं।',
    'videos.eyebrow':'देखें और जानें','videos.h2':'निर्माण <span class="hl">वीडियो</span>',
    'videos.desc':'निर्माण टाइमलैप्स, नवीनीकरण और विशेषज्ञ जानकारी देखें।',
    'testimonials.eyebrow':'ग्राहक समीक्षाएं','testimonials.h2':'हमारे <span class="hl">ग्राहक क्या कहते हैं</span>',
    'testimonials.desc':'नजफगढ़ और दिल्ली NCR के असली ग्राहकों के असली शब्द।',
    'enquiry.eyebrow':'संपर्क करें','enquiry.h2':'<span class="hl">मुफ्त कोटेशन</span> के लिए पूछें',
    'enquiry.desc':'अपने प्रोजेक्ट के बारे में बताएं — हम 24 घंटे में साइट विजिट करके लिखित अनुमान देंगे। बिल्कुल मुफ्त।',
    'form.h3':'अपनी जरूरत बताएं',
    'form.name':'पूरा नाम','form.phone':'फोन / व्हाट्सऐप','form.email':'ईमेल पता',
    'form.service':'सेवा चुनें','form.budget':'अनुमानित बजट',
    'form.location':'प्रोजेक्ट का स्थान','form.message':'प्रोजेक्ट का विवरण',
    'form.ph.name':'आपका पूरा नाम','form.ph.phone':'+91 XXXXX XXXXX',
    'form.ph.email':'your@email.com','form.ph.location':'जैसे: नजफगढ़, द्वारका, उत्तम नगर...',
    'form.ph.message':'काम का प्रकार, प्लॉट साइज़, मंजिलें, विशेष आवश्यकताएं...',
    'form.submit':'जानकारी भेजें','form.sending':'भेज रहे हैं...',
    'form.note':'आपकी जानकारी 100% सुरक्षित है। हम कभी शेयर नहीं करते।',
    'form.success.h3':'मिल गया!',
    'form.success.p':'नवीन जी <strong>24 घंटे</strong> में मुफ्त साइट विजिट के लिए कॉल करेंगे।',
    'form.success.btn':'और एक जानकारी भेजें',
  }
};

let currentLang = 'en';

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key] !== undefined) el.textContent = i18n[lang][key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (i18n[lang][key] !== undefined) el.innerHTML = i18n[lang][key];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (i18n[lang][key] !== undefined) el.placeholder = i18n[lang][key];
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
  document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang')));
});

// ===========================
// NAVBAR SCROLL EFFECT
// ===========================
const navbar = document.getElementById('navbar');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    navbar.classList.add('scrolled');
    backToTop.classList.add('visible');
  } else {
    navbar.classList.remove('scrolled');
    backToTop.classList.remove('visible');
  }
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===========================
// HAMBURGER MENU
// ===========================
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('open');
  const bars = hamburger.querySelectorAll('span');
  if (navLinks.classList.contains('open')) {
    bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    bars[1].style.opacity = '0';
    bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
  }
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.querySelectorAll('span').forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
  });
});

// ===========================
// COUNTER ANIMATION
// ===========================
function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-count'));
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current);
  }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num').forEach(el => counterObserver.observe(el));

// ===========================
// FADE IN ANIMATION
// ===========================
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.service-card, .project-card, .why-item, .step, .video-card, .testimonial-card').forEach(el => {
  el.classList.add('fade-in');
  fadeObserver.observe(el);
});

// ===========================
// PROJECT FILTER
// ===========================
const filterBtns = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.getAttribute('data-filter');
    projectCards.forEach(card => {
      if (filter === 'all' || card.getAttribute('data-category') === filter) {
        card.style.display = 'block';
        card.style.animation = 'fadeInUp 0.4s ease forwards';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// ===========================
// TESTIMONIALS SLIDER
// ===========================
const track = document.getElementById('testimonialTrack');
const dotsContainer = document.getElementById('testimonialDots');
const cards = track.querySelectorAll('.testimonial-card');
let currentIdx = 0;
let autoSlide;

function getVisibleCount() {
  if (window.innerWidth <= 768) return 1;
  if (window.innerWidth <= 1024) return 2;
  return 3;
}

function setupDots() {
  dotsContainer.innerHTML = '';
  const total = cards.length - getVisibleCount() + 1;
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  }
}

function goTo(idx) {
  const visible = getVisibleCount();
  const maxIdx = cards.length - visible;
  currentIdx = Math.max(0, Math.min(idx, maxIdx));

  const cardWidth = cards[0].offsetWidth + 24;
  track.style.transform = `translateX(-${currentIdx * cardWidth}px)`;

  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentIdx));
}

document.getElementById('prevBtn').addEventListener('click', () => { goTo(currentIdx - 1); resetAuto(); });
document.getElementById('nextBtn').addEventListener('click', () => { goTo(currentIdx + 1); resetAuto(); });

function startAuto() {
  autoSlide = setInterval(() => {
    const visible = getVisibleCount();
    const maxIdx = cards.length - visible;
    goTo(currentIdx >= maxIdx ? 0 : currentIdx + 1);
  }, 4500);
}

function resetAuto() { clearInterval(autoSlide); startAuto(); }

setupDots();
startAuto();
window.addEventListener('resize', () => { setupDots(); goTo(0); });

// ===========================
// ENQUIRY FORM
// ===========================
const form = document.getElementById('enquiryForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');

function validate() {
  let valid = true;

  const fields = [
    { id: 'name', errorId: 'nameError', msg: 'Please enter your full name.' },
    { id: 'email', errorId: 'emailError', msg: 'Please enter a valid email address.', type: 'email' },
    { id: 'phone', errorId: 'phoneError', msg: 'Please enter your phone number.' },
    { id: 'message', errorId: 'messageError', msg: 'Please describe your project.' }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    const err = document.getElementById(f.errorId);
    const parent = el.parentElement;
    let val = el.value.trim();
    let ok = val.length > 0;

    if (f.type === 'email') {
      ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }

    if (!ok) {
      err.textContent = f.msg;
      parent.classList.add('error');
      valid = false;
    } else {
      err.textContent = '';
      parent.classList.remove('error');
    }
  });

  return valid;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  btnText.style.display = 'none';
  btnLoading.style.display = 'flex';
  submitBtn.disabled = true;

  const data = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    service: document.getElementById('service').value,
    budget: document.getElementById('budget').value,
    projectType: document.getElementById('projectType').value.trim(),
    message: document.getElementById('message').value.trim()
  };

  try {
    const res = await fetch('/api/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.success) {
      form.style.display = 'none';
      const success = document.getElementById('formSuccess');
      const refEl = document.getElementById('enquiryRef');
      refEl.textContent = `Reference ID: ${result.enquiryId}`;
      success.style.display = 'block';

      // Scroll to confirmation
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(result.message || 'Something went wrong. Please try again.');
      resetSubmitBtn();
    }
  } catch (err) {
    alert('Unable to submit. Please check your connection and try again.');
    resetSubmitBtn();
  }
});

function resetSubmitBtn() {
  btnText.style.display = 'flex';
  btnLoading.style.display = 'none';
  submitBtn.disabled = false;
}

document.getElementById('resetFormBtn').addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  form.style.display = 'block';
  document.getElementById('formSuccess').style.display = 'none';
  resetSubmitBtn();
  document.getElementById('enquiryForm').scrollIntoView({ behavior: 'smooth' });
};

// ===========================
// SMOOTH ACTIVE NAV
// ===========================
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(a => {
        a.style.color = '';
        if (a.getAttribute('href') === `#${entry.target.id}`) {
          a.style.color = 'var(--primary)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(sec => navObserver.observe(sec));
