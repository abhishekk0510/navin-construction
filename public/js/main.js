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

window.resetForm = function () {
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
