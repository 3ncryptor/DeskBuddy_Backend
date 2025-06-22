# Database Changes for Visitor Count Feature

## Required Supabase Table Changes

The `students` table needs to be updated to include visitor count tracking:

### Add New Columns

```sql
-- Add visitor count columns to students table
ALTER TABLE students 
ADD COLUMN visitorCount INTEGER DEFAULT 0,
ADD COLUMN visitorCountUpdatedAt TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN students.visitorCount IS 'Number of visitors/parents accompanying the student';
COMMENT ON COLUMN students.visitorCountUpdatedAt IS 'Timestamp when visitor count was last updated';
```

### Column Details

- **visitorCount**: INTEGER, DEFAULT 0
  - Stores the number of visitors/parents accompanying the student
  - Range: 0-10 (enforced by frontend validation)
  - Default: 0 (no visitors)

- **visitorCountUpdatedAt**: TIMESTAMP WITH TIME ZONE
  - Records when the visitor count was last updated
  - Used for audit trail and tracking

### Optional Index (for performance)

```sql
-- Add index for queries filtering by visitor count
CREATE INDEX idx_students_visitor_count ON students(visitorCount) WHERE visitorCount > 0;
```

## API Endpoints

### New Endpoint: Update Visitor Count

- **URL**: `POST /api/scan/arrival/visitors`
- **Body**: 
  ```json
  {
    "studentId": "string",
    "visitorCount": "number"
  }
  ```
- **Response**: 
  ```json
  {
    "message": "Visitor count updated successfully",
    "student": {
      // Updated student object
    }
  }
  ```

## Frontend Integration

The visitor count feature is integrated into the arrival scan flow:

1. Student QR code is scanned
2. Student info is displayed
3. Volunteer confirms arrival
4. Visitor count modal appears
5. Volunteer enters number of visitors
6. Lanyard preview is shown
7. Lanyards are printed

## Testing

To test the feature:

1. Ensure the database columns are added
2. Start the backend server
3. Start the frontend application
4. Scan a student QR code at arrival
5. Confirm arrival
6. Enter visitor count
7. Generate and print lanyards

## Notes

- Visitor count can only be set after arrival is confirmed
- Maximum 10 visitors per student (frontend validation)
- Lanyards are generated as A6 size (105mm × 148mm)
- Print service supports both PDF generation and direct printing 