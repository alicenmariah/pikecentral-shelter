// Add this at the very start of your script.js file
// This will load and display entries as soon as the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Clear any existing data in localStorage
    localStorage.removeItem('entries');
    
    // Initialize with empty entries
    displayEntries([]);
    updateStatistics([]);

    // Connect export button
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.addEventListener('click', exportToCSV);
    }

    // Connect import button
    document.getElementById('csvFileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            importCSV(file);
        }
    });

    // Initial fetch
    fetchAndDisplayEntries();
    
    // Set up periodic refresh
    const REFRESH_INTERVAL = 30000; // 30 seconds
    setInterval(fetchAndDisplayEntries, REFRESH_INTERVAL);

    // Add after your DOMContentLoaded event listener
    document.getElementById('searchInput').addEventListener('input', function() {
        const searchQuery = this.value.toLowerCase();
        const searchField = document.getElementById('searchField').value;
        filterEntries(searchQuery, searchField);
    });

    document.getElementById('searchField').addEventListener('change', function() {
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const searchField = this.value;
        filterEntries(searchQuery, searchField);
    });
});

let formData = [];

function updateEntriesList() {
    const entriesList = document.getElementById('entriesList');
    entriesList.innerHTML = '';

    formData.forEach((entry, index) => {
        const entryCard = document.createElement('div');
        entryCard.className = 'entry-card';
        
        const residentsDisplay = entry.residents ? `<div>Residents: ${entry.residents}</div>` : '';
        const itemsList = Array.isArray(entry.items) ? entry.items.join(', ') : entry.items;
        
        entryCard.innerHTML = `
            <h4>${entry.firstName} ${entry.lastName}</h4>
            <div class="entry-details">
                <div>Phone: ${entry.phone}</div>
                <div>Address: ${entry.address}</div>
                ${residentsDisplay}
                <div class="entry-items">Items: ${itemsList}</div>
            </div>
            <div class="button-group">
                <button onclick="deleteEntry(${index})" style="background-color: #f04747;">Delete</button>
            </div>
        `;
        
        entriesList.appendChild(entryCard);
    });
}

function deleteEntry(index) {
    formData.splice(index, 1);
    updateEntriesList();
}

// Add these constants at the top of your file
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwkGjI64mmKGWkj-jnG6hrtTwtKzNAJZR_Dhv-_Oprjlmtv9bbtMGZCYWiAUHpEJiWbNA/exec';
const REFRESH_INTERVAL = 30000; // 30 seconds

// Replace the form submit handler
document.getElementById('assistanceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const selectedItems = Array.from(document.querySelectorAll('input[name="items"]:checked'))
        .map(checkbox => {
            if (checkbox.id === 'other') {
                const otherDesc = document.getElementById('otherDescription').value;
                return otherDesc ? `Other: ${otherDesc}` : 'Other';
            }
            return checkbox.value;
        });

    const entry = {
        firstName: e.target.firstName.value,
        lastName: e.target.lastName.value,
        phone: e.target.phone.value,
        address: e.target.address.value,
        damages: e.target.damages.value,
        residents: parseInt(e.target.residents.value) || 0,
        items: selectedItems
    };

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Create the form inside the iframe
    const form = iframe.contentDocument.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SCRIPT_URL;

    // Add the data
    const dataInput = iframe.contentDocument.createElement('input');
    dataInput.type = 'hidden';
    dataInput.name = 'data';
    dataInput.value = JSON.stringify(entry);
    form.appendChild(dataInput);

    // Add form to iframe and submit
    iframe.contentDocument.body.appendChild(form);

    // Add success message
    const successMessage = document.createElement('div');
    successMessage.textContent = 'Form submitted successfully!';
    successMessage.style.color = 'green';
    successMessage.style.marginTop = '10px';
    e.target.appendChild(successMessage);

    // Reset form
    e.target.reset();

    // Submit form
    form.submit();

    // Clean up and refresh data after delay
    setTimeout(() => {
        document.body.removeChild(iframe);
        if (e.target.contains(successMessage)) {
            e.target.removeChild(successMessage);
        }
        fetchAndDisplayEntries();
    }, 2000);
});

