document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    let caseStudies = [];

    fetch('Case_studies.json')
        .then(response => response.json())
        .then(data => {
            caseStudies = data;
            displayResults(caseStudies);
        });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredStudies = caseStudies.filter(study => {
            return study.title.toLowerCase().includes(searchTerm) || study.Scenario.toLowerCase().includes(searchTerm);
        });
        displayResults(filteredStudies);
    });

    function displayResults(studies) {
        searchResults.innerHTML = '';
        if (studies.length === 0) {
            searchResults.innerHTML = '<p class="text-slate-500 col-span-full text-center">No case studies found.</p>';
            return;
        }

        studies.forEach(study => {
            const card = document.createElement('div');
            card.className = 'search-card';

            const title = document.createElement('h3');
            title.textContent = study.title;

            const scenario = document.createElement('p');
            scenario.textContent = study.Scenario;

            const link = document.createElement('a');
            link.href = study.link;
            link.textContent = 'Read More';

            card.appendChild(title);
            card.appendChild(scenario);
            card.appendChild(link);

            searchResults.appendChild(card);
        });
    }
});
