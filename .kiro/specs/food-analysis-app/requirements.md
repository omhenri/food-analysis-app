# Requirements Document

## Introduction

The Food Analysis Mobile App is a cross-platform application that allows users to input their daily meals, analyze the nutritional content and chemical substances in their food, and track their consumption patterns over time. The app provides AI-powered analysis to help users understand what they're eating and how it compares to recommended daily intake values for adults aged 18-29.

## Requirements

### Requirement 1

**User Story:** As a user, I want to input food items with meal type and portion size, so that I can track what I eat throughout the day.

#### Acceptance Criteria

1. WHEN the user opens the input screen THEN the system SHALL display a food name textbox with meal type and portion buttons
2. WHEN the user clicks the meal type button THEN the system SHALL display a dropdown menu with options: breakfast, lunch, dinner, snack
3. WHEN the user clicks the portion button THEN the system SHALL display portion options: 1/1, 1/2, 1/3, 1/4, 1/8
4. WHEN the user clicks the plus button THEN the system SHALL add another set of food input fields (textbox, meal type, portion)
5. WHEN the user enters food information THEN the system SHALL validate that food name is not empty

### Requirement 2

**User Story:** As a user, I want to analyze my food inputs using AI, so that I can understand the nutritional content and chemical substances in my meals.

#### Acceptance Criteria

1. WHEN the user clicks the analyze button THEN the system SHALL send all food data to AI for analysis
2. WHEN AI analysis is complete THEN the system SHALL display ingredients for each food item
3. WHEN AI analysis is complete THEN the system SHALL categorize chemical substances as good, bad, or neutral
4. WHEN displaying analysis results THEN the system SHALL show grams of chemical substances for each meal type
5. WHEN displaying results THEN the system SHALL organize data by meal type (breakfast, lunch, dinner, snack) in collapsible lists

### Requirement 3

**User Story:** As a user, I want to compare my consumption against recommended daily intake, so that I can make informed dietary decisions.

#### Acceptance Criteria

1. WHEN the user clicks the comparison button THEN the system SHALL analyze recommended absorption for adults aged 18-29
2. WHEN comparison analysis runs THEN the system SHALL calculate total daily consumption for each chemical substance
3. WHEN comparison is complete THEN the system SHALL display consumption vs recommended absorption comparison
4. WHEN displaying comparison THEN the system SHALL show data in grams for each chemical substance
5. IF consumption exceeds recommendations THEN the system SHALL highlight this information

### Requirement 4

**User Story:** As a user, I want my food data to be stored locally, so that I can access my meal history even when offline.

#### Acceptance Criteria

1. WHEN the user enters food data THEN the system SHALL store it in a local SQLite database
2. WHEN the user first opens the app THEN the system SHALL create a "Day 1" record
3. WHEN the user opens the app on subsequent days THEN the system SHALL increment the day counter
4. WHEN storing data THEN the system SHALL associate all entries with the current day number
5. WHEN the app is offline THEN the system SHALL still allow data storage and retrieval

### Requirement 5

**User Story:** As a user, I want to view my past meal records, so that I can track my eating patterns over time.

#### Acceptance Criteria

1. WHEN the user switches to the past records tab THEN the system SHALL display a list of previous days
2. WHEN the user selects a specific day THEN the system SHALL show all meals recorded for that day
3. WHEN viewing past records THEN the system SHALL allow scrolling through different days
4. WHEN displaying past data THEN the system SHALL show the same analysis information as the current day
5. WHEN no data exists for a day THEN the system SHALL display an appropriate empty state message

### Requirement 6

**User Story:** As a user, I want to generate weekly reports, so that I can understand my overall nutritional patterns across a week.

#### Acceptance Criteria

1. WHEN the user reaches Day 7 THEN the system SHALL enable the weekly report button
2. WHEN the user clicks weekly report THEN the system SHALL combine data from Days 1-7
3. WHEN generating weekly report THEN the system SHALL calculate total weekly consumption for each chemical substance
4. WHEN displaying weekly report THEN the system SHALL compare weekly consumption against weekly recommended intake
5. WHEN weekly report is complete THEN the system SHALL show the same format as daily comparison but with weekly totals

### Requirement 7

**User Story:** As a user, I want the app to work on both iOS and Android, so that I can use it regardless of my device platform.

#### Acceptance Criteria

1. WHEN the app is built THEN the system SHALL support both iOS and Android platforms
2. WHEN running on different platforms THEN the system SHALL maintain consistent functionality
3. WHEN using platform-specific features THEN the system SHALL gracefully handle platform differences
4. WHEN the UI is displayed THEN the system SHALL follow platform-appropriate design guidelines
5. WHEN data is stored THEN the system SHALL use the same database structure across platforms