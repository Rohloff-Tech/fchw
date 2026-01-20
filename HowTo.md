# Practice Performance Dashboard - User Guide

## Overview

This dashboard displays key performance metrics for your wellness practice. Data is loaded from an Excel workbook, making it easy to update without any coding knowledge.

## Quick Start

1. Open the **practice-dashboard-data.xlsx** file in Excel
2. Update your data in the sheets (see Data Entry Guide below)
3. Save the Excel file
4. Open **wellness-practice-dashboard.html** in a web browser
5. Click the upload area and select your Excel file
6. Your dashboard will display automatically

## Excel Workbook Structure

The Excel workbook contains four sheets:

### 1. Practice Config
Configure your practice's branding:

| Setting | Description | Example |
|---------|-------------|---------|
| Practice Name | Your practice's display name | Harmony Wellness |
| Logo Initials | 2-3 letter abbreviation (shown if no logo) | HW |
| Logo URL | Optional URL to your logo image | https://... |

### 2. Monthly Data
Enter one row per month. Include both current year and previous year data for year-over-year comparisons.

| Column | Description |
|--------|-------------|
| Month | Full month name (January, February, etc.) |
| Year | 4-digit year (2024, 2025) |
| Consultation Revenue | Total consultation/office visit revenue |
| Treatment Revenue | Total treatment/procedure revenue |
| Monthly Revenue Goal | Target revenue for the month |
| Insurance Receivables | Outstanding insurance A/R |
| Patient Receivables | Outstanding patient A/R |
| Active Patients | Number of active patients |
| New Patient Leads | New patient inquiries/leads |
| Scheduled From Leads | Leads that scheduled appointments |
| Total Appointments | Total appointments for the month |
| No Shows | Number of no-show appointments |
| No Show Goal | Target maximum no-shows |
| Cancellations | Number of cancelled appointments |
| Revenue Per Visit Goal | Target revenue per visit |
| Lead Conversion Goal | Target lead conversion percentage |

### 3. Provider Data
Enter provider performance for each month:

| Column | Description |
|--------|-------------|
| Month | Month name (must match Monthly Data) |
| Year | 4-digit year (must match Monthly Data) |
| Provider Name | Full name of provider |
| Role | Job title (Medical Director, Physician, NP, etc.) |
| Revenue | Provider's revenue for the month |
| Visits | Number of patient visits |
| Utilization | Utilization percentage (0-100) |

### 4. Instructions
Reference guide included in the workbook.

## Year-over-Year Comparisons

To see YoY comparison arrows and trend data:

1. Enter data for the **current year** (e.g., January 2025)
2. Enter data for the **same month in the previous year** (e.g., January 2024)
3. The dashboard will automatically calculate and display the percentage change

## Dashboard Features

### Month Selector
Use the dropdown in the header to view different months.

### Monthly/Yearly Toggle
- **Monthly**: Shows month-by-month data
- **Yearly**: Shows aggregated yearly data

### Revenue Trend Filters
Click the tabs to filter the trend chart:
- **All Revenue**: Combined consultation + treatment
- **Consult**: Consultation revenue only
- **Treatment**: Treatment revenue only

### Interactive Charts
Hover over chart elements to see detailed values with tooltips.

## Tips for Best Results

1. **Be Consistent**: Use the same provider names across all months
2. **Include History**: Add previous year data for meaningful comparisons
3. **Update Regularly**: Update weekly or monthly for accurate tracking
4. **Backup Your Data**: Keep a backup of your Excel file

## Displaying on a TV or Monitor

1. Open the dashboard in Chrome or Edge
2. Load your Excel file
3. Press **F11** for fullscreen mode
4. The dashboard will auto-scale to fit the screen

## Troubleshooting

**"Monthly Data sheet not found" error**
- Make sure your Excel file has a sheet named exactly "Monthly Data"

**No data appearing**
- Check that Month and Year columns have valid values
- Ensure month names are spelled correctly (January, not Jan)

**Previous year comparison not showing**
- Add data for the same month in the previous year
- Example: To see comparison for "May 2025", add data for "May 2024"

**Charts not displaying correctly**
- Refresh the page and re-upload the Excel file
- Make sure all numeric fields contain numbers (not text)

## File Structure

```
PracticeScorecard/
├── wellness-practice-dashboard.html  (Dashboard - open in browser)
├── practice-dashboard-data.xlsx      (Your data - edit in Excel)
└── HowTo.md                          (This guide)
```
