import geopandas as gpd
import pandas as pd
from shapely.geometry import Point
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

try:
    # Load company data (CSV or JSON)
    logging.info("Loading company data from 'industrymap.csv'...")
    company_data = pd.read_csv('industrymap.csv', encoding='ISO-8859-1')  # Specify encoding
    logging.info(f"Loaded {len(company_data)} rows of company data.")
except Exception as e:
    logging.error(f"Error loading company data: {e}")
    raise

try:
    # Ensure company data has Latitude and Longitude columns
    logging.info("Creating geometry column for company data...")
    company_data['geometry'] = company_data.apply(lambda row: Point(row['Longitude'], row['Latitude']), axis=1)
    company_gdf = gpd.GeoDataFrame(company_data, geometry='geometry', crs="EPSG:4326")
    logging.info("Geometry column created successfully.")
except KeyError as e:
    logging.error(f"Missing required column in company data: {e}")
    raise
except Exception as e:
    logging.error(f"Error processing company data: {e}")
    raise

try:
    # Load highway data (GeoJSON)
    logging.info("Loading highway data from 'highways.geojson'...")
    highway_gdf = gpd.read_file('highways.geojson')
    logging.info(f"Loaded {len(highway_gdf)} rows of highway data.")
except Exception as e:
    logging.error(f"Error loading highway data: {e}")
    raise

try:
    # Ensure both datasets are in the same CRS
    logging.info("Ensuring both datasets are in the same CRS...")
    company_gdf = company_gdf.to_crs(highway_gdf.crs)
    logging.info("CRS alignment successful.")
except Exception as e:
    logging.error(f"Error aligning CRS: {e}")
    raise

# Re-project both datasets to a projected CRS for accurate distance calculations
try:
    logging.info("Re-projecting geometries to a projected CRS for accurate distance calculations...")
    projected_crs = "EPSG:3857"  # Web Mercator projection
    company_gdf = company_gdf.to_crs(projected_crs)
    highway_gdf = highway_gdf.to_crs(projected_crs)
    logging.info("Re-projection to projected CRS successful.")
except Exception as e:
    logging.error(f"Error during re-projection: {e}")
    raise

# Validate geometries and remove invalid ones
try:
    logging.info("Validating geometries in company and highway datasets...")
    company_gdf = company_gdf[company_gdf.is_valid]
    highway_gdf = highway_gdf[highway_gdf.is_valid]
    logging.info(f"Valid geometries: {len(company_gdf)} companies, {len(highway_gdf)} highways.")
except Exception as e:
    logging.error(f"Error during geometry validation: {e}")
    raise

# Calculate proximity
def calculate_proximity(company, highways):
    try:
        logging.info(f"Processing company at index {company.name}...")
        if company.geometry.is_empty or company.geometry is None:
            logging.warning(f"Skipping company with invalid geometry at index {company.name}.")
            return pd.Series({'nearestHighway': None, 'distanceToHighway': None})
        
        # Calculate distances
        distances = highways.distance(company.geometry)
        nearest_highway_idx = distances.idxmin()
        distance_meters = distances.min()
        
        # Convert distance to miles
        distance_miles = distance_meters / 1609.34
        
        # Get highway name (default to 'Unnamed Highway' if missing)
        highway_name = highways.loc[nearest_highway_idx, 'name'] if 'name' in highways.columns else 'Unnamed Highway'
        
        return pd.Series({'nearestHighway': highway_name, 'distanceToHighway': distance_miles})
    except Exception as e:
        logging.error(f"Error calculating proximity for company at index {company.name}. Error: {e}")
        return pd.Series({'nearestHighway': None, 'distanceToHighway': None})

try:
    # Apply proximity calculation
    logging.info("Calculating proximity to highways...")
    company_gdf[['nearestHighway', 'distanceToHighway']] = company_gdf.apply(
        calculate_proximity, highways=highway_gdf, axis=1
    )
    logging.info("Proximity calculation completed.")
except Exception as e:
    logging.error(f"Error during proximity calculation: {e}")
    raise

try:
    # Save the results to a JSON file
    logging.info("Saving results to 'company_highway_proximity.json'...")
    company_gdf.drop(columns='geometry').to_json('company_highway_proximity.json', orient='records', indent=2)
    logging.info("Results saved successfully.")
except Exception as e:
    logging.error(f"Error saving results: {e}")
    raise

print("Proximity calculation complete. Results saved to 'company_highway_proximity.json'.")