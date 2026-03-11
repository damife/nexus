// API Configuration
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  
  // Development environments
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Production environments
  if (hostname.includes('swiftnexus.org')) {
    return 'https://api.swiftnexus.org/api';
  }
  
  // Staging/Testing environments
  if (hostname.includes('staging') || hostname.includes('test')) {
    return `https://${hostname}/api`;
  }
  
  // Default fallback for other production domains
  return `${window.location.protocol}//${hostname}/api`;
})();

// Fetch careers from backend
async function fetchCareers() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/careers`);
    const data = await response.json();
    
    if (data.success) {
      displayCareers(data.careers);
    } else {
      console.error('Failed to fetch careers:', data.message);
      displayError('Failed to load career opportunities');
    }
  } catch (error) {
    console.error('Error fetching careers:', error);
    displayError('Error loading career opportunities');
  }
}

// Display careers on the page
function displayCareers(careers) {
  const careersContainer = document.getElementById('careers-container');
  if (!careersContainer) return;

  if (!careers || careers.length === 0) {
    careersContainer.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="bi bi-briefcase text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No Open Positions</h3>
        <p class="text-gray-600">Check back later for new career opportunities.</p>
      </div>
    `;
    return;
  }

  const careersHTML = careers.map(career => `
    <div class="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-200 hover:border-emerald-500 transition-all duration-300 shadow-md hover:shadow-xl">
      <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl -mr-12 -mt-12"></div>
      <div class="relative p-6">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <i class="bi bi-${getCareerIcon(career.title)} text-white text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">${career.title}</h3>
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <i class="bi bi-geo-alt text-emerald-600"></i>
              <span>${career.location}</span>
            </div>
            ${career.type ? `
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <i class="bi bi-clock text-emerald-600"></i>
                <span>${career.type}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        ${career.active ? 
          `<button 
            onclick="applyForPosition(${career.id})"
            class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg group-hover:scale-105"
          >
            <span>Apply for Role</span>
            <i class="bi bi-arrow-right"></i>
          </button>` :
          `<button 
            disabled
            class="inline-flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 font-bold rounded-xl cursor-not-allowed"
          >
            <span>Position Closed</span>
          </button>`
        }
      </div>
    </div>
  `).join('');

  careersContainer.innerHTML = careersHTML;
}

// Get appropriate icon based on career title
function getCareerIcon(title) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('ceo') || titleLower.includes('executive') || titleLower.includes('assistant')) {
    return 'person-badge';
  } else if (titleLower.includes('developer') || titleLower.includes('software') || titleLower.includes('code')) {
    return 'code-slash';
  } else if (titleLower.includes('manager') && titleLower.includes('product')) {
    return 'diagram-3';
  } else if (titleLower.includes('marketing')) {
    return 'megaphone';
  } else if (titleLower.includes('quality') || titleLower.includes('qa') || titleLower.includes('testing')) {
    return 'shield-check';
  } else if (titleLower.includes('designer')) {
    return 'palette';
  } else if (titleLower.includes('analyst') || titleLower.includes('analysis')) {
    return 'graph-up';
  } else if (titleLower.includes('sales')) {
    return 'cart';
  } else if (titleLower.includes('hr') || titleLower.includes('human') || titleLower.includes('recruiter')) {
    return 'people';
  } else if (titleLower.includes('finance') || titleLower.includes('accounting')) {
    return 'currency-dollar';
  } else if (titleLower.includes('support') || titleLower.includes('customer')) {
    return 'headset';
  } else {
    return 'briefcase';
  }
}

// Apply for position
function applyForPosition(careerId) {
  // Redirect to application form or open modal
  window.location.href = 'apply?career=' + careerId;
}

// Display error message
function displayError(message) {
  const careersContainer = document.getElementById('careers-container');
  if (!careersContainer) return;

  careersContainer.innerHTML = `
    <div class="text-center py-12">
      <i class="bi bi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Error</h3>
      <p class="text-gray-600">${message}</p>
      <button 
        onclick="fetchCareers()" 
        class="mt-4 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200"
      >
        Try Again
      </button>
    </div>
  `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  fetchCareers();
});
