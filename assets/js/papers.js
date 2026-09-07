/**
 * papers.js — VTA ICT L5 Community  |  Premium 2026
 *
 * Architecture:
 *   Hero → Search/Filters → Subject Category Bar → 3-col Card Grid
 *
 * Filter chain:  type → year → semester → subject → search
 *
 * Supabase table: papers
 * Columns: id, title, year, semester, category, subject, type, pdf_url, pages, created_at
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════
     SUBJECT DEFINITIONS (canonical order + metadata)
  ══════════════════════════════════════════════════ */
  const SUBJECTS = [
    { key: 'Programming',            emoji: '💻' },
    { key: 'Database Systems',       emoji: '🗄️' },
    { key: 'Networking',             emoji: '🌐' },
    { key: 'Web Development',        emoji: '🖥️' },
    { key: 'Software Testing',       emoji: '🧪' },
    { key: 'Graphic Design',         emoji: '🎨' },
    { key: 'System Analysis',        emoji: '📊' },
    { key: 'Information Management', emoji: '📋' },
    { key: 'Communication',          emoji: '📡' },
    { key: 'Other',                  emoji: '📦' },
  ];

  /* ══════════════════════════════════════════════════
     DEMO DATA — spans 2010–2025 (fallback)
  ══════════════════════════════════════════════════ */
  const DEMO = [
    // ── 2025 ──────────────────────────────────────
    { id:1,  title:'Programming Concepts & Algorithms',  year:2025, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:10 },
    { id:2,  title:'Programming Concepts & Algorithms',  year:2025, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:14 },
    { id:3,  title:'Database Systems Design',            year:2025, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:9  },
    { id:4,  title:'Database Systems Design',            year:2025, semester:1, category:'batch',  subject:'Database Systems',       type:'model',  pdf_url:null, pages:8  },
    { id:5,  title:'Networking & LAN Technologies',      year:2025, semester:1, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:8  },
    { id:6,  title:'Networking & LAN Technologies',      year:2025, semester:1, category:'batch',  subject:'Networking',             type:'answer', pdf_url:null, pages:11 },
    { id:7,  title:'Programming Concepts & Algorithms',  year:2025, semester:1, category:'repeat', subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    { id:8,  title:'Programming Concepts & Algorithms',  year:2025, semester:1, category:'repeat', subject:'Programming',            type:'answer', pdf_url:null, pages:10 },
    { id:9,  title:'Web Development Fundamentals',       year:2025, semester:2, category:'batch',  subject:'Web Development',        type:'paper',  pdf_url:null, pages:7  },
    { id:10, title:'Web Development Fundamentals',       year:2025, semester:2, category:'batch',  subject:'Web Development',        type:'answer', pdf_url:null, pages:11 },
    { id:11, title:'Software Testing Methods',           year:2025, semester:2, category:'batch',  subject:'Software Testing',       type:'paper',  pdf_url:null, pages:8  },
    { id:12, title:'Software Testing Methods',           year:2025, semester:2, category:'batch',  subject:'Software Testing',       type:'answer', pdf_url:null, pages:11 },
    { id:13, title:'System Analysis & Design',           year:2025, semester:2, category:'batch',  subject:'System Analysis',        type:'model',  pdf_url:null, pages:9  },
    // ── 2024 ──────────────────────────────────────
    { id:14, title:'Programming: Java & Python',         year:2024, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:10 },
    { id:15, title:'Programming: Java & Python',         year:2024, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:14 },
    { id:16, title:'Database Systems',                   year:2024, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:9  },
    { id:17, title:'Database Systems',                   year:2024, semester:1, category:'batch',  subject:'Database Systems',       type:'model',  pdf_url:null, pages:9  },
    { id:18, title:'Programming: Java & Python',         year:2024, semester:1, category:'repeat', subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    { id:19, title:'Graphic Design Principles',          year:2024, semester:2, category:'batch',  subject:'Graphic Design',         type:'paper',  pdf_url:null, pages:7  },
    { id:20, title:'Information Management Systems',     year:2024, semester:2, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:8  },
    { id:21, title:'Information Management Systems',     year:2024, semester:2, category:'batch',  subject:'Information Management', type:'answer', pdf_url:null, pages:10 },
    { id:22, title:'System Analysis & Design',           year:2024, semester:2, category:'repeat', subject:'System Analysis',        type:'paper',  pdf_url:null, pages:9  },
    // ── 2023 ──────────────────────────────────────
    { id:23, title:'Object-Oriented Programming',        year:2023, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:10 },
    { id:24, title:'Object-Oriented Programming',        year:2023, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:12 },
    { id:25, title:'Database Administration',            year:2023, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:8  },
    { id:26, title:'Network Security Fundamentals',      year:2023, semester:1, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:9  },
    { id:27, title:'Network Security Fundamentals',      year:2023, semester:1, category:'batch',  subject:'Networking',             type:'answer', pdf_url:null, pages:11 },
    { id:28, title:'Technical Communication Skills',     year:2023, semester:2, category:'batch',  subject:'Communication',          type:'paper',  pdf_url:null, pages:6  },
    { id:29, title:'Web Application Development',        year:2023, semester:2, category:'batch',  subject:'Web Development',        type:'paper',  pdf_url:null, pages:8  },
    { id:30, title:'Web Application Development',        year:2023, semester:2, category:'batch',  subject:'Web Development',        type:'model',  pdf_url:null, pages:9  },
    // ── 2022 ──────────────────────────────────────
    { id:31, title:'C++ Programming Fundamentals',       year:2022, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:10 },
    { id:32, title:'C++ Programming Fundamentals',       year:2022, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:13 },
    { id:33, title:'Relational Database Management',     year:2022, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:9  },
    { id:34, title:'Relational Database Management',     year:2022, semester:1, category:'batch',  subject:'Database Systems',       type:'model',  pdf_url:null, pages:8  },
    { id:35, title:'LAN & WAN Infrastructure',           year:2022, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:8  },
    { id:36, title:'Information Systems Management',     year:2022, semester:2, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:7  },
    { id:37, title:'Software Quality Assurance',         year:2022, semester:2, category:'batch',  subject:'Software Testing',       type:'paper',  pdf_url:null, pages:8  },
    // ── 2021 ──────────────────────────────────────
    { id:38, title:'Python Programming',                 year:2021, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:9  },
    { id:39, title:'Python Programming',                 year:2021, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:11 },
    { id:40, title:'Database Design Concepts',           year:2021, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:8  },
    { id:41, title:'TCP/IP Networking',                  year:2021, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:7  },
    { id:42, title:'Web Design & UX',                    year:2021, semester:2, category:'batch',  subject:'Web Development',        type:'paper',  pdf_url:null, pages:8  },
    { id:43, title:'Business Communication',             year:2021, semester:2, category:'batch',  subject:'Communication',          type:'paper',  pdf_url:null, pages:6  },
    // ── 2020 ──────────────────────────────────────
    { id:44, title:'Java Programming',                   year:2020, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:10 },
    { id:45, title:'Java Programming',                   year:2020, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:12 },
    { id:46, title:'Database Systems',                   year:2020, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:9  },
    { id:47, title:'Computer Networking',                year:2020, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:8  },
    { id:48, title:'Systems Analysis & Design',          year:2020, semester:2, category:'batch',  subject:'System Analysis',        type:'paper',  pdf_url:null, pages:9  },
    // ── 2019 ──────────────────────────────────────
    { id:49, title:'Structured Programming',             year:2019, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:9  },
    { id:50, title:'Structured Programming',             year:2019, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:11 },
    { id:51, title:'Database Management Systems',        year:2019, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:8  },
    { id:52, title:'Network Administration',             year:2019, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:8  },
    { id:53, title:'Management Information Systems',     year:2019, semester:2, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:7  },
    // ── 2018 ──────────────────────────────────────
    { id:54, title:'Programming Fundamentals',           year:2018, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:9  },
    { id:55, title:'Programming Fundamentals',           year:2018, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:10 },
    { id:56, title:'Database Systems Design',            year:2018, semester:1, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:8  },
    { id:57, title:'Data Communications',                year:2018, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:7  },
    { id:58, title:'English for ICT',                    year:2018, semester:2, category:'batch',  subject:'Communication',          type:'paper',  pdf_url:null, pages:6  },
    // ── 2017 ──────────────────────────────────────
    { id:59, title:'Introduction to Programming',        year:2017, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    { id:60, title:'Introduction to Programming',        year:2017, semester:1, category:'batch',  subject:'Programming',            type:'model',  pdf_url:null, pages:7  },
    { id:61, title:'Database Fundamentals',              year:2017, semester:2, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:8  },
    { id:62, title:'Network Concepts',                   year:2017, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:7  },
    // ── 2016 ──────────────────────────────────────
    { id:63, title:'Computer Programming I',             year:2016, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:9  },
    { id:64, title:'Computer Programming I',             year:2016, semester:1, category:'batch',  subject:'Programming',            type:'answer', pdf_url:null, pages:11 },
    { id:65, title:'Data Structures',                    year:2016, semester:2, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    { id:66, title:'Introduction to Networking',         year:2016, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:7  },
    // ── 2015 ──────────────────────────────────────
    { id:67, title:'Basic Programming Concepts',         year:2015, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    { id:68, title:'Information Technology Essentials',  year:2015, semester:1, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:7  },
    { id:69, title:'Database Concepts',                  year:2015, semester:2, category:'batch',  subject:'Database Systems',       type:'paper',  pdf_url:null, pages:8  },
    // ── 2014 ──────────────────────────────────────
    { id:70, title:'Computer Science Foundations',       year:2014, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    { id:71, title:'System Design Principles',           year:2014, semester:2, category:'batch',  subject:'System Analysis',        type:'paper',  pdf_url:null, pages:7  },
    // ── 2013 ──────────────────────────────────────
    { id:72, title:'Procedural Programming',             year:2013, semester:1, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    { id:73, title:'Network Infrastructure Basics',      year:2013, semester:2, category:'batch',  subject:'Networking',             type:'paper',  pdf_url:null, pages:7  },
    // ── 2012 ──────────────────────────────────────
    { id:74, title:'Fundamentals of ICT',                year:2012, semester:1, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:7  },
    { id:75, title:'Programming Logic & Design',         year:2012, semester:2, category:'batch',  subject:'Programming',            type:'paper',  pdf_url:null, pages:8  },
    // ── 2011 ──────────────────────────────────────
    { id:76, title:'Introduction to Computers',          year:2011, semester:1, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:6  },
    { id:77, title:'Basic Computer Applications',        year:2011, semester:2, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:7  },
    // ── 2010 ──────────────────────────────────────
    { id:78, title:'Computer Literacy',                  year:2010, semester:1, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:6  },
    { id:79, title:'ICT Fundamentals',                   year:2010, semester:2, category:'batch',  subject:'Information Management', type:'paper',  pdf_url:null, pages:7  },
  ];

  /* ══════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════ */
  const S = {
    all:            [],
    typeFilter:     'all',
    yearFilter:     'all',
    semFilter:      'all',
    subjectFilter:  'all',
    searchTerm:     '',
    saved:          new Set(),
    filterOpen:     false,
    pendingYear:    'all',
    pendingSem:     'all',
  };

  /* ══════════════════════════════════════════════════
     DOM
  ══════════════════════════════════════════════════ */
  const $  = id  => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const searchInput   = $('papersSearch');
  const clearBtn      = $('papersClearBtn');
  const filterToggle  = $('papersFilterToggle');
  const filterOverlay = $('papersFilterOverlay');
  const filterPopup   = $('papersFilterPopup');
  const filterClose   = $('papersFilterClose');
  const fpYearGrid    = $('fpYearGrid');
  const fpSemRow      = $('fpSemRow');
  const fpResetBtn    = $('fpResetBtn');
  const fpApplyBtn    = $('fpApplyBtn');
  const typeTabs      = $$('.papers-type-tab');
  const subjectBar    = $('papersSubjectBar');
  const loadingEl     = $('papersLoading');
  const emptyEl       = $('papersEmpty');
  const cardGrid      = $('papersCardGrid');
  const statsCount    = $('papersStatsCount');
  const activeFilters = $('papersActiveFilters');
  const statsReset    = $('papersStatsReset');
  const emptyReset    = $('papersEmptyReset');
  const modalBackdrop = $('pmodalBackdrop');
  const modalFrame    = $('pmodalFrame');
  const modalTitle    = $('pmodalTitle');
  const modalClose    = $('pmodalClose');

  /* ══════════════════════════════════════════════════
     FETCH
  ══════════════════════════════════════════════════ */
  function parsePapersData() {
    if (typeof papersData === 'undefined') return [];
    
    return papersData.map((item, index) => {
      let year = 2026;
      const yearMatch = item.folder.match(/(20\d{2})(?:\s*-\s*(20\d{2}))?/);
      if (yearMatch) {
        if (yearMatch[2]) {
          year = `${yearMatch[1]}-${yearMatch[2]}`;
        } else {
          year = parseInt(yearMatch[1], 10);
        }
      }
      
      let semester = 1;
      const fLower = item.folder.toLowerCase();
      if (fLower.includes('semester 2') || fLower.includes('semester2') || fLower.includes('semester 11')) {
        semester = 2;
      } else if (fLower.includes('sem 2') || fLower.includes('sem2')) {
        semester = 2;
      }
      
      let category = 'batch';
      if (fLower.includes('repeat') || fLower.includes('repet')) {
        category = 'repeat';
      }
      
      let subject = 'Other';
      const t = item.title.toLowerCase();
      
      if (t.includes('lan') || t.includes('network') || t.includes('data communication') || t.includes('tcp/ip') || t.includes('data comm')) {
        subject = 'Networking';
      } else if (t.includes('software programming') || t.includes('programming') || t.includes('algorithm') || t.includes('sw programming')) {
        subject = 'Programming';
      } else if (t.includes('web') || t.includes('web design') || t.includes('web programming')) {
        subject = 'Web Development';
      } else if (t.includes('database') || t.includes('dbms')) {
        subject = 'Database Systems';
      } else if (t.includes('graphic') || t.includes('design')) {
        subject = 'Graphic Design';
      } else if (t.includes('testing') || t.includes('qa') || t.includes('sw testing')) {
        subject = 'Software Testing';
      } else if (t.includes('sad') || t.includes('system analysis') || t.includes('system analysys')) {
        subject = 'System Analysis';
      } else if (t.includes('workplace') || t.includes('communication') || t.includes('management') || t.includes('work place')) {
        subject = 'Communication';
      }

      let type = 'paper';
      if (t.includes('model')) {
        type = 'model';
      } else if (t.includes('answer') || t.includes('marking scheme')) {
        type = 'answer';
      }
      
      return {
        id: index + 1000,
        title: item.title,
        year: year,
        semester: semester,
        category: category,
        subject: subject,
        type: type,
        previewUrl: item.previewUrl,
        downloadUrl: item.downloadUrl,
        pages: null
      };
    });
  }

  function parseAnswersData() {
    if (typeof answersData === 'undefined') return [];
    
    return answersData.map((item, index) => {
      let year = 2026;
      const yearMatch = item.folder.match(/(20\d{2})(?:\s*-\s*(20\d{2}))?/);
      if (yearMatch) {
        if (yearMatch[2]) {
          year = `${yearMatch[1]}-${yearMatch[2]}`;
        } else {
          year = parseInt(yearMatch[1], 10);
        }
      }
      
      let semester = 1;
      const fLower = item.folder.toLowerCase();
      if (fLower.includes('semester 2') || fLower.includes('semester2') || fLower.includes('2nd')) {
        semester = 2;
      } else if (fLower.includes('sem 2') || fLower.includes('sem2')) {
        semester = 2;
      }
      
      let category = 'batch';
      if (fLower.includes('repeat') || fLower.includes('repet') || fLower.includes('retest') || item.title.toLowerCase().includes('retest') || item.title.toLowerCase().includes('repeat')) {
        category = 'repeat';
      }
      
      let subject = 'Other';
      const t = item.title.toLowerCase();
      const combinedT = t + " " + fLower;
      
      if (t.includes('lan') || t.includes('network') || t.includes('data communication') || t.includes('tcp/ip') || t.includes('data comm')) {
        subject = 'Networking';
      } else if (t.includes('software programming') || t.includes('programming') || t.includes('algorithm') || t.includes('sw programming') || t.includes('sp_') || t.includes('_sp_') || t.includes('swp') || t.includes('practical_sp') || t.includes('sp ')) {
        subject = 'Programming';
      } else if (t.includes('web') || t.includes('web design') || t.includes('web programming') || t.includes('webtheory')) {
        subject = 'Web Development';
      } else if (t.includes('database') || t.includes('dbms') || t.includes('db_') || t.includes('_db_') || t.includes('db ')) {
        subject = 'Database Systems';
      } else if (t.includes('graphic') || t.includes('design') || t.includes('cgd')) {
        subject = 'Graphic Design';
      } else if (t.includes('testing') || t.includes('qa') || t.includes('swtesting') || t.includes('sw_testing')) {
        subject = 'Software Testing';
      } else if (t.includes('sad') || t.includes('system analysis') || t.includes('system analysys')) {
        subject = 'System Analysis';
      } else if (t.includes('workplace information') || t.includes('information') || t.includes('wmi') || t.includes('mwi')) {
        subject = 'Information Management';
      } else if (t.includes('workplace') || t.includes('communication') || t.includes('management') || t.includes('work place') || t.includes('mwc') || t.includes('plan-work-to-be-perform') || t.includes('empm')) {
        subject = 'Communication';
      }

      return {
        id: index + 5000,
        title: item.title.replace(/_/g, ' ').replace(/\.PDF|\.pdf/i, ''),
        year: year,
        semester: semester,
        category: category,
        subject: subject,
        type: 'answer',
        previewUrl: item.previewUrl,
        downloadUrl: item.downloadUrl,
        pages: null
      };
    });
  }

  async function fetchPapers() {
    showLoading();
    try {
      if (typeof papersData !== 'undefined' && papersData.length > 0) {
        const parsedPapers = parsePapersData();
        const parsedAnswers = parseAnswersData();
        S.all = [...parsedPapers, ...parsedAnswers];
      } else if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient
          .from('papers')
          .select('*')
          .order('year', { ascending: false })
          .order('semester', { ascending: true });
        if (error) throw error;
        S.all = (data && data.length > 0) ? data : DEMO;
      } else {
        S.all = DEMO;
      }
    } catch (e) {
      console.warn('papers.js: using demo data.', e);
      S.all = DEMO;
    }
    buildYearGrid();
    buildSubjectBar();
    hideLoading();
    render();
  }

  /* ══════════════════════════════════════════════════
     BUILD YEAR GRID (from actual data)
  ══════════════════════════════════════════════════ */
  function buildYearGrid() {
    const yearsSet = new Set();
    S.all.forEach(p => {
      String(p.year).split('-').forEach(y => yearsSet.add(parseInt(y.trim(), 10)));
    });
    const years = [...yearsSet].filter(y => !isNaN(y)).sort((a, b) => b - a);

    fpYearGrid.innerHTML = '';

    // "All Years" — spans full width
    const allBtn = makeYearBtn('all', 'All Years');
    allBtn.classList.add('active');
    fpYearGrid.appendChild(allBtn);

    years.forEach(y => fpYearGrid.appendChild(makeYearBtn(y, y)));

    // Events
    fpYearGrid.querySelectorAll('.fp-year-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        fpYearGrid.querySelectorAll('.fp-year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        S.pendingYear = btn.dataset.year;
      });
    });
  }

  function makeYearBtn(val, label) {
    const btn = document.createElement('button');
    btn.className = 'fp-year-btn';
    btn.dataset.year = val;
    btn.textContent = label;
    return btn;
  }

  /* ══════════════════════════════════════════════════
     BUILD SUBJECT CATEGORY BAR
  ══════════════════════════════════════════════════ */
  function buildSubjectBar() {
    // Collect subjects that exist in the dataset
    const presentSubjects = new Set(S.all.map(p => p.subject));

    subjectBar.innerHTML = '';

    // "All" first
    subjectBar.appendChild(makeSubjectBtn('all', '🔴', 'All'));

    // Known subjects in canonical order.
    // After 'Graphic Design' inject a row-break so the remaining
    // pills (System Analysis, Information Management, Communication)
    // start on a centred second row.
    const ROW_BREAK_AFTER = 'Graphic Design';
    SUBJECTS.forEach(s => {
      if (presentSubjects.has(s.key)) {
        subjectBar.appendChild(makeSubjectBtn(s.key, s.emoji, s.key));
        if (s.key === ROW_BREAK_AFTER) {
          const br = document.createElement('div');
          br.className = 'psb-row-break';
          br.setAttribute('aria-hidden', 'true');
          subjectBar.appendChild(br);
        }
      }
    });

    // Any unknown subjects from data not in our list
    presentSubjects.forEach(sub => {
      if (sub && !SUBJECTS.find(s => s.key === sub)) {
        subjectBar.appendChild(makeSubjectBtn(sub, '📦', sub));
      }
    });

    // "All" starts active
    subjectBar.querySelector('.psb-item').classList.add('active');

    // Events
    subjectBar.querySelectorAll('.psb-item').forEach(btn => {
      btn.addEventListener('click', () => {
        subjectBar.querySelectorAll('.psb-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        S.subjectFilter = btn.dataset.subject;
        render();
      });
    });
  }

  function makeSubjectBtn(subjectKey, emoji, label) {
    const btn = document.createElement('button');
    btn.className = 'psb-item';
    btn.dataset.subject = subjectKey;
    btn.setAttribute('aria-label', `Filter by ${label}`);
    btn.innerHTML = `<span class="psb-emoji">${emoji}</span>${label}`;
    return btn;
  }

  /* ══════════════════════════════════════════════════
     FILTER
  ══════════════════════════════════════════════════ */
  function filtered() {
    return S.all.filter(p => {
      if (S.typeFilter    !== 'all' && p.type            !== S.typeFilter)          return false;
      if (S.yearFilter    !== 'all' && !String(p.year).split('-').includes(String(S.yearFilter)))  return false;
      if (S.semFilter     !== 'all' && String(p.semester) !== String(S.semFilter)) return false;
      if (S.subjectFilter !== 'all' && p.subject         !== S.subjectFilter)      return false;
      if (S.searchTerm) {
        const q = S.searchTerm.toLowerCase();
        const h = [p.title, p.subject, String(p.year), `semester ${p.semester}`, p.category, p.type]
          .join(' ').toLowerCase();
        if (!h.includes(q)) return false;
      }
      return true;
    });
  }

  const isFiltered = () =>
    S.typeFilter    !== 'all' ||
    S.yearFilter    !== 'all' ||
    S.semFilter     !== 'all' ||
    S.subjectFilter !== 'all' ||
    !!S.searchTerm;

  /* ══════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════ */
  function render() {
    const data  = filtered();
    const total = S.all.length;

    // Stats count
    if (isFiltered()) {
      statsCount.innerHTML = `Showing <strong>${data.length}</strong> of <strong>${total}</strong> papers`;
      statsReset.style.display = 'flex';
    } else {
      statsCount.innerHTML = `<strong>${total}</strong> papers in archive`;
      statsReset.style.display = 'none';
    }

    // Active filter tags
    renderFilterTags();

    // Filter dot on button
    filterToggle.classList.toggle('has-filter', S.yearFilter !== 'all' || S.semFilter !== 'all');

    if (data.length === 0) { showEmpty(); return; }
    hideEmpty();
    renderGrid(data);
  }

  /* ── Active filter tags ── */
  function renderFilterTags() {
    activeFilters.innerHTML = '';

    const addTag = (label, clearFn) => {
      const tag = document.createElement('button');
      tag.className = 'paf-tag';
      tag.innerHTML = `${esc(label)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      tag.setAttribute('aria-label', `Remove ${label} filter`);
      tag.addEventListener('click', () => { clearFn(); render(); });
      activeFilters.appendChild(tag);
    };

    if (S.yearFilter    !== 'all') addTag(`Year: ${S.yearFilter}`,    () => { S.yearFilter = 'all'; syncYearGrid('all'); });
    if (S.semFilter     !== 'all') addTag(`Sem: ${S.semFilter}`,      () => { S.semFilter  = 'all'; syncSemRow('all');   });
    if (S.subjectFilter !== 'all') addTag(S.subjectFilter,            () => { S.subjectFilter = 'all'; syncSubjectBar('all'); });
    if (S.typeFilter    !== 'all') addTag(S.typeFilter,               () => { S.typeFilter = 'all'; syncTypeTabs('all');  });
    if (S.searchTerm)              addTag(`"${S.searchTerm}"`,        () => { S.searchTerm = ''; searchInput.value = ''; clearBtn.classList.remove('visible'); });
  }

  /* ── Card grid ── */
  function renderGrid(data) {
    cardGrid.innerHTML = '';
    cardGrid.style.display = 'grid';
    data.forEach((p, i) => {
      const card = buildPDFCard(p);
      card.style.animationDelay = `${Math.min(i * 0.03, 0.45)}s`;
      cardGrid.appendChild(card);
    });
  }

  /* ══════════════════════════════════════════════════
     PDF CARD BUILDER
  ══════════════════════════════════════════════════ */
  function buildPDFCard(paper) {
    const card = document.createElement('div');
    card.className = `pa-pdf-card type-${paper.type}`;

    const typeLabel    = { paper:'Paper', answer:'Answer', model:'Model Paper' }[paper.type] || paper.type;
    const catLabel     = paper.category === 'batch' ? 'Batch' : 'Repeat';
    const isSaved      = S.saved.has(paper.id);
    const downloadUrl  = paper.downloadUrl || paper.pdf_url;
    let previewUrl     = paper.previewUrl || paper.pdf_url;

    if (downloadUrl && downloadUrl.includes('drive.google.com/uc?export=download&id=')) {
      const fileIdMatch = downloadUrl.match(/id=([^&]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        previewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }
    } else if (previewUrl && previewUrl.includes('/view')) {
      previewUrl = previewUrl.replace(/\/view\/?$/, '/preview');
    }

    const hasUrl       = !!previewUrl;
    const dlExtraClass = paper.type === 'answer' ? 'answer-btn' : paper.type === 'model' ? 'model-btn' : '';

    const { iconSvg, iconClass } = subjectIconData(paper.subject);
    const subMeta = SUBJECTS.find(s => s.key === paper.subject);
    const subIcon = subMeta ? subMeta.emoji : '📄';

    card.innerHTML = `
      <div class="pa-card-top">
        <div class="pa-pdf-icon-wrap ${iconClass}" aria-hidden="true">${iconSvg}</div>
        <button class="pa-bookmark-btn${isSaved ? ' saved' : ''}" aria-label="${isSaved ? 'Remove bookmark' : 'Save paper'}" data-id="${paper.id}">
          <svg viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      <div class="pa-card-body">
        <div class="pa-subject-name">${subIcon} ${esc(paper.subject || 'ICT L5')}</div>
        <div class="pa-pdf-title">${esc(paper.title)}</div>

        <div class="pa-card-badges">
          <span class="pa-type-badge ${paper.type}">${typeLabel}</span>
          <span class="pa-cat-badge ${paper.category}">${catLabel}</span>
        </div>

        <div class="pa-pdf-meta">
          <span class="pa-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${paper.year}
          </span>
          <span class="pa-meta-dot"></span>
          <span class="pa-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Sem ${paper.semester}
          </span>
          ${paper.pages ? `
          <span class="pa-meta-dot"></span>
          <span class="pa-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${paper.pages} pg
          </span>` : ''}
        </div>
      </div>

      <div class="pa-pdf-actions">
        <button class="pa-btn-preview" ${hasUrl ? '' : 'disabled'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>
        ${downloadUrl
          ? `<a class="pa-btn-download ${dlExtraClass}" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Download
             </a>`
          : `<button class="pa-btn-download ${dlExtraClass}" disabled>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Download
             </button>`
        }
      </div>
    `;

    // Preview listener
    if (hasUrl) {
      card.querySelector('.pa-btn-preview').addEventListener('click', () => openModal(previewUrl, paper.title));
    }

    // Bookmark listener
    const bm = card.querySelector('.pa-bookmark-btn');
    bm.addEventListener('click', () => {
      if (S.saved.has(paper.id)) {
        S.saved.delete(paper.id);
        bm.classList.remove('saved');
        bm.querySelector('svg').setAttribute('fill', 'none');
        bm.setAttribute('aria-label', 'Save paper');
      } else {
        S.saved.add(paper.id);
        bm.classList.add('saved');
        bm.querySelector('svg').setAttribute('fill', 'currentColor');
        bm.setAttribute('aria-label', 'Remove bookmark');
      }
    });

    return card;
  }

  /* ══════════════════════════════════════════════════
     SUBJECT ICON SVG DATA
  ══════════════════════════════════════════════════ */
  function subjectIconData(subject) {
    const s = (subject || '').toLowerCase();

    if (s.includes('programming') || s.includes('java') || s.includes('python') || s.includes('c++') || s.includes('algorithm'))
      return { iconClass:'subject-programming', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6" stroke="#3b82f6"/><polyline points="8 6 2 12 8 18" stroke="#60a5fa"/></svg>` };

    if (s.includes('database') || s.includes('db') || s.includes('sql') || s.includes('relational'))
      return { iconClass:'subject-database', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" stroke="#8b5cf6"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" stroke="#a78bfa"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="#8b5cf6"/></svg>` };

    if (s.includes('network') || s.includes('lan') || s.includes('wan') || s.includes('tcp') || s.includes('communication') && s.includes('data'))
      return { iconClass:'subject-networking', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#06b6d4"/><line x1="2" y1="12" x2="22" y2="12" stroke="#22d3ee"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#06b6d4"/></svg>` };

    if (s.includes('web') || s.includes('html') || s.includes('css') || s.includes('ux') || s.includes('frontend'))
      return { iconClass:'subject-web', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 9 12 3 21 9 21 20 3 20 3 9" stroke="#22c55e"/><polyline points="9 20 9 12 15 12 15 20" stroke="#4ade80"/></svg>` };

    if (s.includes('communication') || s.includes('english') || s.includes('language') || s.includes('business comm') || s.includes('technical comm'))
      return { iconClass:'subject-communication', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#ec4899"/><line x1="9" y1="10" x2="15" y2="10" stroke="#f472b6"/></svg>` };

    if (s.includes('graphic') || s.includes('design') || s.includes('ui') || s.includes('visual'))
      return { iconClass:'subject-design', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="#ec4899" stroke="#ec4899"/><circle cx="17.5" cy="10.5" r="0.5" fill="#ec4899" stroke="#ec4899"/><circle cx="8.5" cy="7.5" r="0.5" fill="#f472b6" stroke="#f472b6"/><circle cx="6.5" cy="12.5" r="0.5" fill="#f472b6" stroke="#f472b6"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#ec4899"/></svg>` };

    if (s.includes('testing') || s.includes('qa') || s.includes('quality'))
      return { iconClass:'subject-testing', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4" stroke="#f97316"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#fb923c"/></svg>` };

    if (s.includes('system') || s.includes('analysis') || s.includes('design') && s.includes('system'))
      return { iconClass:'subject-system', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" stroke="#14b8a6"/><line x1="8" y1="21" x2="16" y2="21" stroke="#2dd4bf"/><line x1="12" y1="17" x2="12" y2="21" stroke="#14b8a6"/></svg>` };

    if (s.includes('information') || s.includes('management') || s.includes('mis') || s.includes('ict') || s.includes('computer literacy') || s.includes('it essential'))
      return { iconClass:'subject-info', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#a855f7"/><line x1="12" y1="8" x2="12" y2="12" stroke="#c084fc"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="#c084fc" stroke-width="2.5"/></svg>` };

    return { iconClass:'subject-default', iconSvg:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#c0394e"/><polyline points="14 2 14 8 20 8" stroke="#f87171"/><line x1="9" y1="13" x2="15" y2="13" stroke="#c0394e"/><line x1="9" y1="17" x2="13" y2="17" stroke="#c0394e"/></svg>` };
  }

  /* ══════════════════════════════════════════════════
     UI SYNC HELPERS
  ══════════════════════════════════════════════════ */
  function syncYearGrid(val) {
    S.yearFilter = val;
    fpYearGrid.querySelectorAll('.fp-year-btn').forEach(b => {
      b.classList.toggle('active', String(b.dataset.year) === String(val));
    });
  }

  function syncSemRow(val) {
    S.semFilter = val;
    fpSemRow.querySelectorAll('.fp-sem-btn').forEach(b => {
      b.classList.toggle('active', String(b.dataset.sem) === String(val));
    });
  }

  function syncSubjectBar(val) {
    S.subjectFilter = val;
    subjectBar.querySelectorAll('.psb-item').forEach(b => {
      b.classList.toggle('active', b.dataset.subject === val);
    });
  }

  function syncTypeTabs(val) {
    S.typeFilter = val;
    typeTabs.forEach(t => {
      const match = t.dataset.type === val;
      t.classList.toggle('active', match);
      t.setAttribute('aria-selected', match);
    });
  }

  /* ══════════════════════════════════════════════════
     TYPE TABS
  ══════════════════════════════════════════════════ */
  typeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      syncTypeTabs(tab.dataset.type);
      render();
    });
  });

  /* ══════════════════════════════════════════════════
     SEMESTER BUTTONS
  ══════════════════════════════════════════════════ */
  fpSemRow.querySelectorAll('.fp-sem-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fpSemRow.querySelectorAll('.fp-sem-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.pendingSem = btn.dataset.sem;
    });
  });

  /* ══════════════════════════════════════════════════
     FILTER POPUP OPEN / CLOSE
  ══════════════════════════════════════════════════ */
  function openFilter() {
    S.pendingYear = S.yearFilter;
    S.pendingSem  = S.semFilter;
    // Reflect committed state in popup UI
    fpYearGrid.querySelectorAll('.fp-year-btn').forEach(b =>
      b.classList.toggle('active', String(b.dataset.year) === String(S.pendingYear))
    );
    fpSemRow.querySelectorAll('.fp-sem-btn').forEach(b =>
      b.classList.toggle('active', String(b.dataset.sem) === String(S.pendingSem))
    );
    filterOverlay.classList.add('open');
    filterPopup.classList.add('open');
    filterToggle.setAttribute('aria-expanded', 'true');
    filterToggle.classList.add('active');
    S.filterOpen = true;
  }

  function closeFilter() {
    filterOverlay.classList.remove('open');
    filterPopup.classList.remove('open');
    filterToggle.setAttribute('aria-expanded', 'false');
    filterToggle.classList.remove('active');
    S.filterOpen = false;
  }

  filterToggle.addEventListener('click', () => S.filterOpen ? closeFilter() : openFilter());
  filterClose.addEventListener('click', closeFilter);
  filterOverlay.addEventListener('click', closeFilter);

  fpApplyBtn.addEventListener('click', () => {
    S.yearFilter = S.pendingYear;
    S.semFilter  = S.pendingSem;
    closeFilter();
    render();
  });

  fpResetBtn.addEventListener('click', () => {
    S.pendingYear = 'all';
    S.pendingSem  = 'all';
    fpYearGrid.querySelectorAll('.fp-year-btn').forEach(b => b.classList.toggle('active', b.dataset.year === 'all'));
    fpSemRow.querySelectorAll('.fp-sem-btn').forEach(b  => b.classList.toggle('active', b.dataset.sem  === 'all'));
  });

  /* ══════════════════════════════════════════════════
     SEARCH
  ══════════════════════════════════════════════════ */
  searchInput.addEventListener('input', () => {
    S.searchTerm = searchInput.value.trim();
    clearBtn.classList.toggle('visible', !!S.searchTerm);
    render();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    S.searchTerm = '';
    clearBtn.classList.remove('visible');
    render();
    searchInput.focus();
  });

  /* ══════════════════════════════════════════════════
     GLOBAL RESET
  ══════════════════════════════════════════════════ */
  function fullReset() {
    syncTypeTabs('all');
    syncYearGrid('all');
    syncSemRow('all');
    syncSubjectBar('all');
    S.searchTerm = '';
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    render();
  }

  if (statsReset) statsReset.addEventListener('click', fullReset);
  if (emptyReset) emptyReset.addEventListener('click', fullReset);

  /* ══════════════════════════════════════════════════
     MODAL
  ══════════════════════════════════════════════════ */
  function openModal(url, title) {
    modalTitle.textContent = title || 'Preview';
    
    let iframeUrl = url;
    const isPdf = url.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      iframeUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0`;
    }

    let fallbackAttempted = false;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let loadTimeout;

    const fallbackToGoogle = () => {
        if (fallbackAttempted || !isPdf) return;
        fallbackAttempted = true;
        modalFrame.src = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    };

    modalFrame.onload = () => {
        clearTimeout(loadTimeout);
        if (isMobile && isPdf && !fallbackAttempted) {
            try {
                const doc = modalFrame.contentDocument || modalFrame.contentWindow.document;
                if (doc && (!doc.body || doc.body.children.length === 0 || doc.body.innerHTML.trim() === '')) {
                    fallbackToGoogle();
                    return;
                }
            } catch (e) {}
        }
    };
    
    modalFrame.onerror = () => {
        clearTimeout(loadTimeout);
        if (isPdf && !fallbackAttempted) {
            fallbackToGoogle();
        }
    };
    
    if (isPdf && !fallbackAttempted) {
        loadTimeout = setTimeout(() => {
            if (!fallbackAttempted) fallbackToGoogle();
        }, 8000);
    }

    modalFrame.src = iframeUrl;
    modalBackdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalBackdrop.style.display = 'none';
    modalFrame.src = 'about:blank';
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modalBackdrop.style.display !== 'none') closeModal();
      if (S.filterOpen) closeFilter();
    }
  });

  /* ══════════════════════════════════════════════════
     LOADING / EMPTY
  ══════════════════════════════════════════════════ */
  function showLoading() {
    loadingEl.style.display = 'flex';
    emptyEl.style.display   = 'none';
    cardGrid.style.display  = 'none';
  }
  function hideLoading() { loadingEl.style.display = 'none'; }
  function showEmpty()   { emptyEl.style.display  = 'block'; cardGrid.style.display = 'none'; }
  function hideEmpty()   { emptyEl.style.display  = 'none'; }

  /* ══════════════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════════════ */
  function esc(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ══════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════ */
  fetchPapers();
});
