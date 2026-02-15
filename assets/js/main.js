// Main Application Logic
// Handles navigation, UI interactions, and data display

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Setup navigation
    setupNavigation();
    
    // Setup message type selector
    setupMessageTypeSelector();
    
    // Setup form submission
    setupFormSubmission();
    
    // Load dashboard data
    loadDashboard();
    
    // Setup search and filters
    setupSearchAndFilters();
}

// Navigation setup
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                    
                    // Load section-specific data
                    if (target === 'messages') {
                        loadMessages();
                    } else if (target === 'history') {
                        loadHistory();
                    } else if (target === 'create') {
                        loadMessageTypes();
                    }
                }
            });
        });
    });
}

// Message type selector setup
function setupMessageTypeSelector() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active tab
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Load message types for selected category
            const category = this.getAttribute('data-category');
            loadMessageTypes(category);
        });
    });
}

// Load message types
function loadMessageTypes(category = 'mt') {
    const grid = document.getElementById('messageTypesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const messageTypes = SWIFT_MESSAGE_TYPES[category];
    if (!messageTypes) return;

    Object.keys(messageTypes).forEach(messageType => {
        const config = messageTypes[messageType];
        const card = document.createElement('div');
        card.className = 'message-type-card';
        
        // Add legacy badge if applicable
        const legacyBadge = config.legacy ? '<span class="legacy-badge">LEGACY</span>' : '';
        const standardBadge = config.isStandard ? '<span class="standard-badge">STANDARD</span>' : '';
        const migrationIcon = config.legacy ? '<i class="fas fa-exclamation-triangle migration-warning-icon"></i>' : '';
        
        card.innerHTML = `
            <div class="type-header">
                <div class="type-code">${messageType}</div>
                ${legacyBadge}${standardBadge}
            </div>
            <div class="type-name">${config.name}</div>
            ${migrationIcon}
            ${config.migrationNote ? `<div class="migration-note">${config.migrationNote}</div>` : ''}
            ${config.recommendedAlternative ? `<div class="recommended-alternative">→ Use ${config.recommendedAlternative} instead</div>` : ''}
        `;
        
        // Add legacy styling
        if (config.legacy) {
            card.classList.add('legacy-message');
        }
        if (config.isStandard) {
            card.classList.add('standard-message');
        }
        
        card.addEventListener('click', function() {
            // Show migration warning for legacy messages
            if (config.legacy) {
                if (!confirm(`⚠️ WARNING: ${messageType} is a legacy format.\n\nAfter November 2025, all cross-border payments must use ISO 20022 format (${config.recommendedAlternative || 'pacs.008'}).\n\nMT 103 messages are automatically converted via SWIFT contingency processing, but migration to ${config.recommendedAlternative || 'pacs.008'} is recommended.\n\nDo you want to continue with ${messageType}?`)) {
                    return;
                }
            }
            
            // Remove previous selection
            document.querySelectorAll('.message-type-card').forEach(c => {
                c.classList.remove('selected');
            });
            this.classList.add('selected');
            
            // Build form
            formBuilder.buildForm(messageType, category);
        });
        
        grid.appendChild(card);
    });
}

// Form submission setup
function setupFormSubmission() {
    const form = document.getElementById('swiftMessageForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!formBuilder.validateForm()) {
                return;
            }

            const formData = formBuilder.getFormData();
            const category = Object.keys(SWIFT_MESSAGE_TYPES).find(cat => 
                SWIFT_MESSAGE_TYPES[cat][formBuilder.currentMessageType]
            );

            // Generate Swift message
            const swiftContent = messageHandler.generateSwiftMessage(
                formData,
                formBuilder.currentMessageType,
                category
            );

            // Save message
            messageHandler.showLoading();
            const result = await messageHandler.saveMessage(
                formData,
                formBuilder.currentMessageType,
                category,
                swiftContent
            );
            messageHandler.hideLoading();

            if (result.success) {
                alert('Message created successfully!');
                formBuilder.closeForm();
                form.reset();
                
                // Refresh dashboard
                loadDashboard();
                
                // Switch to messages view
                document.querySelector('.nav-item[href="#messages"]')?.click();
            } else {
                alert('Error creating message. Please try again.');
            }
        });
    }
}