// Fetch entries function
function fetchAndDisplayEntries() {
    const script = document.createElement('script');
    const callbackName = 'callback_' + Date.now();
    
    window[callbackName] = function(response) {
        if (response && response.data) {
            displayEntries(response.data);
            updateStatistics(response.data);
        }
        document.body.removeChild(script);
        delete window[callbackName];
    };
    
    script.src = `${GOOGLE_SCRIPT_URL}?callback=${callbackName}&t=${Date.now()}`;
    script.onerror = function() {
        document.body.removeChild(script);
        delete window[callbackName];
    };
    
    document.body.appendChild(script);
}

function exportToCSV() {
    const entries = JSON.parse(localStorage.getItem('entries') || '[]');
    
    if (!entries || entries.length === 0) {
        alert('No entries to export');
        return;
    }

    // Define headers
    const headers = [
        'firstName',
        'lastName',
        'phone',
        'address',
        'damages',
        'people',
        'items'
    ];

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    // Add each entry as a row
    entries.forEach(entry => {
        const row = headers.map(header => {
            let value;
            if (header === 'items') {
                value = Array.isArray(entry.items) ? entry.items.join(';') : entry.items || '';
            } else if (header === 'people' || header === 'residents') {
                value = entry.residents || '0';
            } else if (header === 'firstName' || header === 'lastName') {
                // Don't wrap names in quotes, even if they contain commas
                value = (entry[header] || entry[header.toLowerCase()] || '').toString().trim();
            } else {
                value = (entry[header] || entry[header.toLowerCase()] || '').toString().trim();
                // Only wrap non-name fields in quotes if they contain commas
                if (value.includes(',')) {
                    value = `"${value}"`;
                }
            }
            return value;
        });
        csvContent += row.join(',') + '\n';
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, 'assistance_entries.csv');
    } else {
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'assistance_entries.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function importCSV(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const csvData = event.target.result;
        const rows = csvData.split('\n');
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
        
        // Find the correct column index for residents/people
        const residentsIndex = headers.findIndex(h => h === 'people' || h === 'residents');
        
        const entries = rows.slice(1)
            .filter(row => row.trim())
            .map(row => {
                // Handle quoted values properly
                const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
                const entry = {};
                
                headers.forEach((header, index) => {
                    if (header === 'people' || header === 'residents') {
                        const peopleCount = parseInt(cleanValues[index]);
                        entry.residents = isNaN(peopleCount) ? 0 : peopleCount;
                    } else if (header === 'items') {
                        let itemsValue = cleanValues[index] || '';
                        itemsValue = itemsValue.replace(/[\[\]"']/g, '');
                        entry[header] = itemsValue ? itemsValue.split(/[;,|]/).map(item => item.trim()).filter(Boolean) : [];
                    } else {
                        entry[header] = cleanValues[index] || '';
                    }
                });

                // Debug log for residents value
                console.log('Parsed entry residents:', entry.residents);
                return entry;
            })
            .filter(entry => entry.firstname || entry.lastname || entry.firstName || entry.lastName);

        // Debug log for all entries
        console.log('Imported entries:', entries);
        
        localStorage.setItem('entries', JSON.stringify(entries));
        displayEntries(entries);
        updateStatistics(entries);
    };
    reader.readAsText(file);
}

// Make sure the file input change handler is properly set up
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        importCSV(file);
    }
});

