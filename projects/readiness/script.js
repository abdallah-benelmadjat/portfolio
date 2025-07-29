document.addEventListener('DOMContentLoaded', function() {
    // Initialize map - Centered on Wisconsin
    const map = L.map('map').setView([44.500000, -89.500000], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let allData = [];
    const HIGHWAY_PROXIMITY_MILES = 3; // Companies within 3 miles of a highway

    // Use MarkerClusterGroup instead of LayerGroup
    const markers = L.markerClusterGroup();
    map.addLayer(markers);
    let heatLayer = null;

    // Fetch company data
    fetch('industrymap.json', { cache: 'no-cache' })
        .then(res => res.json())
        .then(companyData => {
            allData = companyData;
            updateHeatmap(allData);
            populateCards(allData.slice(0, 11000));
            populateIndustryFilter(allData);
        })
        .catch(error => console.error('Error loading data:', error));

    function updateHeatmap(data) {
        if (heatLayer) {
            map.removeLayer(heatLayer);
        }
        const points = data
            .filter(p => p.Latitude && p.Longitude)
            .map(p => [p.Latitude, p.Longitude, 1]); // [lat, lon, intensity]
        
        if (points.length > 0) {
            heatLayer = L.heatLayer(points, { 
                radius: 12,
                blur: 5,
                minOpacity: 0.5,
                gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
            }).addTo(map);
        }
    }

    function populateCards(data) {
        const cardsContainer = document.getElementById('cards-container');
        cardsContainer.innerHTML = '';
        markers.clearLayers();

        // Update the company count
        const countElement = document.getElementById('company-count');
        if (countElement) {
            countElement.textContent = `Showing ${data.length} companies`;
        }

        data.forEach(company => {
            const card = document.createElement('div');
            card.className = 'company-card';
            card.innerHTML = `
                <h3>${company.Company}</h3>
                <p><strong>Industry:</strong> ${company["Primary SIC Code Description"]}</p>
                <p><strong>Employees:</strong> ${company.Employees}</p>
                <p><strong>Annual Sales:</strong> ${company["Annual Sales"]}</p>
            `;
            
            if (company.Latitude && company.Longitude) {
                const marker = L.marker([company.Latitude, company.Longitude])
                    .bindPopup(`<b>${company.Company}</b><br>${company["Business Description"]}`);
                markers.addLayer(marker);

                card.addEventListener('click', () => {
                    map.setView([company.Latitude, company.Longitude], 13);
                    marker.openPopup();
                });
            }

            cardsContainer.appendChild(card);
        });
    }

    function populateIndustryFilter(data) {
        const industryFilter = document.getElementById('industry-filter');
        const industries = [...new Set(data.map(c => c["Primary SIC Code Description"]))].sort();
        industries.forEach(industry => {
            if(industry) {
                const option = document.createElement('option');
                option.value = industry;
                option.textContent = industry;
                industryFilter.appendChild(option);
            }
        });
    }

    // Define the SIC categories
    const SIC_CATEGORIES = {
        20: "Food & Kindred Products",
        21: "Tobacco Products",
        22: "Textile Mill Products",
        23: "Apparel & Other Finished Textile Products",
        24: "Lumber & Wood Products",
        25: "Furniture & Fixtures",
        26: "Paper & Allied Products",
        27: "Printing, Publishing & Allied Industries",
        28: "Chemicals & Allied Products",
        29: "Petroleum Refining & Related Products",
        30: "Rubber & Misc. Plastics Products",
        31: "Leather & Leather Products",
        32: "Stone, Clay, Glass & Concrete Products",
        33: "Primary Metal Industries",
        34: "Fabricated Metal Products",
        35: "Industrial & Commercial Machinery & Computer Equipment",
        36: "Electronic & Other Electrical Equipment",
        37: "Transportation Equipment",
        38: "Measuring, Medical, Photographic & Optical Instruments",
        39: "Miscellaneous Manufacturing Industries"
    };

    // Populate the Major Category filter
    function populateMajorCategoryFilter() {
        const majorCategoryFilter = document.getElementById('major-category-filter');
        Object.entries(SIC_CATEGORIES).forEach(([code, description]) => {
            const option = document.createElement('option');
            option.value = code; // Use the SIC code as the value
            option.textContent = `${code} - ${description}`;
            majorCategoryFilter.appendChild(option);
        });
    }

    // Update the filterAndDisplay function to filter by SIC categories and highway proximity
    function filterAndDisplay() {
        const nameQuery = document.getElementById('search-bar').value.toLowerCase();
        const industryQuery = document.getElementById('industry-filter').value;
        const employeeQuery = document.getElementById('employee-filter').value;
        const highwayOnly = document.getElementById('highway-filter').checked;
        const majorCategoryQuery = document.getElementById('major-category-filter').value;

        const filteredData = allData.filter(company => {
            const nameMatch = company.Company.toLowerCase().includes(nameQuery);
            const industryMatch = industryQuery === '' || company["Primary SIC Code Description"] === industryQuery;

            let employeeMatch = true;
            if (employeeQuery) {
                const employees = company.Employees;
                if (employeeQuery.includes('+')) {
                    const min = parseInt(employeeQuery.replace('+', ''), 10);
                    employeeMatch = employees >= min;
                } else {
                    const [min, max] = employeeQuery.split('-').map(Number);
                    employeeMatch = employees >= min && employees <= max;
                }
            }

            const highwayMatch = !highwayOnly || (company.distanceToHighway && company.distanceToHighway <= HIGHWAY_PROXIMITY_MILES);

            let majorCategoryMatch = true;
            if (majorCategoryQuery) {
                const sicCode = company["Primary SIC Code"];
                majorCategoryMatch = sicCode && String(sicCode).startsWith(majorCategoryQuery); // Ensure sicCode is a string
            }

            return nameMatch && industryMatch && employeeMatch && highwayMatch && majorCategoryMatch;
        });

        populateCards(filteredData);
        updateHeatmap(filteredData); // Update heatmap based on filtered data

        // Update the filtered company count
        const filteredCountElement = document.getElementById('filtered-company-count');
        if (filteredCountElement) {
            filteredCountElement.textContent = `Showing ${filteredData.length} companies`;
        }
    }

    document.getElementById('search-bar').addEventListener('input', filterAndDisplay);
    document.getElementById('industry-filter').addEventListener('change', filterAndDisplay);
    document.getElementById('employee-filter').addEventListener('change', filterAndDisplay);
    document.getElementById('highway-filter').addEventListener('change', filterAndDisplay);
    document.getElementById('major-category-filter').addEventListener('change', filterAndDisplay);

    // Call the populateMajorCategoryFilter function on page load
    populateMajorCategoryFilter();
});
