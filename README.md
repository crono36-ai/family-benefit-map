# Family benefit geographic explorer

An interactive local map of DSS Family Tax Benefit Part A recipient counts by 2021 SA2, intended to help plan child dental outreach. It does not measure eligible children, dental need, CDBS uptake or unused benefits.

## Run

From this folder, start a local web server (Python 3):

```sh
python -m http.server 8000
```

Open http://localhost:8000. A network connection is needed for Leaflet, fonts and the OpenStreetMap basemap tiles. The standard OpenStreetMap tile service is community funded and subject to its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/); for substantial public deployment, use a suitable tile provider or host your own tiles. The preprocessed data is included; no Python packages are needed to run the app. Stop the server with Ctrl+C. Opening the HTML directly as a file will not reliably load the data.

To regenerate the data, install `openpyxl` (`python -m pip install openpyxl`), retain both original files in this folder, then run `python scripts/prepare.py`. The script reads the DBF and shapefile directly using Python's standard library and writes `data/sa2.geojson` and `data/join-report.json`. The output is a simplified planning map, not a survey-grade boundary dataset.

To regenerate facility data, retain `Schools.xlsx` and `NQS Data Q3 2026.XLSX` in this folder and run `python scripts/prepare_facilities.py` after preparing the SA2 data. This creates `data/facilities.json` and `data/facility-report.json`.

## School and education and care layers

The school source is the user-supplied Australian Schools List export, downloaded 25 November 2026. It includes schools marked Open with Type Primary or Combined; combined schools may also teach secondary years. The care source is ACECQA's National Quality Standard Data Q3 2026, as at 1 October 2026. All approved services are included where coordinates are usable, including long day care, preschool/kindergarten, outside-school-hours care and family day care. Service subtype is displayed. These snapshots can miss later openings, closures or changes; approval does not confirm a service is currently operating. Neither source establishes an exhaustive current list of all facilities or all physical family day care locations. Source: Australian Curriculum, Assessment and Reporting Authority (ACARA), Australian Schools List; Australian Children's Education and Care Quality Authority (ACECQA), NQS data. Refer to the respective source terms before redistribution or other use.

Coordinates are spatially joined against the original unsimplified SA2 polygons, using an even-odd point-in-polygon test. Points with missing, invalid, ambiguous or unmatched coordinates cannot appear in the ranking; usable unmatched coordinates can still appear on the map. The report records totals and exclusions. A point on a boundary, approximate coordinate or data error may lead to an incorrect or absent match; verify individual locations before use.

The two facility top-ten lists rank **the FTB Part A recipient count of the SA2 containing each facility**, descending, with ties broken alphabetically. Facilities in the same SA2 all inherit the same area count, and the ten-item cutoff can omit equally ranked facilities. This is an area-based outreach indicator, not a facility-level estimate. It does not measure eligible children, attendance, enrolments or catchments, and families may attend outside their home SA2. Facility markers appear when zoomed in; use the checkboxes to control each layer. The state filter applies to the facility lists and markers; the SA2 text search affects the area lists only.

## Methodology and limitations

The DSS workbook SA2 sheet is titled “Payment recipients by Statistical Area Level 2 (SA2) and payment type, September 2026”. It joins its `SA2` field, preserved as a string, to the shapefile's `SA2_CODE21`. The map displays the `Family Tax Benefit A` column: a **count of payment recipients**, not a count of children. DSS describes FTB as paid to the family. The extraction date for this payment is 25 September 2026. The workbook's glossary and extraction dates identify ASGS 2021, consistent with the provided 2021 GDA2020 boundary file. GDA2020 longitude and latitude are used directly for web display; small datum differences from WGS84 are immaterial at this map's scale. Boundaries and populations change over time.

The workbook reports rounded counts: nearest five, with values 1–7 rounded to 5; zero cells are actual zeros. Rounded figures may not add to reported totals. Missing, suppressed, and nonnumeric entries are retained as missing. The current source has no missing FTB A values among the 2,454 mapped SA2 rows. The fixed map classes are 0–499, 500–999, 1,000–1,999, 2,000–2,999, and 3,000 or more; grey denotes no value or an unmatched boundary.

All 2,454 geographic workbook rows matched map features; none were unmatched. The 2,473 boundary records include 19 records with no source match and no drawable geometry (special non-geographic categories). The source's Unknown row (80 rounded recipients) and Total row (1,226,145 rounded recipients) were excluded, avoiding double-counting and unlocated records. The complete machine-readable join report lists the codes and exclusions. A radial simplification of 0.0015 degrees and coordinate rounding reduce transfer size and can distort fine boundaries or remove very small islands. Use the original shapefile for precise analysis.

Families may have different numbers of children. A recipient count therefore cannot be converted directly to a child count. CDBS also requires Medicare eligibility, age 0–17 for at least one day of the relevant calendar year, and an eligible payment in that year. Other eligible payments apply, and a point-in-time FTB snapshot cannot establish annual eligibility. See [eligibility](https://www.servicesaustralia.gov.au/who-can-get-child-dental-benefits-schedule?context=22426) and [eligible payments](https://www.servicesaustralia.gov.au/eligible-payments-for-child-dental-benefits-schedule?context=22426).
