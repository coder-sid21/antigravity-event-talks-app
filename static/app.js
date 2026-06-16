// Global State
let rawFeedEntries = []; // Original feed entries from backend
let processedItems = [];  // Parsed individual updates
let selectedIds = new Set(); // Selected card IDs
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const refreshSpinner = btnRefresh.querySelector('.spinner-icon');
const cardsContainer = document.getElementById('cards-container');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const filterPillsContainer = document.getElementById('filter-pills-container');
const btnResetFilters = document.getElementById('btn-reset-filters');
const selectionBar = document.getElementById('selection-bar');
const selectionText = document.getElementById('selection-text');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnTweetSelected = document.getElementById('btn-tweet-selected');

// Stats Elements
const valTotal = document.getElementById('val-total');
const valFeatures = document.getElementById('val-features');
const valIssues = document.getElementById('val-issues');
const valDeprecations = document.getElementById('val-deprecations');

// Modal Elements
const modalTweet = document.getElementById('modal-tweet');
const btnCloseModal = document.getElementById('btn-close-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountCurrent = document.getElementById('char-count-current');
const progressCircle = document.getElementById('progress-circle');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const btnCopyTweet = document.getElementById('btn-copy-tweet');
const btnShareTweet = document.getElementById('btn-share-tweet');

// Quick templates chips
const chipAddHashtags = document.getElementById('chip-add-hashtags');
const chipAddLink = document.getElementById('chip-add-link');
const chipAddEmoji = document.getElementById('chip-add-emoji');

// Current modal state
let activeTweetData = {
    text: '',
    link: ''
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Refresh action
    btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        btnClearSearch.style.display = searchQuery ? 'block' : 'none';
        renderFeed();
    });

    // Clear search
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        renderFeed();
        searchInput.focus();
    });

    // Filter pills
    filterPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;

        // Update active class
        filterPillsContainer.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('aria-checked', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-checked', 'true');

        currentFilter = pill.dataset.filter;
        renderFeed();
    });

    // Reset filters from empty state
    btnResetFilters.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        
        filterPillsContainer.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('aria-checked', 'false');
        });
        filterPillsContainer.querySelector('[data-filter="all"]').classList.add('active');
        filterPillsContainer.querySelector('[data-filter="all"]').setAttribute('aria-checked', 'true');
        
        currentFilter = 'all';
        renderFeed();
    });

    // Selection controls
    btnClearSelection.addEventListener('click', () => {
        selectedIds.clear();
        updateSelectionBar();
        // Re-render to clear checkboxes in DOM
        renderFeed();
    });

    btnTweetSelected.addEventListener('click', () => {
        composeBulkTweet();
    });

    // Modal controls
    btnCloseModal.addEventListener('click', () => {
        modalTweet.style.display = 'none';
    });

    // Close modal on background click
    modalTweet.addEventListener('click', (e) => {
        if (e.target === modalTweet) {
            modalTweet.style.display = 'none';
        }
    });

    // Sync textarea with preview & character limit
    tweetTextarea.addEventListener('input', (e) => {
        updateTweetPreview(e.target.value);
    });

    // Copy to clipboard
    btnCopyTweet.addEventListener('click', () => {
        navigator.clipboard.writeText(tweetTextarea.value)
            .then(() => {
                const icon = btnCopyTweet.querySelector('i');
                const text = btnCopyTweet.querySelector('span');
                
                // Success indicator animation
                icon.className = 'fa-solid fa-check';
                btnCopyTweet.style.borderColor = 'var(--color-green)';
                
                setTimeout(() => {
                    icon.className = 'fa-regular fa-copy';
                    btnCopyTweet.style.borderColor = '';
                }, 2000);
            })
            .catch(err => console.error('Failed to copy: ', err));
    });

    // Twitter Web Intent share
    btnShareTweet.addEventListener('click', () => {
        const text = encodeURIComponent(tweetTextarea.value);
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    });

    // Customizer chips actions
    chipAddHashtags.addEventListener('click', () => {
        let text = tweetTextarea.value;
        const tags = ' #BigQuery #GoogleCloud';
        if (!text.includes('#BigQuery')) {
            text += tags;
            updateTweetPreview(text);
        }
    });

    chipAddLink.addEventListener('click', () => {
        let text = tweetTextarea.value;
        if (activeTweetData.link && !text.includes(activeTweetData.link)) {
            text += `\n🔗 Read more: ${activeTweetData.link}`;
            updateTweetPreview(text);
        }
    });

    chipAddEmoji.addEventListener('click', () => {
        const emojis = ['🚀', '⚡', '💡', '🔥', '🛠️', '📈'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        let text = tweetTextarea.value;
        
        // Insert emoji at cursor position
        const start = tweetTextarea.selectionStart;
        const end = tweetTextarea.selectionEnd;
        text = text.substring(0, start) + randomEmoji + text.substring(end);
        
        updateTweetPreview(text);
        
        // Restore cursor position
        setTimeout(() => {
            tweetTextarea.focus();
            tweetTextarea.setSelectionRange(start + randomEmoji.length, start + randomEmoji.length);
        }, 10);
    });
}

