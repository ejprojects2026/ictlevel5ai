async function downloadPDF(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // fallback: open in new tab
    window.open(url, '_blank');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Get Supabase client from window (attached by supabase.js)
    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error('Supabase client not available');
        document.getElementById('notesGrid').innerHTML = `<div class="empty-state"><span>❌</span>Failed to load notes. Please refresh.</div>`;
        return;
    }

    // DOM elements
    const notesGrid = document.getElementById('notesGrid');
    const searchInput = document.getElementById('searchInput');
    const filterPills = document.querySelectorAll('.pill');
    const topContributorsDiv = document.getElementById('topContributorsList');

    let allNotes = [];           // raw fetched notes
    let filteredNotes = [];      // after search + filter
    let currentSubject = 'all';   // active filter

    // Helper: render notes based on filteredNotes
    function renderNotes() {
        if (filteredNotes.length === 0) {
            notesGrid.innerHTML = `<div class="empty-state"><span>📂</span>No notes match your criteria.</div>`;
            return;
        }

        const cardsHTML = filteredNotes.map(note => {
            // Detect file type icon from file_url extension
            const url = (note.file_url || '').toLowerCase();
            const codeExts = ['.js', '.java', '.py', '.cpp', '.c', '.html', '.css', '.ts', '.php', '.rb', '.go', '.cs'];
            const isCode = codeExts.some(ext => url.endsWith(ext));
            const fileIcon = url.endsWith('.pdf') ? '📄' : isCode ? '💻' : '📁';

            // Format upload date from created_at
            const date = note.created_at
                ? new Date(note.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'Unknown date';

            return `
        <div class="note-card">
          <!-- Row 1: File icon + Title -->
          <div class="note-card-header">
            <span class="note-file-icon">${fileIcon}</span>
            <h3 class="note-title">${escapeHtml(note.title)}</h3>
          </div>
          <!-- Row 2: Subject pill -->
          <span class="note-subject">${escapeHtml(note.subject || 'Uncategorized')}</span>
          <span class="note-topic">${escapeHtml(note.topic || '')}</span>
          <!-- Row 3: Uploader + Date -->
          <div class="note-meta">
            <span>👤 ${escapeHtml(note.uploader_name || note.uploader || 'Anonymous')}</span>
            <span>📅 ${date}</span>
          </div>
          <!-- Row 4: Buttons -->
          <div class="note-footer">
            <button data-url="${escapeHtml(note.file_url)}" data-title="${escapeHtml(note.title)}" class="preview-btn lesson-preview-btn">👁️ Preview</button>
            <a href="javascript:void(0)" data-url="${escapeHtml(note.file_url)}" data-filename="${escapeHtml(note.title)}.pdf" class="download-btn">📥 Download</a>
          </div>
        </div>
      `;
        }).join('');

        notesGrid.innerHTML = cardsHTML;
    }

    // Simple escape to prevent XSS
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Update top contributors based on allNotes (count per uploader)
    function updateTopContributors() {
        const contributorCount = {};
        allNotes.forEach(note => {
            const name = note.uploader_name || 'Anonymous';
            contributorCount[name] = (contributorCount[name] || 0) + 1;
        });

        const sorted = Object.entries(contributorCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        const rankEmojis = ['🥇', '🥈', '🥉'];
        if (sorted.length === 0) {
            topContributorsDiv.innerHTML = '<div class="contributor-row">No contributors yet</div>';
            return;
        }

        const rows = sorted.map(([name, count], index) => `
      <div class="contributor-row">
        <span class="rank">${rankEmojis[index]}</span>
        <span class="name">${escapeHtml(name)}</span>
        <span class="count">${count} upload${count !== 1 ? 's' : ''}</span>
      </div>
    `).join('');
        topContributorsDiv.innerHTML = rows;
    }

    // Filter notes by search term and subject
    function applyFilters() {
        const searchTerm = searchInput.value.trim().toLowerCase();

        filteredNotes = allNotes.filter(note => {
            // subject filter
            if (currentSubject !== 'all' && note.subject !== currentSubject) return false;

            // search filter
            if (searchTerm) {
                const titleMatch = note.title?.toLowerCase().includes(searchTerm);
                const subjectMatch = note.subject?.toLowerCase().includes(searchTerm);
                const uploaderMatch = (note.uploader_name || note.uploader)?.toLowerCase().includes(searchTerm);
                return titleMatch || subjectMatch || uploaderMatch;
            }
            return true;
        });

        renderNotes();
    }

    // Fetch notes from Supabase
    async function loadNotes() {
        notesGrid.innerHTML = '<div class="loading-indicator">Loading notes...</div>';

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', {
                ascending:
                    false
            });

        if (error) {
            console.error('Error fetching notes:', error);
            notesGrid.innerHTML = `<div class="empty-state"><span>❌</span>Error loading notes.</div>`;
            return;
        }

        allNotes = data || [];
        updateTopContributors();
        applyFilters(); // this also renders
    }

    // Event listeners
    searchInput.addEventListener('input', applyFilters);

    notesGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.download-btn');
        if (btn) {
            e.preventDefault();
            downloadPDF(btn.dataset.url, btn.dataset.filename);
        }
        
        const previewBtn = e.target.closest('.lesson-preview-btn');
        if (previewBtn) {
            e.preventDefault();
            openPreviewModal(previewBtn.dataset.url, previewBtn.dataset.title);
        }
    });

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            // update active class
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            currentSubject = pill.dataset.subject;
            applyFilters();
        });
    });

    // Initialize
    await loadNotes();

    // Auto-activate filter from URL ?topic= param
    const urlParams = new URLSearchParams(window.location.search);
    const topicParam = urlParams.get('topic');
    if (topicParam) {
        const matchingPill = [...filterPills].find(
            p => p.dataset.subject.toLowerCase() === topicParam.toLowerCase()
        );
        if (matchingPill) {
            matchingPill.click();
        }
    }

    // --- Modal Logic ---
    const previewModal = document.getElementById('lessonPreviewModal');
    const modalIframe = document.getElementById('lessonModalIframe');
    const modalTitle = document.getElementById('lessonModalTitle');
    const modalNewTabBtn = document.getElementById('lessonModalNewTabBtn');
    const modalCloseBtn = document.getElementById('lessonModalCloseBtn');
    const modalLoader = document.getElementById('lessonModalLoader');
    const modalFallback = document.getElementById('lessonModalFallback');
    const modalFallbackTitle = document.getElementById('lessonModalFallbackTitle');
    const modalFallbackBtn = document.getElementById('lessonModalFallbackBtn');

    function openPreviewModal(url, title) {
        if (!previewModal) return;
        
        modalTitle.textContent = title;
        modalNewTabBtn.href = url;
        if (modalFallbackBtn) modalFallbackBtn.href = url;
        if (modalFallbackTitle) modalFallbackTitle.textContent = title;
        
        modalIframe.src = 'about:blank';
        modalLoader.style.display = 'flex';
        modalFallback.classList.add('hidden');
        modalIframe.classList.add('hidden');
        
        let iframeUrl = url;
        const isPdf = url.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
            iframeUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0`;
        }
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        const showFallback = () => {
            modalLoader.style.display = 'none';
            modalIframe.classList.add('hidden');
            modalFallback.classList.remove('hidden');
        };

        if (isMobile) {
            // Mobile: skip iframe entirely to prevent lag, freeze, or heavy rendering
            showFallback();
            previewModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            return;
        }

        let loadTimeout;
        
        modalIframe.onload = () => {
            clearTimeout(loadTimeout);
            modalLoader.style.display = 'none';
            modalIframe.classList.remove('hidden');
        };
        
        modalIframe.onerror = () => {
            clearTimeout(loadTimeout);
            showFallback();
        };
        
        // 8 second timeout for iframe loading
        loadTimeout = setTimeout(() => {
            showFallback();
        }, 8000);
        
        modalIframe.src = iframeUrl;
        
        previewModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closePreviewModal() {
        if (!previewModal) return;
        previewModal.classList.add('hidden');
        document.body.style.overflow = '';
        modalIframe.src = 'about:blank';
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closePreviewModal);
    }
    
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal || e.target.classList.contains('lesson-modal-container')) {
                closePreviewModal();
            }
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewModal && !previewModal.classList.contains('hidden')) {
            closePreviewModal();
        }
    });
});
