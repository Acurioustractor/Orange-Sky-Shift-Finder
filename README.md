# Orange Sky Shift Map Scraper

A Node.js-based scraper for Orange Sky Australia's service locations and shift schedules using their text-based URL endpoints. This approach provides efficient data collection without requiring browser automation.

## Features

- Systematically discovers Orange Sky service locations across Australia
- Extracts shift schedules including times, locations, and service types
- Validates data using Zod schema
- Outputs structured JSON data

## Installation

```bash
npm install
```

## Usage

Run the scraper:

```bash
node scraper.js
```

This will:
1. Generate and test potential location URLs
2. Extract shift data from discovered locations
3. Save validated results to `orange_sky_shifts.json`

## Output Format

The scraper generates a JSON file containing an array of shift objects with the following structure:

```json
{
  "service_name": "Brisbane CBD Laundry & Shower",
  "suburb": "Brisbane",
  "state": "QLD",
  "address": "123 Example St",
  "lat": -27.4698,
  "lng": 153.0251,
  "day": "Mon",
  "start_time": "18:00",
  "end_time": "20:00"
}
```

## Development

The scraper uses a text-based URL approach that accesses Orange Sky's `/list/{location_slug}` endpoints directly. This method is more efficient than browser automation as it:

- Eliminates the need for JavaScript rendering
- Reduces bandwidth usage
- Provides faster data collection
- Maintains reliability with simpler dependencies