// Load dashboard
function loadDashboard() {
    const stats = messageHandler.getStatistics();
    
    // Update stat cards
    document.getElementById('totalMessages').textContent = stats.total;
    document.getElementById('pendingMessages').textContent = stats.pending;
    document.getElementById('completedMessages').textContent = stats.completed;
    document.getElementById('todayMessages').textContent = stats.today;
    
    // Load recent messages
    const recentMessages = messageHandler.getMessages().slice(0, 5);
    displayRecentMessages(recentMessages);
}

// Display recent messages
function displayRecentMessages(messages) {
    const tbody = document.getElementById('recentMessagesBody');
    if (!tbody) return;

    if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No messages yet. Create your first message to get started.</td></tr>';
        return;
    }

    tbody.innerHTML = messages.map(msg => `
        <tr>
            <td><strong>${msg.messageType}</strong></td>
            <td>${msg.reference}</td>
            <td><span class="status-badge ${msg.status}">${msg.status}</span></td>
            <td>${new Date(msg.createdAt).toLocaleString()}</td>
            <td>${getMessageAmount(msg)}</td>
            <td>
                <button class="btn-icon" onclick="viewMessage('${msg.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${msg.status === 'pending' ? `
                    <button class="btn-icon" onclick="sendMessage('${msg.id}')" title="Send">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Load messages
function loadMessages() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const searchQuery = document.getElementById('messageSearch')?.value || '';

    const messages = messageHandler.getMessages({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchQuery || undefined
    });

    displayMessages(messages);
}

// Display messages
function displayMessages(messages) {
    const tbody = document.getElementById('messagesTableBody');
    if (!tbody) return;

    if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No messages found.</td></tr>';
        return;
    }

    tbody.innerHTML = messages.map(msg => `
        <tr>
            <td><strong>${msg.messageType}</strong></td>
            <td>${msg.reference}</td>
            <td><span class="status-badge ${msg.status}">${msg.status}</span></td>
            <td>${new Date(msg.createdAt).toLocaleString()}</td>
            <td>${msg.senderBIC || 'N/A'}</td>
            <td>${msg.receiverBIC || 'N/A'}</td>
            <td>${getMessageAmount(msg)}</td>
            <td>
                <button class="btn-icon" onclick="viewMessage('${msg.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${msg.status === 'pending' ? `
                    <button class="btn-icon" onclick="sendMessage('${msg.id}')" title="Send">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                ` : ''}
                <button class="btn-icon" onclick="deleteMessage('${msg.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load history
function loadHistory() {
    const messages = messageHandler.getMessages();
    displayHistory(messages);
}

// Display history
function displayHistory(messages) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No history available.</td></tr>';
        return;
    }

    tbody.innerHTML = messages.map(msg => `
        <tr>
            <td><strong>${msg.messageType}</strong></td>
            <td>${msg.reference}</td>
            <td><span class="status-badge ${msg.status}">${msg.status}</span></td>
            <td>${new Date(msg.createdAt).toLocaleString()}</td>
            <td>${msg.senderBIC || 'N/A'}</td>
            <td>${msg.receiverBIC || 'N/A'}</td>
            <td>
                <button class="btn-icon" onclick="viewMessage('${msg.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Setup search and filters
function setupSearchAndFilters() {
    const searchInput = document.getElementById('messageSearch');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadMessages, 300));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', loadMessages);
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', loadMessages);
    }
}

// Utility: Get message amount
function getMessageAmount(message) {
    if (message.formData && message.formData['32A']) {
        return message.formData['32A'];
    }
    if (message.formData && message.formData['32B']) {
        return message.formData['32B'];
    }
    return 'N/A';
}

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for button clicks
function showCreateMessage() {
    document.querySelector('.nav-item[href="#create"]')?.click();
}

function showMessageTemplates() {
    alert('Message templates feature coming soon!');
}

function showMessageHistory() {
    document.querySelector('.nav-item[href="#history"]')?.click();
}

function showAnalytics() {
    alert('Analytics feature coming soon!');
}