function displayEntries(entries = []) {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) return;
    
    entriesList.innerHTML = '';

    if (!entries || entries.length === 0) {
        entriesList.innerHTML = '<div class="entry-card">No entries available</div>';
        return;
    }

    // Sort entries with most recent first
    entries.reverse().forEach(entry => {
        const entryCard = document.createElement('div');
        entryCard.className = 'entry-card';
        
        const name = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
        const itemsList = Array.isArray(entry.items) ? entry.items.join(', ') : entry.items || '';
        
        entryCard.innerHTML = `
            <h4>${name || 'No Name'}</h4>
            <div class="entry-details">
                <div>Phone: ${entry.phone || 'N/A'}</div>
                <div>Address: ${entry.address || 'N/A'}</div>
                <div>Residents: ${entry.residents || '0'}</div>
                ${entry.damages ? `<div>Damages: ${entry.damages}</div>` : ''}
                <div class="entry-items">Items: ${itemsList || 'None'}</div>
            </div>
        `;
        
        entriesList.appendChild(entryCard);
    });

    // Reapply current search filter
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const searchField = document.getElementById('searchField').value;
    if (searchQuery) {
        filterEntries(searchQuery, searchField);
    }
}

function updateStatistics(entries = []) {
    // Update total requests
    const totalRequestsElement = document.getElementById('totalRequests');
    if (totalRequestsElement) {
        totalRequestsElement.textContent = entries.length;
    }

    // Update total residents
    const totalResidents = entries.reduce((sum, entry) => {
        const residents = parseInt(entry.residents) || 0;
        return sum + residents;
    }, 0);
    
    const totalResidentsElement = document.getElementById('totalResidents');
    if (totalResidentsElement) {
        totalResidentsElement.textContent = totalResidents;
    }

    // Calculate item counts
    const itemCounts = {};
    entries.forEach(entry => {
        if (Array.isArray(entry.items)) {
            entry.items.forEach(item => {
                if (item && item.trim()) {
                    const cleanItem = item.trim();
                    itemCounts[cleanItem] = (itemCounts[cleanItem] || 0) + 1;
                }
            });
        }
    });

    // Display top items
    const topItems = Object.entries(itemCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([item, count]) => `${item} (${count})`)
        .join(' • ');

    const topItemsElement = document.getElementById('topItems');
    if (topItemsElement) {
        topItemsElement.textContent = topItems || 'No items requested yet';
    }
}

// Add these styles if not already present
const styles = `
    .entry-card {
        background-color: var(--input-bg);
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 12px;
    }

    .entry-card h4 {
        margin: 0 0 10px 0;
        color: var(--accent);
    }

    .entry-details {
        font-size: 14px;
    }

    .entry-items {
        margin-top: 10px;
        color: var(--text-secondary);
    }
`;

// Add styles to document if not already present
if (!document.querySelector('#entry-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'entry-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Add this function to handle the "Select All" functionality
function selectAllItems() {
    const checkboxes = document.querySelectorAll('input[name="items"]');
    const allButton = document.getElementById('selectAll');
    const isChecked = allButton.checked;
    
    checkboxes.forEach(checkbox => {
        if (checkbox.id !== 'selectAll' && checkbox.id !== 'other') {
            checkbox.checked = isChecked;
        }
    });
}

function filterEntries(query, field) {
    const entriesList = document.getElementById('entriesList');
    const entryCards = entriesList.getElementsByClassName('entry-card');

    Array.from(entryCards).forEach(card => {
        let match = false;
        const text = card.textContent.toLowerCase();

        switch (field) {
            case 'name':
                const name = card.querySelector('h4').textContent.toLowerCase();
                match = name.includes(query);
                break;
            case 'phone':
                const phone = card.querySelector('.entry-details div:nth-child(1)').textContent.toLowerCase();
                match = phone.includes(query);
                break;
            case 'address':
                const address = card.querySelector('.entry-details div:nth-child(2)').textContent.toLowerCase();
                match = address.includes(query);
                break;
            case 'items':
                const items = card.querySelector('.entry-items').textContent.toLowerCase();
                match = items.includes(query);
                break;
            case 'all':
            default:
                match = text.includes(query);
                break;
        }

        card.style.display = match ? '' : 'none';
    });
} 
