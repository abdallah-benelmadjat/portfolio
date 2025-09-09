// Import the Turf.js library. Note: This path might need adjustment depending on your setup.
// In a simple setup, you might need to download turf.min.js and place it in your project folder.
// For now, we'll assume it can be imported. If not, we'll adjust.
importScripts('https://unpkg.com/@turf/turf@6/turf.min.js');

self.onmessage = function(e) {
    let { companyData, highwayData, proximityKm } = e.data;

    if (!highwayData || !highwayData.features || !companyData) {
        self.postMessage(companyData);
        return;
    }

    // Enforce a maximum distance limit (e.g., 10 kilometers)
    const MAX_DISTANCE_KM = 10;
    proximityKm = Math.min(proximityKm, MAX_DISTANCE_KM);

    const updatedCompanyData = companyData.map(company => {
        let isNearHighway = false;
        if (company.Latitude && company.Longitude) {
            const companyPoint = turf.point([company.Longitude, company.Latitude]);
            for (const highway of highwayData.features) {
                if (highway.geometry && highway.geometry.type && highway.geometry.coordinates) {
                    const distance = turf.pointToLineDistance(companyPoint, highway, { units: 'kilometers' });
                    if (distance <= proximityKm) {
                        isNearHighway = true;
                        break;
                    }
                }
            }
        }
        return { ...company, isNearHighway };
    });

    self.postMessage(updatedCompanyData);
};