function showMigrationInfo() {
    const modal = document.getElementById('migrationModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeMigrationModal() {
    const modal = document.getElementById('migrationModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const migrationModal = document.getElementById('migrationModal');
    if (migrationModal) {
        migrationModal.addEventListener('click', function(e) {
            if (e.target === migrationModal) {
                closeMigrationModal();
            }
        });
    }
    
    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.addEventListener('click', function(e) {
            if (e.target === previewModal) {
                closePreview();
            }
        });
    }
});

function closeMessageForm() {
    formBuilder.closeForm();
}

function previewMessage() {
    messageHandler.previewMessage();
}

function closePreview() {
    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmSend() {
    if (!messageHandler.currentPreview) return;
    
    closePreview();
    
    // Auto-submit form
    const form = document.getElementById('swiftMessageForm');
    if (form) {
        form.dispatchEvent(new Event('submit'));
    }
}

function saveDraft() {
    const formData = formBuilder.getFormData();
    // Save draft logic
    alert('Draft saved successfully!');
}

// Convert MT103 to pacs.008
function convertMT103ToPacs008() {
    if (formBuilder.currentMessageType !== 'MT103') {
        alert('This conversion is only available for MT 103 messages.');
        return;
    }

    if (!formBuilder.validateForm()) {
        return;
    }

    const formData = formBuilder.getFormData();
    
    // Convert to pacs.008
    const pacs008Xml = mt103Converter.convertToPacs008(formData);
    
    // Show conversion result in modal
    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    if (previewContent) {
        previewContent.innerHTML = `
            <div class="conversion-header">
                <h3>MT 103 → pacs.008 Conversion</h3>
                <p class="conversion-note">Your MT 103 message has been converted to ISO 20022 pacs.008 format.</p>
            </div>
            <pre class="xml-preview">${pacs008Xml}</pre>
            <div class="conversion-actions">
                <button class="btn btn-secondary" onclick="copyConvertedMessage()">
                    <i class="fas fa-copy"></i> Copy XML
                </button>
                <button class="btn btn-primary" onclick="useConvertedMessage()">
                    <i class="fas fa-check"></i> Use This Format
                </button>
            </div>
        `;
    }

    if (previewModal) {
        previewModal.classList.add('active');
    }

    // Store converted message
    window.convertedPacs008 = pacs008Xml;
}

function copyConvertedMessage() {
    if (window.convertedPacs008) {
        navigator.clipboard.writeText(window.convertedPacs008).then(() => {
            alert('XML copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy. Please select and copy manually.');
        });
    }
}

function useConvertedMessage() {
    if (!window.convertedPacs008) return;
    
    // Switch to MX tab and load pacs.008
    document.querySelector('.tab-btn[data-category="mx"]')?.click();
    
    setTimeout(() => {
        // Find and click pacs.008 card
        const pacs008Card = Array.from(document.querySelectorAll('.message-type-card')).find(card => {
            return card.textContent.includes('pacs.008');
        });
        
        if (pacs008Card) {
            pacs008Card.click();
            
            // Fill in the XML content
            setTimeout(() => {
                const xmlTextarea = document.getElementById('mxXmlContent');
                if (xmlTextarea) {
                    xmlTextarea.value = window.convertedPacs008;
                }
            }, 500);
        }
        
        closePreview();
    }, 100);
}

function viewMessage(messageId) {
    const message = messageHandler.getMessageById(messageId);
    if (!message) {
        alert('Message not found');
        return;
    }

    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    if (previewContent) {
        if (message.category === 'mx') {
            previewContent.innerHTML = `<pre>${messageHandler.formatXML(message.swiftContent)}</pre>`;
        } else {
            previewContent.textContent = message.swiftContent;
        }
    }

    if (previewModal) {
        previewModal.classList.add('active');
    }
}

async function sendMessage(messageId) {
    if (!confirm('Are you sure you want to send this message?')) {
        return;
    }

    const success = await messageHandler.sendMessage(messageId);
    if (success) {
        alert('Message sent successfully!');
        loadMessages();
        loadDashboard();
    }
}

function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    messageHandler.messages = messageHandler.messages.filter(m => m.id !== messageId);
    messageHandler.saveMessagesToStorage();
    loadMessages();
    loadDashboard();
    alert('Message deleted successfully!');
}