// Fetch notes from Flask API
async function fetchReleaseNotes(force = false) {
    // Show loaders, disable actions
    btnRefresh.disabled = true;
    refreshSpinner.classList.add('spinning');
    cardsContainer.style.display = 'none';
    emptyState.style.display = 'none';
    skeletonLoader.style.display = 'grid';

    try {
        const url = force ? '/api/release-notes?refresh=true' : '/api/release-notes';
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data) {
            rawFeedEntries = result.data;
            processEntries(rawFeedEntries);
            renderFeed();
            updateStats();
        } else {
            throw new Error(result.error || 'Server returned unsuccessful response');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        cardsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; max-width: 100%;">
                <div class="empty-icon-wrapper" style="color: var(--color-red)">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h4>Unable to load release notes</h4>
                <p>${error.message || 'Check your network connection and try again.'}</p>
                <button id="btn-retry" class="btn btn-primary mt-4">
                    <i class="fa-solid fa-arrows-rotate"></i> Retry Connection
                </button>
            </div>
        `;
        document.getElementById('btn-retry')?.addEventListener('click', () => fetchReleaseNotes(true));
        skeletonLoader.style.display = 'none';
        cardsContainer.style.display = 'grid';
    } finally {
        btnRefresh.disabled = false;
        refreshSpinner.classList.remove('spinning');
    }
}

// Split the standard HTML entries into individual update items
function processEntries(entries) {
    processedItems = [];
    let uidCounter = 0;

    entries.forEach(entry => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(entry.content, 'text/html');
        
        let currentType = '';
        let currentNodes = [];

        // Parse siblings sequentially
        Array.from(doc.body.childNodes).forEach(node => {
            if (node.nodeName === 'H3') {
                // If we already had an active block, save it first
                if (currentType && currentNodes.length > 0) {
                    processedItems.push(createProcessedItem(entry, currentType, currentNodes, uidCounter++));
                }
                currentType = node.textContent.trim();
                currentNodes = [];
            } else {
                currentNodes.push(node);
            }
        });

        // Add the final remaining block
        if (currentType && currentNodes.length > 0) {
            processedItems.push(createProcessedItem(entry, currentType, currentNodes, uidCounter++));
        }

        // Fallback: If no H3 tags were found, treat the entire content as one update
        if (!currentType && entry.content.trim()) {
            processedItems.push({
                id: `up-${uidCounter++}`,
                originalEntryId: entry.id,
                date: entry.title,
                type: 'Other',
                html: entry.content,
                text: stripHtml(entry.content),
                link: entry.link
            });
        }
    });
}

// Helper to create an object for an individual change block
function createProcessedItem(originalEntry, type, nodes, uid) {
    // Build HTML from nodes
    const tempDiv = document.createElement('div');
    nodes.forEach(n => tempDiv.appendChild(n.cloneNode(true)));
    const htmlContent = tempDiv.innerHTML;
    const textContent = stripHtml(htmlContent);

    // Normalize type
    let normalizedType = 'Other';
    const checkType = type.toLowerCase();
    if (checkType.includes('feature')) normalizedType = 'Feature';
    else if (checkType.includes('issue') || checkType.includes('bug') || checkType.includes('fix')) normalizedType = 'Issue';
    else if (checkType.includes('deprecat')) normalizedType = 'Deprecated';

    // Parse specific link headers if any, or fall back to main entry link
    return {
        id: `up-${uid}`,
        originalEntryId: originalEntry.id,
        date: originalEntry.title,
        type: normalizedType,
        html: htmlContent,
        text: textContent,
        link: originalEntry.link
    };
}

// Strip HTML tags to get raw clean text for drafting tweets
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace anchor tags with their labels + URLs or clean formats
    const links = tempDiv.querySelectorAll('a');
    links.forEach(a => {
        // Keep the text of the link
        const text = a.textContent;
        a.replaceWith(text);
    });
    
    return tempDiv.textContent || tempDiv.innerText || "";
}

// Update Dashboard Statistics Card Values with counting animation
function updateStats() {
    const counts = { total: processedItems.length, feature: 0, issue: 0, deprecated: 0, other: 0 };
    
    processedItems.forEach(item => {
        const type = item.type.toLowerCase();
        if (type === 'feature') counts.feature++;
        else if (type === 'issue') counts.issue++;
        else if (type === 'deprecated') counts.deprecated++;
        else counts.other++;
    });

    animateCount(valTotal, counts.total);
    animateCount(valFeatures, counts.feature);
    animateCount(valIssues, counts.issue);
    animateCount(valDeprecations, counts.deprecated);
}

// Subtle counter count-up micro-animation
function animateCount(element, target) {
    let current = 0;
    const duration = 800; // ms
    const stepTime = Math.max(Math.floor(duration / target), 15);
    
    if (target === 0) {
        element.textContent = '0';
        return;
    }

    const timer = setInterval(() => {
        current += Math.ceil(target / 20);
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = current;
        }
    }, stepTime);
}

// Render filtered cards to the container
function renderFeed() {
    skeletonLoader.style.display = 'none';
    cardsContainer.innerHTML = '';

    // Filter list
    let filtered = processedItems.filter(item => {
        // Filter by Pill category
        if (currentFilter !== 'all') {
            const itemType = item.type.toLowerCase();
            if (currentFilter === 'other' && ['feature', 'issue', 'deprecated'].includes(itemType)) {
                return false;
            } else if (currentFilter !== 'other' && itemType !== currentFilter) {
                return false;
            }
        }

        // Filter by search query
        if (searchQuery) {
            const inDate = item.date.toLowerCase().includes(searchQuery);
            const inType = item.type.toLowerCase().includes(searchQuery);
            const inText = item.text.toLowerCase().includes(searchQuery);
            return inDate || inType || inText;
        }

        return true;
    });

    // Render count
    document.getElementById('feed-count').textContent = `${filtered.length} updates found`;
    document.getElementById('feed-status-text').textContent = searchQuery 
        ? `Search Results for "${searchQuery}"` 
        : `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Updates`;

    if (filtered.length === 0) {
        cardsContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    cardsContainer.style.display = 'grid';

    // Generate cards
    filtered.forEach(item => {
        const isSelected = selectedIds.has(item.id);
        const card = document.createElement('article');
        card.className = `card-item ${isSelected ? 'selected' : ''}`;
        card.id = `card-${item.id}`;
        card.setAttribute('aria-selected', isSelected ? 'true' : 'false');

        const badgeClass = item.type.toLowerCase();

        card.innerHTML = `
            <div class="card-header-badge ${badgeClass}"></div>
            <div class="card-body-wrapper">
                <div class="card-top">
                    <div class="card-meta">
                        <span class="type-tag ${badgeClass}">${item.type}</span>
                        <span class="card-date">${item.date}</span>
                    </div>
                    <label class="checkbox-container" aria-label="Select update for bulk tweet">
                        <input type="checkbox" class="card-select-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </div>
                <div class="card-content">
                    ${item.html}
                </div>
            </div>
            <div class="card-footer">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="card-source-link">
                    <i class="fa-solid fa-up-right-from-square"></i>
                    <span>docs.cloud.google.com</span>
                </a>
                <button class="btn-card-tweet" data-id="${item.id}" title="Compose a Tweet about this update" aria-label="Compose a Tweet about this update">
                    <i class="fa-brands fa-x-twitter"></i>
                </button>
            </div>
        `;

        // Attach event listeners inside card
        const checkbox = card.querySelector('.card-select-checkbox');
        checkbox.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                selectedIds.add(id);
                card.classList.add('selected');
                card.setAttribute('aria-selected', 'true');
            } else {
                selectedIds.delete(id);
                card.classList.remove('selected');
                card.setAttribute('aria-selected', 'false');
            }
            updateSelectionBar();
        });

        const btnTweet = card.querySelector('.btn-card-tweet');
        btnTweet.addEventListener('click', () => {
            openTweetModal(item);
        });

        cardsContainer.appendChild(card);
    });
}

// Update Selection floating bar status
function updateSelectionBar() {
    const count = selectedIds.size;
    if (count > 0) {
        selectionText.textContent = `${count} update${count > 1 ? 's' : ''} selected`;
        selectionBar.classList.add('visible');
        selectionBar.style.display = 'flex';
    } else {
        selectionBar.classList.remove('visible');
        setTimeout(() => {
            if (selectedIds.size === 0) selectionBar.style.display = 'none';
        }, 400); // Wait for transition out
    }
}

// Compose a tweet for a single release update
function openTweetModal(item) {
    activeTweetData.link = item.link;
    
    // Draft tweet text
    let cleanText = item.text.replace(/\s+/g, ' ').trim();
    if (cleanText.length > 180) {
        cleanText = cleanText.substring(0, 177) + '...';
    }

    const defaultTweet = `📢 BigQuery [${item.type}] (${item.date}):\n\n"${cleanText}"\n\n#BigQuery #GoogleCloud\n🔗 ${item.link}`;
    
    activeTweetData.text = defaultTweet;
    
    // Set textarea value and update preview
    tweetTextarea.value = defaultTweet;
    updateTweetPreview(defaultTweet);
    
    // Open modal
    modalTweet.style.display = 'flex';
}

// Compose a bulk tweet from multiple selected updates
function composeBulkTweet() {
    if (selectedIds.size === 0) return;

    // Get all selected items
    const selectedItems = processedItems.filter(item => selectedIds.has(item.id));
    
    // Gather links (use the first link as primary, or just main docs feed)
    activeTweetData.link = selectedItems[0].link;

    let compiledText = `📢 Latest BigQuery Updates:\n\n`;
    
    selectedItems.forEach((item, idx) => {
        let cleanText = item.text.replace(/\s+/g, ' ').trim();
        // Keep it super concise for multiple updates
        if (cleanText.length > 70) {
            cleanText = cleanText.substring(0, 67) + '...';
        }
        compiledText += `${idx + 1}. [${item.type}] ${cleanText}\n`;
    });

    compiledText += `\n#BigQuery #GoogleCloud`;
    if (activeTweetData.link) {
        compiledText += `\n🔗 ${activeTweetData.link}`;
    }

    // Set textarea and update preview
    tweetTextarea.value = compiledText;
    updateTweetPreview(compiledText);

    // Open modal
    modalTweet.style.display = 'flex';
}

// Update preview and character limits/visual progress ring
function updateTweetPreview(text) {
    tweetTextarea.value = text;
    
    // Calculate length (Note: URLs in X are shortened to 23 chars internally, but we can do a standard character length representation)
    const len = text.length;
    charCountCurrent.textContent = len;
    
    // Format the live X mockup preview (convert hashtags and links to anchor lookalikes)
    let formattedHtml = text
        .replace(/(\n)/g, '<br>')
        .replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: var(--color-twitter); cursor: pointer;">$1</span>')
        .replace(/(https?:\/\/[^\s]+)/g, '<span style="color: var(--color-twitter); cursor: pointer;">$1</span>');

    tweetPreviewText.innerHTML = formattedHtml;

    // Limit check
    const limit = 280;
    const progressRing = document.getElementById('progress-circle');
    const countWrapper = document.querySelector('.char-count-wrapper');

    // Circle progress properties
    const radius = 8;
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;

    if (len > limit) {
        progressRing.style.strokeDashoffset = 0;
        progressRing.setAttribute('stroke', 'var(--color-red)');
        countWrapper.className = 'char-count-wrapper danger';
        btnShareTweet.disabled = true;
        btnShareTweet.style.opacity = '0.5';
    } else {
        const offset = circumference - (len / limit) * circumference;
        progressRing.style.strokeDashoffset = offset;
        
        if (len > limit - 20) {
            progressRing.setAttribute('stroke', 'var(--color-yellow)');
            countWrapper.className = 'char-count-wrapper warning';
        } else {
            progressRing.setAttribute('stroke', 'var(--color-blue)');
            countWrapper.className = 'char-count-wrapper';
        }
        
        btnShareTweet.disabled = false;
        btnShareTweet.style.opacity = '1';
    }
}
